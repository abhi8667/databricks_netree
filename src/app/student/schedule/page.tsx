import { requireUser } from "@/lib/auth";
import { invitationsFromStudent } from "@/lib/repo";
import { ScheduleCalendar, type ScheduleEvent } from "@/components/schedule-calendar";
import { listRecords } from "@/lib/store/records";
import type { Meeting } from "@/lib/types";

function safeDate(d?: string): string {
  try {
    if (!d) return new Date().toISOString().split("T")[0]!;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0]!;
    return parsed.toISOString().split("T")[0]!;
  } catch {
    return new Date().toISOString().split("T")[0]!;
  }
}

export default async function StudentSchedulePage() {
  const user = await requireUser();
  const invitations = await invitationsFromStudent(user.user_id);
  const allMeetings = await listRecords<Meeting>("app_meeting");

  const invitationMap = new Map(invitations.map((i) => [i.invitation_id, i]));
  const studentMeetings = allMeetings.filter((m) => invitationMap.has(m.invitation_id));

  const realEvents: ScheduleEvent[] = studentMeetings.map((m) => {
    const inv = invitationMap.get(m.invitation_id);
    const slotText = m.confirmed_slot || (m.slots && m.slots[0]) || "10:00 AM";

    return {
      id: m.meeting_id,
      title: inv?.project_title ? `${inv.project_title} Discussion` : "Research Collaboration",
      type: "meeting",
      status: m.status === "confirmed" ? "confirmed" : "proposed",
      date: safeDate(m.created_at),
      time: slotText,
      location: m.mode === "online" ? "Google Meet (Online)" : m.location || "Campus Lab",
      mode: m.mode || "online",
      participantName: inv?.faculty_name || "Faculty Mentor",
      participantRole: "Faculty Mentor",
      agenda: m.agenda || "",
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <ScheduleCalendar role="student" realEvents={realEvents} />
    </div>
  );
}
