import "server-only";
import { getRecord, listRecords, putRecord } from "@/lib/store/records";
import type {
  EventAttendance,
  Interest,
  Invitation,
  Meeting,
  Message,
  Opportunity,
  Project,
  Question,
} from "@/lib/types";

/**
 * Typed access over the append-only record store. Each `save*` writes a new
 * revision; nothing mutates in place.
 */

/* ------------------------------- Projects ------------------------------ */

export const saveProject = (p: Project) =>
  putRecord("app_project", {
    id: p.project_id,
    owner_id: p.owner_user_id,
    status: p.status,
    payload: p as unknown as Record<string, unknown>,
  });

export const getProject = (id: string) => getRecord<Project>("app_project", id);

export const projectsOf = (userId: string) =>
  listRecords<Project>("app_project", { owner_id: userId });

/* ------------------------------ Invitations ---------------------------- */

export const saveInvitation = (i: Invitation) =>
  putRecord("app_invitation", {
    id: i.invitation_id,
    owner_id: i.student_user_id,
    ref_id: i.faculty_id,
    status: i.status,
    payload: i as unknown as Record<string, unknown>,
  });

export const getInvitation = (id: string) => getRecord<Invitation>("app_invitation", id);

export const invitationsFromStudent = (userId: string) =>
  listRecords<Invitation>("app_invitation", { owner_id: userId });

/** Everything addressed to one faculty member, including redirects to them. */
export async function invitationsForFaculty(facultyId: string) {
  const all = await listRecords<Invitation>("app_invitation");
  return all.filter(
    (i) => i.faculty_id === facultyId || i.redirected_to_faculty_id === facultyId,
  );
}

export const invitationsForProject = (projectId: string) =>
  listRecords<Invitation>("app_invitation").then((all) =>
    all.filter((i) => i.project_id === projectId),
  );

/* ----------------------------- Opportunities --------------------------- */

export const saveOpportunity = (o: Opportunity) =>
  putRecord("app_opportunity", {
    id: o.opportunity_id,
    owner_id: o.owner_user_id,
    ref_id: o.faculty_id ?? "",
    status: o.status,
    payload: o as unknown as Record<string, unknown>,
  });

export const getOpportunity = (id: string) => getRecord<Opportunity>("app_opportunity", id);

export const openOpportunities = () =>
  listRecords<Opportunity>("app_opportunity", { status: "open" });

export const opportunitiesOf = (userId: string) =>
  listRecords<Opportunity>("app_opportunity", { owner_id: userId });

/* -------------------------------- Interest ----------------------------- */

export const saveInterest = (i: Interest) =>
  putRecord("app_interest", {
    id: i.interest_id,
    owner_id: i.student_user_id,
    ref_id: i.opportunity_id,
    status: i.status,
    payload: i as unknown as Record<string, unknown>,
  });

export const getInterest = (id: string) => getRecord<Interest>("app_interest", id);

export const interestsFromStudent = (userId: string) =>
  listRecords<Interest>("app_interest", { owner_id: userId });

export const interestsForOpportunity = (opportunityId: string) =>
  listRecords<Interest>("app_interest", { ref_id: opportunityId });

export async function interestsForOwner(ownerUserId: string) {
  const [mine, all] = await Promise.all([
    listRecords<Opportunity>("app_opportunity", { owner_id: ownerUserId }),
    listRecords<Interest>("app_interest"),
  ]);
  const ids = new Set(mine.map((o) => o.opportunity_id));
  return all.filter((i) => ids.has(i.opportunity_id));
}

/* -------------------------------- Meetings ----------------------------- */

export const saveMeeting = (m: Meeting) =>
  putRecord("app_meeting", {
    id: m.meeting_id,
    owner_id: m.requested_by,
    ref_id: m.invitation_id,
    status: m.status,
    payload: m as unknown as Record<string, unknown>,
  });

export const meetingsForInvitation = (invitationId: string) =>
  listRecords<Meeting>("app_meeting", { ref_id: invitationId });

/* -------------------------------- Messages ----------------------------- */

export const saveMessage = (m: Message) =>
  putRecord("app_message", {
    id: m.message_id,
    owner_id: m.sender_user_id,
    ref_id: m.thread_id,
    payload: m as unknown as Record<string, unknown>,
  });

export async function messagesInThread(threadId: string) {
  const rows = await listRecords<Message>("app_message", { ref_id: threadId });
  return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/* ------------------------------- Questions ----------------------------- */

export const saveQuestion = (q: Question) =>
  putRecord("app_question", {
    id: q.question_id,
    owner_id: q.asker_user_id,
    ref_id: q.target_user_id ?? q.audience,
    status: q.status,
    payload: q as unknown as Record<string, unknown>,
  });

export const getQuestion = (id: string) => getRecord<Question>("app_question", id);

export const questionsFrom = (userId: string) =>
  listRecords<Question>("app_question", { owner_id: userId });

/** Questions a mentor should see: addressed to them, or open to their audience. */
export async function questionsFor(userId: string, audience: "alumni" | "teacher") {
  const all = await listRecords<Question>("app_question");
  return all.filter(
    (q) => q.target_user_id === userId || (q.target_user_id === null && q.audience === audience),
  );
}

/* --------------------------- Event Attendance -------------------------- */

export const saveEventAttendance = (a: EventAttendance) =>
  putRecord("app_event_attendance", {
    id: a.attendance_id,
    owner_id: a.user_id,
    ref_id: a.event_id,
    status: a.status,
    payload: a as unknown as Record<string, unknown>,
  });

export const getEventAttendance = (id: string) =>
  getRecord<EventAttendance>("app_event_attendance", id);

export const eventAttendancesForEvent = (eventId: string) =>
  listRecords<EventAttendance>("app_event_attendance", { ref_id: eventId });

export const eventAttendancesForUser = (userId: string) =>
  listRecords<EventAttendance>("app_event_attendance", { owner_id: userId });

export const allActiveAttendances = () =>
  listRecords<EventAttendance>("app_event_attendance", { status: "going" });

