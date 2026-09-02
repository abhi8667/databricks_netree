import "server-only";
import type {
  AttendeePersona,
  ConformedEvent,
  EventAttendance,
  EventAttendeeSummary,
  EventMatch,
  EventsFeedPayload,
  EventSpeaker,
} from "@/lib/event-types";
import { getConformedEvents } from "@/lib/events/ingest";
import { allActiveAttendances } from "@/lib/repo";
import { referenceData } from "@/lib/store/reference";
import { briefToQuery } from "@/lib/search/match";
import type { NetreeUser, Project } from "@/lib/types";

// Known event hosts and sponsor ecosystems for cold-start attendee cross-referencing
const KNOWN_SPONSORS = [
  "databricks",
  "together fund",
  "fde times",
  "craftifai",
  "t-hub",
  "paytm",
  "google",
  "microsoft",
  "aws",
  "bhive",
  "quad ai",
  "world we desire",
];

/**
 * Attendance Visibility Policy
 *
 * Mirrors the Idea Vault pattern and the future Unity Catalog Row Filter:
 *   CREATE OR REPLACE FUNCTION netree.silver.row_filter_event_attendance(record, viewer)
 *
 * Rules:
 * 1. An individual can always view their own record.
 * 2. Student attendance is visible college-wide by default; opt-out (visibility='private') hides it.
 * 3. Faculty attendance is PRIVATE by default; explicit opt-in (visibility='college') reveals it.
 * 4. Alumni attendance follows college-wide visibility unless marked private.
 */
export function _attendance_visible(
  record: EventAttendance,
  viewer?: { user_id: string; role?: string } | null,
): boolean {
  if (!viewer) return record.visibility === "college";
  if (record.user_id === viewer.user_id) return true;

  if (record.user_role === "teacher") {
    // Faculty attendance is strictly private by default
    return record.visibility === "college";
  }

  // Student and alumni default to college-wide visibility unless opted out
  return record.visibility !== "private";
}

/* -------------------------------------------------------------------------- */
/*                               Token Scorer                                 */
/* -------------------------------------------------------------------------- */

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
}

/**
 * Uses the exact same weighted lexical overlap and term frequency scoring
 * used across Netree's match.ts and vectors.ts.
 */
function scoreEventAgainstQuery(
  event: ConformedEvent,
  queryWords: Set<string>,
  queryText: string,
): { score: number; reason: string } {
  const titleTokens = tokenize(event.title);
  const trackTokens = tokenize(event.track);
  const tagTokens = tokenize(event.tags.join(" "));
  const descTokens = tokenize(event.description.slice(0, 500));

  let matchedTitleWords: string[] = [];
  let matchedTrackWords: string[] = [];
  let matchedTagWords: string[] = [];

  for (const w of queryWords) {
    if (titleTokens.has(w)) matchedTitleWords.push(w);
    if (trackTokens.has(w)) matchedTrackWords.push(w);
    if (tagTokens.has(w)) matchedTagWords.push(w);
  }

  const titleScore = Math.min(matchedTitleWords.length * 0.45, 0.9);
  const trackScore = Math.min(matchedTrackWords.length * 0.35, 0.7);
  const tagScore = Math.min(matchedTagWords.length * 0.25, 0.5);

  let descHits = 0;
  for (const w of descTokens) {
    if (queryWords.has(w)) descHits++;
  }
  const descScore = Math.min(descHits * 0.05, 0.3);

  // Recency and timing factor: upcoming events score higher than past ones
  const isUpcoming = new Date(event.start_at).getTime() >= Date.now();
  const timeWeight = isUpcoming ? 1.0 : 0.4;

  const rawScore = (titleScore + trackScore + tagScore + descScore) * timeWeight;
  const normalizedScore = Number(Math.min(Math.max(rawScore, 0.05), 0.99).toFixed(3));

  // Build high-signal match explanation
  const matchedKeywords = Array.from(
    new Set([...matchedTitleWords, ...matchedTrackWords, ...matchedTagWords]),
  ).slice(0, 3);

  let reason = "Active campus opportunity";
  if (matchedKeywords.length) {
    reason = `Aligns with your focus in ${matchedKeywords.join(", ")}`;
  } else if (event.track && event.track !== "General") {
    reason = `${event.track} track · ${event.mode === "offline" ? event.area : "Online"}`;
  } else {
    reason = `${event.mode === "offline" ? `In-person at ${event.area}` : "Remote/Online"} · ${event.kind}`;
  }

  return { score: normalizedScore, reason };
}

/* -------------------------------------------------------------------------- */
/*                         Cold-Start Attendee Engine                         */
/* -------------------------------------------------------------------------- */

