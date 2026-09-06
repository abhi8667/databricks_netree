"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, listUsers } from "@/lib/auth";
import { facultyById } from "@/lib/store/reference";
import {
  getInterest,
  getInvitation,
  getOpportunity,
  meetingsForInvitation,
  saveInterest,
  saveInvitation,
  saveMeeting,
  saveOpportunity,
  saveQuestion,
  getQuestion,
} from "@/lib/repo";
import { newId } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";

/* ---------------------- Responding to student proposals ---------------- */

async function loadForFaculty(invitationId: string) {
  const user = await requireUser();
  if (user.role !== "teacher") throw new Error("Faculty only");
  const invitation = await getInvitation(invitationId);
  if (!invitation) return { error: "Request not found." as const };
  const mine =
    invitation.faculty_user_id === user.user_id ||
    (user.faculty_id !== null &&
      (invitation.faculty_id === user.faculty_id ||
        invitation.redirected_to_faculty_id === user.faculty_id));
  if (!mine) return { error: "That request is not addressed to you." as const };
  return { user, invitation };
}

export async function acceptProposal(invitationId: string, note: string) {
  const loaded = await loadForFaculty(invitationId);
  if ("error" in loaded) return loaded;

  await saveInvitation({
    ...loaded.invitation,
    status: "accepted",
    feedback: note.trim(),
    faculty_user_id: loaded.user.user_id,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/faculty/proposals/${invitationId}`);
  revalidatePath("/faculty");
  return { ok: true };
}

export async function declineProposal(invitationId: string, reason: string) {
  const loaded = await loadForFaculty(invitationId);
  if ("error" in loaded) return loaded;
  if (reason.trim().length < 15) {
    return { error: "Give the student a reason they can act on." };
  }

  await saveInvitation({
    ...loaded.invitation,
    status: "declined",
    feedback: reason.trim(),
    faculty_user_id: loaded.user.user_id,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/faculty/proposals/${invitationId}`);
  revalidatePath("/faculty");
  return { ok: true };
}

/** Feedback without a verdict — the idea comes back reshaped. */
export async function requestChanges(invitationId: string, feedback: string) {
  const loaded = await loadForFaculty(invitationId);
  if ("error" in loaded) return loaded;
  if (feedback.trim().length < 15) return { error: "Say what needs to change." };

  await saveInvitation({
    ...loaded.invitation,
    status: "changes_requested",
    feedback: feedback.trim(),
    faculty_user_id: loaded.user.user_id,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/faculty/proposals/${invitationId}`);
  revalidatePath("/faculty");
  return { ok: true };
}

/** Hands the proposal to a colleague whose work fits it better. */
export async function redirectProposal(
  invitationId: string,
  toFacultyId: string,
  note: string,
) {
  const loaded = await loadForFaculty(invitationId);
  if ("error" in loaded) return loaded;

  const target = await facultyById(toFacultyId);
  if (!target) return { error: "That colleague is not in the index." };
  if (toFacultyId === loaded.invitation.faculty_id) {
    return { error: "That is already where the request sits." };
  }

  const teachers = await listUsers("teacher");
  const account = teachers.find((t) => t.faculty_id === toFacultyId) ?? null;

  await saveInvitation({
    ...loaded.invitation,
    status: "redirected",
    feedback: note.trim(),
    redirected_to_faculty_id: toFacultyId,
    redirected_to_faculty_name: target.faculty_name,
    faculty_user_id: account?.user_id ?? null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/faculty/proposals/${invitationId}`);
  revalidatePath("/faculty");
  return { ok: true, to: target.faculty_name };
}

/* -------------------------------- Meetings ----------------------------- */

export async function respondToMeeting(
  meetingId: string,
  invitationId: string,
  decision: { accept: boolean; slot?: string },
) {
  const loaded = await loadForFaculty(invitationId);
  if ("error" in loaded) return loaded;

  const meetings = await meetingsForInvitation(invitationId);
  const meeting = meetings.find((m) => m.meeting_id === meetingId);
  if (!meeting) return { error: "That meeting request is gone." };
  if (decision.accept && !decision.slot) return { error: "Pick one of the times offered." };

  await saveMeeting({
    ...meeting,
    status: decision.accept ? "confirmed" : "declined",
    confirmed_slot: decision.accept ? (decision.slot ?? null) : null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/faculty/proposals/${invitationId}`);
  revalidatePath(`/student/requests/${invitationId}`);
  return { ok: true };
}

/* ------------------------------- Positions ----------------------------- */

export async function createOpportunity(input: {
  title: string;
  summary: string;
  requirements: string;
  skills: string;
  weekly_hours: string;
  mode: Opportunity["mode"];
  duration: string;
  seats: number;
}) {
  const user = await requireUser();
  if (user.role !== "teacher") return { error: "Faculty only." };
  if (input.title.trim().length < 6) return { error: "Give the position a title." };
  if (input.summary.trim().length < 40) {
    return { error: "Describe the work properly — students decide from this alone." };
  }

  const lines = (v: string) =>
    v
      .split("\n")
      .map((s) => s.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

  const now = new Date().toISOString();
  const opportunity: Opportunity = {
    opportunity_id: newId("opp"),
    owner_user_id: user.user_id,
    owner_name: user.full_name,
    faculty_id: user.faculty_id,
    title: input.title.trim(),
    summary: input.summary.trim(),
    requirements: lines(input.requirements),
    skills: input.skills.split(",").map((s) => s.trim()).filter(Boolean),
    weekly_hours: input.weekly_hours.trim(),
    mode: input.mode,
    duration: input.duration.trim(),
    seats: Math.max(1, Number(input.seats) || 1),
    status: "open",
    created_at: now,
    updated_at: now,
  };
  await saveOpportunity(opportunity);
  revalidatePath("/faculty/positions");
  revalidatePath("/student/opportunities");
  redirect("/faculty/positions");
}

export async function setOpportunityStatus(opportunityId: string, status: "open" | "closed") {
  const user = await requireUser();
  const opportunity = await getOpportunity(opportunityId);
  if (!opportunity || opportunity.owner_user_id !== user.user_id) {
    return { error: "Position not found." };
  }
  await saveOpportunity({ ...opportunity, status, updated_at: new Date().toISOString() });
  revalidatePath("/faculty/positions");
  revalidatePath("/student/opportunities");
  return { ok: true };
}

export async function respondToInterest(interestId: string, accept: boolean) {
  const user = await requireUser();
  const interest = await getInterest(interestId);
  if (!interest) return { error: "Application not found." };
  const opportunity = await getOpportunity(interest.opportunity_id);
  if (!opportunity || opportunity.owner_user_id !== user.user_id) {
    return { error: "That application is not yours to decide." };
  }

  await saveInterest({
    ...interest,
    status: accept ? "accepted" : "declined",
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/faculty/positions");
  revalidatePath("/student/opportunities");
  return { ok: true };
}

/* ------------------------------- Questions ----------------------------- */

export async function answerQuestion(questionId: string, answer: string) {
  const user = await requireUser();
  if (user.role === "student") return { error: "Only faculty and alumni answer questions." };
  const question = await getQuestion(questionId);
  if (!question) return { error: "Question not found." };
  if (answer.trim().length < 5) return { error: "Please enter an answer." };

  await saveQuestion({
    ...question,
    answer: answer.trim(),
    answered_by: user.full_name,
    status: "answered",
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/faculty/questions");
  revalidatePath("/alumni");
  revalidatePath("/student");
  revalidatePath("/student/ask");
  revalidatePath("/student/requests");
  return { ok: true };
}
