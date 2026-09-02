# Databricks notebook source
# COMMAND ----------
"""
Platform Ingestion Workflow: Events & Hackathons
Daily schedule; hourly during Bengaluru Tech Week (BTW).

Sources:
1. Bengaluru Tech Week (BTW):
   GET https://bengalurutechweek.com/config/events.json
2. HackCulture:
   GET https://api.hackculture.io/api/v1/hackathons?limit=50&response_type=card&sort_by=start_datetime&sort_order=-1
   (Note: HackCulture enforces limit <= 50; paginated with skip=N)

Lakehouse Tiers:
- netree.raw.events_raw (source, external_id, fetched_at, raw_json, payload_hash)
- netree.silver.events (conformed events & hackathons)
- netree.silver.event_speakers (speaker details joined with netree.silver.dim_faculty)
- netree.gold.events_upcoming (view/table: start_at >= current_timestamp())
"""

import hashlib
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import requests

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("events_ingest")

BTW_URL = "https://bengalurutechweek.com/config/events.json"
HACKCULTURE_BASE_URL = "https://api.hackculture.io/api/v1/hackathons"

# Spark session resolution (handles both Databricks cluster and standalone execution)
try:
    from pyspark.sql import SparkSession
    spark = SparkSession.builder.getOrCreate()
except ImportError:
    spark = None

# COMMAND ----------

