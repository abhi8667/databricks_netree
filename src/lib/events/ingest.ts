import "server-only";
import { unstable_rethrow } from "next/navigation";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { ConformedEvent, EventSpeaker, EventsFeedPayload } from "@/lib/event-types";
import { execute, query } from "@/lib/databricks/sql";
import { dbx, hasWarehouse } from "@/lib/env";
import { mirrorPath } from "@/lib/store/local-dir";
import { referenceData } from "@/lib/store/reference";

const BTW_URL = "https://bengalurutechweek.com/config/events.json";
const HACKCULTURE_BASE_URL = "https://api.hackculture.io/api/v1/hackathons";

const SNAPSHOT_FILE = "events_snapshot.json";

type CachedSnapshot = {
  version: number;
  fetched_at: string;
  btw_updated_at: string | null;
  hackculture_updated_at: string | null;
  events: ConformedEvent[];
};

function computeHash(val: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(val)).digest("hex");
}

/* -------------------------------------------------------------------------- */
/*                                Upstream Fetch                              */
/* -------------------------------------------------------------------------- */

export async function fetchBTW(): Promise<{
  events: ConformedEvent[];
  updatedAt: string;
  hash: string;
}> {
  const res = await fetch(BTW_URL, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json", "User-Agent": "Netree/1.0 (Campus Research)" },
  });

  if (!res.ok) {
    throw new Error(`BTW fetch failed: HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // SCHEMA GUARD
  if (!data || typeof data !== "object" || !Array.isArray(data.events)) {
    throw new Error("BTW Schema Guard failed: 'events' array missing or corrupted");
  }

  const rawEvents = data.events as Array<Record<string, unknown>>;
  const rawSpeakers = (Array.isArray(data.speakers) ? data.speakers : []) as Array<
    Record<string, unknown>
  >;

  // Validate critical event fields
  for (let i = 0; i < rawEvents.length; i++) {
    const ev = rawEvents[i];
    if (!ev || typeof ev !== "object" || !ev.slug || !ev.title || !ev.date) {
      throw new Error(
        `BTW Schema Guard failed at item ${i}: missing slug/title/date: ${JSON.stringify(ev)}`,
      );
    }
  }

  const reference = await referenceData().catch((err) => {
    unstable_rethrow(err);
    return null;
  });
  const facultyNames = new Map<string, string>();
  if (reference?.faculty) {
    for (const f of reference.faculty) {
      facultyNames.set(f.faculty_name.toLowerCase().trim(), f.faculty_id);
    }
  }

  const speakerMap = new Map<string, EventSpeaker>();
  for (const sp of rawSpeakers) {
    if (!sp || typeof sp.id !== "string") continue;
    const name = String(sp.fullName || sp.id).trim();
    const matchedFacultyId = facultyNames.get(name.toLowerCase()) || null;

    speakerMap.set(sp.id, {
      id: sp.id,
      event_external_id: "",
      display_name: name,
      designation: String(sp.designation || ""),
      company: String(sp.companyName || ""),
      linkedin_url: typeof sp.href === "string" ? sp.href : null,
      square_picture_url: typeof sp.squarePictureUrl === "string" ? sp.squarePictureUrl : null,
      faculty_id: matchedFacultyId,
      featured: sp.featured === "yes",
    });
  }

  const now = new Date().toISOString();
  const conformed: ConformedEvent[] = rawEvents.map((ev) => {
    const slug = String(ev.slug);
    const title = String(ev.title);
    const dateStr = String(ev.date);
    const startTime = typeof ev.startTime === "string" ? ev.startTime : "09:00";
    const endTime = typeof ev.endTime === "string" ? ev.endTime : null;

    const startIso = `${dateStr}T${startTime}:00Z`;
    const endIso = endTime ? `${dateStr}T${endTime}:00Z` : null;

    const formatLower = String(ev.format || "talk").toLowerCase();
    let kind: ConformedEvent["kind"] = "talk";
    if (formatLower.includes("hack") || slug.toLowerCase().includes("hack")) kind = "hackathon";
    else if (formatLower.includes("workshop")) kind = "workshop";
    else if (formatLower.includes("mixer")) kind = "mixer";
    else if (formatLower.includes("meetup")) kind = "meetup";
    else if (formatLower.includes("roundtable")) kind = "roundtable";
    else if (formatLower.includes("panel")) kind = "panel";
    else if (formatLower.includes("ceremony")) kind = "ceremony";

    const area = String(ev.area || "Bengaluru");
    const venue = String(ev.venue || area);
    const isOnline =
      area.toLowerCase().includes("online") || venue.toLowerCase().includes("zoom");

    const speakerIds = Array.isArray(ev.speakerIds) ? (ev.speakerIds as string[]) : [];
    const speakers = speakerIds
      .map((id) => speakerMap.get(id))
      .filter((s): s is EventSpeaker => Boolean(s))
      .map((s) => ({ ...s, event_external_id: slug }));

    const track = String(ev.track || "General");
    const tags = [track, String(ev.format || "Event"), "BTW2026"].filter(Boolean);

    return {
      event_id: `btw_${slug}`,
      source: "btw",
      external_id: slug,
      kind,
      title,
      tagline: track,
      description: String(ev.description || ""),
      start_at: startIso,
      end_at: endIso,
      venue,
      area,
      track,
      mode: isOnline ? "online" : "offline",
      registration_open: ev.registrationEnabled !== false,
      registration_url:
        (typeof ev.lumaUrl === "string" && ev.lumaUrl) ||
        (typeof ev.href === "string" && ev.href) ||
        `https://bengalurutechweek.com/events/${slug}`,
      min_team_size: 1,
      max_team_size: 1,
      eligibility_text: "Open to all technologists, founders, researchers, and students.",
      cover_image_url: typeof ev.lumaBannerUrl === "string" ? ev.lumaBannerUrl : null,
      organizer_name: String(ev.host || "Bengaluru Tech Week"),
      tags,
      speakers,
      payload_hash: computeHash(ev),
      source_updated_at: now,
    };
  });

  return {
    events: conformed,
    updatedAt: now,
    hash: computeHash(conformed),
  };
}