export function resolveEventAttendees(
  event: ConformedEvent,
  activeAttendances: EventAttendance[],
  facultyRoster: Array<{ faculty_id: string; faculty_name: string; designation: string }>,
  viewer?: { user_id: string; role?: string } | null,
): EventAttendeeSummary {
  const facultySpeakers: AttendeePersona[] = [];
  const sponsorAlumni: AttendeePersona[] = [];
  const studentAttendees: AttendeePersona[] = [];

  // 1. Cold start from public speaking agenda
  for (const sp of event.speakers) {
    const matchedFaculty = sp.faculty_id
      ? facultyRoster.find((f) => f.faculty_id === sp.faculty_id)
      : facultyRoster.find(
          (f) => f.faculty_name.toLowerCase().trim() === sp.display_name.toLowerCase().trim(),
        );

    if (matchedFaculty) {
      facultySpeakers.push({
        user_id: matchedFaculty.faculty_id,
        name: matchedFaculty.faculty_name,
        role: "faculty_speaker",
        label: `Faculty Speaker (${matchedFaculty.designation})`,
        avatar_url: sp.square_picture_url,
      });
    } else if (sp.featured || sp.display_name) {
      facultySpeakers.push({
        user_id: sp.id,
        name: sp.display_name,
        role: "faculty_speaker",
        label: sp.designation ? `${sp.designation}, ${sp.company}` : sp.company || "Speaker",
        avatar_url: sp.square_picture_url,
        profile_url: sp.linkedin_url ?? undefined,
      });
    }
  }

  // 2. Cold start from sponsor ecosystem
  const orgOrArea = (event.organizer_name + " " + event.venue + " " + event.description).toLowerCase();
  for (const sponsor of KNOWN_SPONSORS) {
    if (orgOrArea.includes(sponsor)) {
      const prettySponsor = sponsor.charAt(0).toUpperCase() + sponsor.slice(1);
      sponsorAlumni.push({
        user_id: `sponsor_${sponsor}`,
        name: `RVCE Alumni at ${prettySponsor}`,
        role: "sponsor_alumni",
        label: `Sponsor Network (${prettySponsor})`,
      });
      break;
    }
  }

  // 3. Student & faculty declared RSVPs
  let isCurrentUserGoing = false;
  let currentUserVisibility: EventAttendance["visibility"] = "college";

  const eventAttendances = activeAttendances.filter((a) => a.event_id === event.event_id);

  for (const att of eventAttendances) {
    if (viewer && att.user_id === viewer.user_id) {
      isCurrentUserGoing = att.status === "going";
      currentUserVisibility = att.visibility;
    }

    if (att.status === "going" && _attendance_visible(att, viewer)) {
      studentAttendees.push({
        user_id: att.user_id,
        name: att.user_name,
        role: "student",
        label: att.user_standing
          ? `${att.user_department} (${att.user_standing})`
          : att.user_department,
      });
    }
  }

  const totalGoing =
    facultySpeakers.length + sponsorAlumni.length + studentAttendees.length;

  return {
    total_going: totalGoing,
    faculty_speakers: facultySpeakers,
    sponsor_alumni: sponsorAlumni,
    student_attendees: studentAttendees,
    is_current_user_going: isCurrentUserGoing,
    current_user_visibility: currentUserVisibility,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Public Service APIs                             */
/* -------------------------------------------------------------------------- */

export async function getRankedEventsForStudent(
  user: NetreeUser,
): Promise<EventsFeedPayload> {
  const [eventsData, attendances, reference] = await Promise.all([
    getConformedEvents(),
    allActiveAttendances(),
    referenceData().catch(() => ({ faculty: [] })),
  ]);

  const studentQuery = [
    ...(user.interests || []),
    user.department,
    user.standing,
    user.bio,
  ]
    .filter(Boolean)
    .join(" ");

  const queryWords = tokenize(studentQuery);

  const scoredMatches: EventMatch[] = eventsData.events.map((ev) => {
    const { score, reason } = scoreEventAgainstQuery(ev, queryWords, studentQuery);
    const attendees = resolveEventAttendees(
      ev,
      attendances,
      reference.faculty || [],
      { user_id: user.user_id, role: user.role },
    );

    return {
      ...ev,
      score,
      match_reason: reason,
      attendees,
    };
  });

  // Sort primarily by match score, secondary by upcoming start date
  scoredMatches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });

  const hackathons = scoredMatches.filter((m) => m.source === "hackculture" || m.kind === "hackathon");
  const events = scoredMatches.filter((m) => m.source === "btw" && m.kind !== "hackathon");

  const latestTime = eventsData.btwUpdatedAt || eventsData.hackcultureUpdatedAt;
  const label = eventsData.isStale
    ? "Viewing cached snapshot (upstream offline)"
    : latestTime
      ? `Live feed synced ${new Date(latestTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Live feed active";

  return {
    hackathons,
    events,
    freshness: {
      btw_updated_at: eventsData.btwUpdatedAt,
      hackculture_updated_at: eventsData.hackcultureUpdatedAt,
      is_stale: eventsData.isStale,
      label,
    },
  };
}

export async function getRankedEventsForProject(
  project: Project,
  user?: NetreeUser | null,
): Promise<EventMatch[]> {
  const [eventsData, attendances, reference] = await Promise.all([
    getConformedEvents(),
    allActiveAttendances(),
    referenceData().catch(() => ({ faculty: [] })),
  ]);

  const projectQuery = project.brief
    ? briefToQuery(project.brief)
    : `${project.title} ${project.status}`;

  const queryWords = tokenize(projectQuery);

  const matches: EventMatch[] = eventsData.events.map((ev) => {
    const { score, reason } = scoreEventAgainstQuery(ev, queryWords, projectQuery);
    const attendees = resolveEventAttendees(
      ev,
      attendances,
      reference.faculty || [],
      user ? { user_id: user.user_id, role: user.role } : null,
    );

    return {
      ...ev,
      score,
      match_reason: reason,
      attendees,
    };
  });

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 3);
}