def compute_hash(payload: Any) -> str:
    """Computes SHA-256 hash of a serialized payload to detect changes."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def fetch_btw_events() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]:
    """
    Fetches Bengaluru Tech Week events and speaker directory.
    Enforces SCHEMA GUARD: validates presence of events array and core fields.
    """
    logger.info("Fetching Bengaluru Tech Week feed: %s", BTW_URL)
    resp = requests.get(BTW_URL, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    # SCHEMA GUARD
    if not isinstance(data, dict):
        raise ValueError("BTW feed schema guard failed: root is not a JSON object")
    if "events" not in data or not isinstance(data["events"], list):
        raise ValueError("BTW feed schema guard failed: missing 'events' list")

    events = data["events"]
    speakers = data.get("speakers", [])

    for idx, ev in enumerate(events):
        if not isinstance(ev, dict):
            raise ValueError(f"BTW event at index {idx} is not an object")
        if not ev.get("slug") or not ev.get("title") or not ev.get("date"):
            raise ValueError(f"BTW event at index {idx} missing essential fields (slug, title, date): {ev}")

    logger.info("BTW Schema Guard passed: %d events, %d speakers", len(events), len(speakers))
    return events, speakers, compute_hash(data)


def fetch_hackculture_hackathons() -> Tuple[List[Dict[str, Any]], str]:
    """
    Fetches HackCulture hackathons with pagination.
    Note: HackCulture restricts limit <= 50; paginates with skip=N.
    Enforces SCHEMA GUARD: validates each hackathon item contains _id, name, start_datetime, mode.
    """
    all_hackathons: List[Dict[str, Any]] = []
    limit = 50
    skip = 0

    while True:
        url = f"{HACKCULTURE_BASE_URL}?limit={limit}&skip={skip}&response_type=card&sort_by=start_datetime&sort_order=-1"
        logger.info("Fetching HackCulture page (skip=%d): %s", skip, url)
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        page = resp.json()

        if not isinstance(page, list):
            raise ValueError(f"HackCulture schema guard failed: expected array, got {type(page)}")

        if not page:
            break

        for idx, item in enumerate(page):
            if not isinstance(item, dict):
                raise ValueError(f"HackCulture item at skip {skip} idx {idx} is not an object")
            if not item.get("_id") or not item.get("name") or not item.get("start_datetime") or not item.get("mode"):
                raise ValueError(f"HackCulture item missing essential fields (_id, name, start_datetime, mode): {item.get('_id')}")

        all_hackathons.extend(page)
        if len(page) < limit:
            break
        skip += limit

    logger.info("HackCulture Schema Guard passed: %d hackathons retrieved", len(all_hackathons))
    return all_hackathons, compute_hash(all_hackathons)

# COMMAND ----------

def conform_btw_event(ev: Dict[str, Any], speaker_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Conforms a BTW event into the conformed silver.events schema."""
    slug = ev["slug"]
    title = ev["title"]
    date_str = ev["date"]
    start_time = ev.get("startTime", "09:00")
    end_time = ev.get("endTime")

    start_iso = f"{date_str}T{start_time}:00Z"
    end_iso = f"{date_str}T{end_time}:00Z" if end_time else None

    # Map format to conformed kind
    format_lower = (ev.get("format") or "talk").lower()
    if "hackathon" in format_lower or "hack" in slug.lower():
        kind = "hackathon"
    elif "workshop" in format_lower:
        kind = "workshop"
    elif "mixer" in format_lower:
        kind = "mixer"
    elif "meetup" in format_lower:
        kind = "meetup"
    elif "roundtable" in format_lower:
        kind = "roundtable"
    elif "panel" in format_lower:
        kind = "panel"
    elif "ceremony" in format_lower:
        kind = "ceremony"
    else:
        kind = "talk"

    area = ev.get("area", "")
    mode = "online" if "online" in area.lower() or "zoom" in (ev.get("venue") or "").lower() else "offline"

    # Assemble speaker list
    event_speakers = []
    for sp_id in ev.get("speakerIds", []):
        sp = speaker_map.get(sp_id)
        if sp:
            event_speakers.append({
                "id": sp["id"],
                "display_name": sp.get("fullName", sp["id"]),
                "designation": sp.get("designation", ""),
                "company": sp.get("companyName", ""),
                "linkedin_url": sp.get("href"),
                "square_picture_url": sp.get("squarePictureUrl"),
                "featured": sp.get("featured") == "yes"
            })

    return {
        "event_id": f"btw_{slug}",
        "source": "btw",
        "external_id": slug,
        "kind": kind,
        "title": title,
        "tagline": ev.get("track", ""),
        "description": ev.get("description", ""),
        "start_at": start_iso,
        "end_at": end_iso,
        "venue": ev.get("venue") or area or "Bengaluru",
        "area": area,
        "track": ev.get("track", "General"),
        "mode": mode,
        "registration_open": ev.get("registrationEnabled", True),
        "registration_url": ev.get("lumaUrl") or ev.get("href") or f"https://bengalurutechweek.com/events/{slug}",
        "min_team_size": 1,
        "max_team_size": 1,
        "eligibility_text": "Open to all technologists, founders, and students.",
        "cover_image_url": ev.get("lumaBannerUrl"),
        "organizer_name": ev.get("host") or "Bengaluru Tech Week",
        "tags": [ev.get("track"), ev.get("format"), "BTW2026"],
        "speakers": event_speakers,
        "source_updated_at": datetime.now(timezone.utc).isoformat()
    }


def conform_hackculture_hackathon(hc: Dict[str, Any]) -> Dict[str, Any]:
    """Conforms a HackCulture record into the conformed silver.events schema."""
    ext_id = hc["_id"]
    slug = hc.get("slug", ext_id)
    elig = hc.get("eligibility", {})
    branding = hc.get("branding", {})
    loc = hc.get("location", {})

    tags = [t.get("name") for t in hc.get("tags", []) if isinstance(t, dict) and t.get("name")]
    if hc.get("industry"):
        tags.append(hc["industry"])

    return {
        "event_id": f"hc_{ext_id}",
        "source": "hackculture",
        "external_id": ext_id,
        "kind": "hackathon",
        "title": hc["name"],
        "tagline": hc.get("tagline", ""),
        "description": elig.get("details") or hc.get("tagline") or "",
        "start_at": hc["start_datetime"],
        "end_at": hc.get("end_datetime"),
        "venue": loc.get("name") or "Online / TBD",
        "area": loc.get("address") or loc.get("name") or hc.get("mode", "Online"),
        "track": hc.get("industry") or "Technology",
        "mode": hc.get("mode", "offline").lower(),
        "registration_open": hc.get("is_registration_open", False),
        "registration_url": hc.get("external_registration_url") or f"https://hackculture.io/hackathons/{slug}",
        "min_team_size": hc.get("min_team_size", 1),
        "max_team_size": hc.get("max_team_size", 4),
        "eligibility_text": elig.get("details", "Open to students and builders."),
        "cover_image_url": branding.get("cover_photo") or branding.get("logo"),
        "organizer_name": hc.get("organizer_name", "HackCulture"),
        "tags": tags,
        "speakers": [],
        "source_updated_at": hc.get("updated_at") or datetime.now(timezone.utc).isoformat()
    }