export async function fetchHackCulture(): Promise<{
  events: ConformedEvent[];
  updatedAt: string;
  hash: string;
}> {
  const limit = 50; // API constraint: limit <= 50
  let skip = 0;
  const rawItems: Array<Record<string, unknown>> = [];

  while (true) {
    const url = `${HACKCULTURE_BASE_URL}?limit=${limit}&skip=${skip}&response_type=card&sort_by=start_datetime&sort_order=-1`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json", "User-Agent": "Netree/1.0 (Campus Research)" },
    });

    if (!res.ok) {
      throw new Error(`HackCulture fetch failed at skip=${skip}: HTTP ${res.status}`);
    }

    const page = await res.json();

    // SCHEMA GUARD
    if (!Array.isArray(page)) {
      throw new Error(`HackCulture Schema Guard failed: expected array, got ${typeof page}`);
    }

    if (page.length === 0) break;

    for (let i = 0; i < page.length; i++) {
      const item = page[i];
      if (
        !item ||
        typeof item !== "object" ||
        !item._id ||
        !item.name ||
        !item.start_datetime ||
        !item.mode
      ) {
        throw new Error(
          `HackCulture Schema Guard failed at skip=${skip} idx=${i}: missing _id/name/start_datetime/mode`,
        );
      }
    }

    rawItems.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }

  const now = new Date().toISOString();
  const conformed: ConformedEvent[] = rawItems.map((hc) => {
    const extId = String(hc._id);
    const slug = typeof hc.slug === "string" && hc.slug ? hc.slug : extId;
    const name = String(hc.name);
    const elig = (hc.eligibility || {}) as Record<string, unknown>;
    const branding = (hc.branding || {}) as Record<string, unknown>;
    const loc = (hc.location || {}) as Record<string, unknown>;

    const tags: string[] = [];
    if (Array.isArray(hc.tags)) {
      for (const t of hc.tags as Array<{ name?: string }>) {
        if (t?.name) tags.push(t.name);
      }
    }
    if (typeof hc.industry === "string" && hc.industry) {
      tags.push(hc.industry);
    }

    const modeStr = String(hc.mode || "offline").toLowerCase();
    const mode: ConformedEvent["mode"] =
      modeStr === "online" ? "online" : modeStr === "hybrid" ? "hybrid" : "offline";

    return {
      event_id: `hc_${extId}`,
      source: "hackculture",
      external_id: extId,
      kind: "hackathon",
      title: name,
      tagline: String(hc.tagline || ""),
      description: String(elig.details || hc.tagline || ""),
      start_at: String(hc.start_datetime),
      end_at: typeof hc.end_datetime === "string" ? hc.end_datetime : null,
      venue: String(loc.name || (mode === "online" ? "Online / Remote" : "TBD")),
      area: String(loc.address || loc.name || mode),
      track: typeof hc.industry === "string" ? hc.industry : "Technology",
      mode,
      registration_open: Boolean(hc.is_registration_open),
      registration_url:
        (typeof hc.external_registration_url === "string" && hc.external_registration_url) ||
        `https://hackculture.io/hackathons/${slug}`,
      min_team_size: typeof hc.min_team_size === "number" ? hc.min_team_size : 1,
      max_team_size: typeof hc.max_team_size === "number" ? hc.max_team_size : 4,
      eligibility_text: String(elig.details || "Open to all students and builders."),
      cover_image_url:
        (typeof branding.cover_photo === "string" && branding.cover_photo) ||
        (typeof branding.logo === "string" && branding.logo) ||
        null,
      organizer_name: String(hc.organizer_name || "HackCulture"),
      tags,
      speakers: [],
      payload_hash: computeHash(hc),
      source_updated_at: String(hc.updated_at || now),
    };
  });

  return {
    events: conformed,
    updatedAt: now,
    hash: computeHash(conformed),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Lakehouse Upsert                             */
/* -------------------------------------------------------------------------- */

export async function syncEventsToDatabricks(events: ConformedEvent[]): Promise<void> {
  if (!hasWarehouse()) return;

  const SILVER = `${dbx.catalog}.${dbx.schemaSilver}`;
  const now = new Date().toISOString();

  for (const ev of events) {
    // 1. Raw audit append
    await execute(
      `INSERT INTO ${dbx.catalog}.${dbx.schemaRaw}.events_raw (source, external_id, fetched_at, raw_json, payload_hash)
       VALUES (:source, :ext_id, :fetched_at, :raw_json, :hash)`,
      [
        { name: "source", value: ev.source },
        { name: "ext_id", value: ev.external_id },
        { name: "fetched_at", value: now },
        { name: "raw_json", value: JSON.stringify(ev) },
        { name: "hash", value: ev.payload_hash },
      ],
    ).catch((err) => {
      unstable_rethrow(err);
      console.warn("[netree-ingest] Raw table insert skipped:", err);
    });

    // 2. Silver idempotent upsert
    await execute(
      `MERGE INTO ${SILVER}.events AS target
       USING (SELECT :event_id AS event_id, :source AS source, :external_id AS external_id, :kind AS kind,
                     :title AS title, :tagline AS tagline, :description AS description, :start_at AS start_at,
                     :end_at AS end_at, :venue AS venue, :area AS area, :track AS track, :mode AS mode,
                     :reg_open AS registration_open, :reg_url AS registration_url, :min_team AS min_team_size,
                     :max_team AS max_team_size, :eligibility AS eligibility_text, :cover AS cover_image_url,
                     :organizer AS organizer_name, :tags AS tags, :hash AS payload_hash, :updated_at AS updated_at) AS src
       ON target.source = src.source AND target.external_id = src.external_id
       WHEN MATCHED THEN UPDATE SET *
       WHEN NOT MATCHED THEN INSERT *`,
      [
        { name: "event_id", value: ev.event_id },
        { name: "source", value: ev.source },
        { name: "external_id", value: ev.external_id },
        { name: "kind", value: ev.kind },
        { name: "title", value: ev.title },
        { name: "tagline", value: ev.tagline },
        { name: "description", value: ev.description },
        { name: "start_at", value: ev.start_at },
        { name: "end_at", value: ev.end_at ?? "" },
        { name: "venue", value: ev.venue },
        { name: "area", value: ev.area },
        { name: "track", value: ev.track },
        { name: "mode", value: ev.mode },
        { name: "reg_open", value: ev.registration_open ? "true" : "false" },
        { name: "reg_url", value: ev.registration_url },
        { name: "min_team", value: String(ev.min_team_size ?? 1) },
        { name: "max_team", value: String(ev.max_team_size ?? 1) },
        { name: "eligibility", value: ev.eligibility_text },
        { name: "cover", value: ev.cover_image_url ?? "" },
        { name: "organizer", value: ev.organizer_name },
        { name: "tags", value: JSON.stringify(ev.tags) },
        { name: "hash", value: ev.payload_hash },
        { name: "updated_at", value: now },
      ],
    ).catch((err) => {
      unstable_rethrow(err);
      console.warn("[netree-ingest] Silver events upsert error:", err);
    });

    // 3. Speakers
    for (const sp of ev.speakers) {
      await execute(
        `MERGE INTO ${SILVER}.event_speakers AS target
         USING (SELECT :id AS id, :event_ext_id AS event_external_id, :faculty_id AS faculty_id,
                       :name AS display_name, :designation AS designation, :company AS company,
                       :linkedin AS linkedin_url, :avatar AS square_picture_url, :featured AS featured) AS src
         ON target.id = src.id AND target.event_external_id = src.event_external_id
         WHEN MATCHED THEN UPDATE SET *
         WHEN NOT MATCHED THEN INSERT *`,
        [
          { name: "id", value: sp.id },
          { name: "event_ext_id", value: ev.external_id },
          { name: "faculty_id", value: sp.faculty_id ?? "" },
          { name: "name", value: sp.display_name },
          { name: "designation", value: sp.designation },
          { name: "company", value: sp.company },
          { name: "linkedin", value: sp.linkedin_url ?? "" },
          { name: "avatar", value: sp.square_picture_url ?? "" },
          { name: "featured", value: sp.featured ? "true" : "false" },
        ],
      ).catch((err) => {
        unstable_rethrow(err);
        console.warn("[netree-ingest] Silver speaker upsert error:", err);
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                               Local Snapshot Cache                         */
/* -------------------------------------------------------------------------- */

/**
 * The snapshot lives in memory for the life of the process and on disk for the
 * life of the machine. On a read-only host the disk half may be unavailable —
 * `mirrorDir` falls back to the temp directory, and if even that fails the
 * memory copy still spares every request a full round of upstream fetches.
 */
let memorySnapshot: CachedSnapshot | null = null;
let warnedAboutDisk = false;

export async function readLocalSnapshot(): Promise<CachedSnapshot | null> {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = await fs.readFile(mirrorPath(SNAPSHOT_FILE), "utf-8");
    memorySnapshot = JSON.parse(raw) as CachedSnapshot;
    return memorySnapshot;
  } catch {
    return null;
  }
}

export async function writeLocalSnapshot(snapshot: CachedSnapshot): Promise<void> {
  memorySnapshot = snapshot;
  try {
    await fs.writeFile(mirrorPath(SNAPSHOT_FILE), JSON.stringify(snapshot, null, 2), "utf-8");
  } catch (err) {
    if (!warnedAboutDisk) {
      warnedAboutDisk = true;
      console.warn(
        "[netree-ingest] Local events snapshot is memory-only (read-only filesystem):",
        err,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                         Master Ingest & Fallback Load                      */
/* -------------------------------------------------------------------------- */

export async function runEventsIngest(): Promise<{
  count: number;
  btwCount: number;
  hackcultureCount: number;
  isStale: boolean;
}> {
  const existing = await readLocalSnapshot();
  const existingByExtId = new Map(existing?.events.map((e) => [e.external_id, e]) || []);

  let btwResult: { events: ConformedEvent[]; updatedAt: string } | null = null;
  let hcResult: { events: ConformedEvent[]; updatedAt: string } | null = null;

  try {
    btwResult = await fetchBTW();
    console.log(`[netree-ingest] BTW Schema Guard PASSED: ${btwResult.events.length} events`);
  } catch (err) {
    unstable_rethrow(err);
    console.error("[netree-ingest] BTW fetch failed / guard rejected:", err);
  }

  try {
    hcResult = await fetchHackCulture();
    console.log(
      `[netree-ingest] HackCulture Schema Guard PASSED: ${hcResult.events.length} hackathons`,
    );
  } catch (err) {
    unstable_rethrow(err);
    console.error("[netree-ingest] HackCulture fetch failed / guard rejected:", err);
  }

  // If both failed, keep existing snapshot intact
  if (!btwResult && !hcResult) {
    if (!existing) {
      throw new Error(
        "Both upstreams failed and no local snapshot exists to serve fallback data.",
      );
    }
    console.warn("[netree-ingest] Serving stale cached snapshot due to total upstream outage.");
    return {
      count: existing.events.length,
      btwCount: existing.events.filter((e) => e.source === "btw").length,
      hackcultureCount: existing.events.filter((e) => e.source === "hackculture").length,
      isStale: true,
    };
  }

  const mergedEventsMap = new Map<string, ConformedEvent>();

  // Preserve existing events first
  for (const [extId, ev] of existingByExtId) {
    mergedEventsMap.set(extId, ev);
  }

  // Overwrite with fresh BTW events if successful
  if (btwResult) {
    for (const ev of btwResult.events) {
      mergedEventsMap.set(ev.external_id, ev);
    }
  }

  // Overwrite with fresh HackCulture hackathons if successful
  if (hcResult) {
    for (const ev of hcResult.events) {
      mergedEventsMap.set(ev.external_id, ev);
    }
  }

  const mergedEvents = Array.from(mergedEventsMap.values());
  const now = new Date().toISOString();

  const newSnapshot: CachedSnapshot = {
    version: 1,
    fetched_at: now,
    btw_updated_at: btwResult ? btwResult.updatedAt : (existing?.btw_updated_at ?? null),
    hackculture_updated_at: hcResult
      ? hcResult.updatedAt
      : (existing?.hackculture_updated_at ?? null),
    events: mergedEvents,
  };

  await writeLocalSnapshot(newSnapshot);
  await syncEventsToDatabricks(mergedEvents).catch((err) => {
    unstable_rethrow(err);
    console.warn("[netree-ingest] Databricks sync error:", err);
  });

  return {
    count: mergedEvents.length,
    btwCount: mergedEvents.filter((e) => e.source === "btw").length,
    hackcultureCount: mergedEvents.filter((e) => e.source === "hackculture").length,
    isStale: !btwResult || !hcResult,
  };
}

/** Concurrent callers share one auto-ingest instead of each starting their own. */
let inFlightIngest: Promise<unknown> | null = null;

export async function getConformedEvents(): Promise<{
  events: ConformedEvent[];
  btwUpdatedAt: string | null;
  hackcultureUpdatedAt: string | null;
  isStale: boolean;
}> {
  let snapshot = await readLocalSnapshot();

  // If local snapshot is missing, run auto-ingest
  if (!snapshot || !snapshot.events.length) {
    try {
      inFlightIngest ??= runEventsIngest().finally(() => {
        inFlightIngest = null;
      });
      await inFlightIngest;
      snapshot = await readLocalSnapshot();
    } catch (err) {
      unstable_rethrow(err);
      console.error("[netree-ingest] Initial ingest failed:", err);
    }
  }

  if (snapshot && snapshot.events.length) {
    return {
      events: snapshot.events,
      btwUpdatedAt: snapshot.btw_updated_at,
      hackcultureUpdatedAt: snapshot.hackculture_updated_at,
      isStale: false,
    };
  }

  return {
    events: [],
    btwUpdatedAt: null,
    hackcultureUpdatedAt: null,
    isStale: true,
  };
}
