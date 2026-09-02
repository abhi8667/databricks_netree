import { requireUser } from "@/lib/auth";
import { inboxFor } from "@/lib/faculty-inbox";
import { ScheduleCalendar, type ScheduleEvent } from "@/components/schedule-calendar";
import { listRecords } from "@/lib/store/records";
import type { Meeting } from "@/lib/types";

export default async function FacultySchedulePage() {
  const user = await requireUser();
  const inbox = await inboxFor(user);
  const allMeetings = await listRecords<Meeting>("app_meeting");

  const invitationMap = new Map(inbox.map((i) => [i.invitation_id, i]));
  const facultyMeetings = allMeetings.filter((m) => invitationMap.has(m.invitation_id));

  const realEvents: ScheduleEvent[] = facultyMeetings.map((m) => {
    const inv = invitationMap.get(m.invitation_id);
    const slotText = m.confirmed_slot || m.slots[0] || "10:00 AM";

    return {
      id: m.meeting_id,
      title: inv?.project_title ? `${inv.project_title} Proposal Review` : "Student Proposal Discussion",
      type: "meeting",
      status: m.status === "confirmed" ? "confirmed" : "proposed",
      date: new Date(m.created_at).toISOString().split("T")[0]!,
      time: slotText,
      location: m.mode === "online" ? "Google Meet (Online)" : m.location || "Faculty Office / Lab",
      mode: m.mode,
      participantName: "Student Researcher",
      participantRole: "Applicant",
      agenda: m.agenda,
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <ScheduleCalendar role="faculty" realEvents={realEvents} />
    </div>
  );
}
