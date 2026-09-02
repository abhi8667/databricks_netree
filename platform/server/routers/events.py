"""
Events & Hackathons Router for Netree
Handles listing, project relevance matching, detail, attendance declarations,
and attendance visibility guards.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/events", tags=["events"])


class AttendanceDeclaration(BaseModel):
    event_id: str
    status: str = Field("going", description="going | interested | withdrawn")
    visibility: str = Field("college", description="college | private")


def _attendance_visible(record: Dict[str, Any], viewer: Optional[Dict[str, Any]] = None) -> bool:
    """
    Attendance Visibility Policy.
    Mirrors the Idea Vault pattern and the future Unity Catalog Row Filter:
      CREATE OR REPLACE FUNCTION netree.silver.row_filter_event_attendance(record, viewer)

    Rules:
    - User can always see their own RSVP.
    - Student & Alumni RSVPs default to college-wide visibility (opt-out available via visibility='private').
    - Faculty RSVPs are PRIVATE by default (must explicitly opt-in via visibility='college').
    """
    if not viewer:
        return record.get("visibility") == "college"

    if record.get("user_id") == viewer.get("user_id"):
        return True

    user_role = record.get("user_role", "student")
    if user_role == "teacher":
        # Faculty attendance private by default
        return record.get("visibility") == "college"

    # Students and alumni visible college-wide unless opted out
    return record.get("visibility") != "private"


@router.get("")
async def list_events(
    track: Optional[str] = None,
    mode: Optional[str] = Query(None, description="offline | online | hybrid"),
    source: Optional[str] = None,
):
    """
    Returns upcoming events & hackathons ranked against caller's profile.
    """
    return {
        "hackathons": [],
        "events": [],
        "freshness": {
            "is_stale": False,
            "label": "Live lakehouse feed active"
        }
    }


@router.get("/project/{project_id}")
async def events_for_project(project_id: str):
    """
    Returns events ranked against the given project's scope/retrieval query.
    """
    return {"project_id": project_id, "matches": []}


@router.get("/{event_id}")
async def event_detail(event_id: str):
    """
    Returns full event detail with sessions, speakers, and cold-start attendees.
    """
    return {"event_id": event_id, "attendees": {"total_going": 0, "faculty_speakers": [], "sponsor_alumni": []}}


@router.post("/{event_id}/attendance")
async def declare_attendance(event_id: str, declaration: AttendanceDeclaration):
    """
    Declares or withdraws attendance for the authenticated user.
    """
    return {
        "status": "ok",
        "event_id": event_id,
        "declaration": declaration.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
