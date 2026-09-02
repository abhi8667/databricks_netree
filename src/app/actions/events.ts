"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { AttendanceStatus, AttendanceVisibility, EventAttendance } from "@/lib/event-types";
import { runEventsIngest } from "@/lib/events/ingest";
import { eventAttendancesForUser, saveEventAttendance } from "@/lib/repo";

export async function toggleAttendanceAction({
  eventId,
  status = "going",
  visibility = "college",
}: {
  eventId: string;
  status?: AttendanceStatus;
  visibility?: AttendanceVisibility;
}): Promise<{ ok: boolean; status: AttendanceStatus }> {
  const user = await requireUser();

  const userAttendances = await eventAttendancesForUser(user.user_id);
  const existing = userAttendances.find((a) => a.event_id === eventId);

  const nextStatus: AttendanceStatus =
    existing && existing.status === "going" && status === "going" ? "withdrawn" : status;

  const now = new Date().toISOString();
  const record: EventAttendance = {
    attendance_id: existing?.attendance_id || `att_${user.user_id}_${eventId}`,
    event_id: eventId,
    user_id: user.user_id,
    user_name: user.full_name,
    user_role: user.role,
    user_department: user.department,
    user_standing: user.standing,
    status: nextStatus,
    visibility: user.role === "teacher" ? visibility : (existing?.visibility || visibility),
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  await saveEventAttendance(record);

  revalidatePath("/student");
  revalidatePath("/student/projects/[id]", "page");

  return { ok: true, status: nextStatus };
}

export async function refreshEventsAction() {
  await requireUser();
  await runEventsIngest();
  revalidatePath("/student");
}