# COMMAND ----------

def run_ingest():
    """Main ingestion coordinator with resilient fallbacks and idempotent Delta upserts."""
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Fetch & Guard BTW
    btw_events = []
    btw_speakers = []
    btw_hash = ""
    try:
        btw_events, btw_speakers, btw_hash = fetch_btw_events()
    except Exception as e:
        logger.error("Failed to fetch or guard BTW feed: %s. Preserving existing data.", e)

    # 2. Fetch & Guard HackCulture
    hc_hackathons = []
    hc_hash = ""
    try:
        hc_hackathons, hc_hash = fetch_hackculture_hackathons()
    except Exception as e:
        logger.error("Failed to fetch or guard HackCulture feed: %s. Preserving existing data.", e)

    if not btw_events and not hc_hackathons:
        logger.warning("Both upstream sources failed or were rejected by schema guard. Exiting without overwriting snapshots.")
        return

    # 3. Conformance
    speaker_map = {sp["id"]: sp for sp in btw_speakers if "id" in sp}
    conformed_items = []

    for ev in btw_events:
        conformed_items.append(conform_btw_event(ev, speaker_map))

    for hc in hc_hackathons:
        conformed_items.append(conform_hackculture_hackathon(hc))

    logger.info("Successfully conformed %d events & hackathons", len(conformed_items))

    # 4. Upsert into Delta Lake if running on Databricks
    if spark is not None:
        logger.info("Writing conformed events into Unity Catalog Delta tables...")
        # Write to silver.events via MERGE INTO
        df = spark.createDataFrame([
            {
                "event_id": item["event_id"],
                "source": item["source"],
                "external_id": item["external_id"],
                "kind": item["kind"],
                "title": item["title"],
                "tagline": item["tagline"],
                "description": item["description"],
                "start_at": item["start_at"],
                "end_at": item["end_at"],
                "venue": item["venue"],
                "area": item["area"],
                "track": item["track"],
                "mode": item["mode"],
                "registration_open": item["registration_open"],
                "registration_url": item["registration_url"],
                "min_team_size": item["min_team_size"],
                "max_team_size": item["max_team_size"],
                "eligibility_text": item["eligibility_text"],
                "cover_image_url": item["cover_image_url"],
                "organizer_name": item["organizer_name"],
                "tags_json": json.dumps(item["tags"]),
                "speakers_json": json.dumps(item["speakers"]),
                "updated_at": now_iso
            }
            for item in conformed_items
        ])

        df.createOrReplaceTempView("staged_events")
        spark.sql("""
            MERGE INTO netree.silver.events AS target
            USING staged_events AS source
            ON target.source = source.source AND target.external_id = source.external_id
            WHEN MATCHED THEN UPDATE SET *
            WHEN NOT MATCHED THEN INSERT *
        """)
        logger.info("Delta MERGE INTO netree.silver.events completed.")
    else:
        logger.info("Spark session not detected. Run standalone Node script for local mirror.")


if __name__ == "__main__":
    run_ingest()
