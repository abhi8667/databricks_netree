"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, listUsers } from "@/lib/auth";
import { nextIdeaTurn } from "@/lib/agent/idea";
import { draftPitch } from "@/lib/agent/writer";
import { matchFaculty } from "@/lib/search/match";
import { facultyById } from "@/lib/store/reference";
import {
  getInvitation,
  getProject,
  invitationsForProject,
  saveInvitation,
  saveMeeting,
  saveMessage,
  saveProject,
} from "@/lib/repo";
import { newId } from "@/lib/utils";
import type { IdeaTurn, Invitation, Meeting, Project, ProjectBrief } from "@/lib/types";

/* ---------------------------- Conversational Voice Mode ----------------------- */

/** Live conversational voice turn for Gemini/ChatGPT Voice Mode */
export async function talkToResearchAgent(history: IdeaTurn[]) {
  try {
    const turn = await nextIdeaTurn(history);
    return { ok: true, turn };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get AI response";
    return { ok: false, error: message };
  }
}

/** Directly creates and saves a project from a completed conversational voice ideation session */
export async function createProjectFromVoiceSession(transcript: IdeaTurn[]) {
  const user = await requireUser();
  const userTurns = transcript.filter((t) => t.role === "user");
  if (userTurns.length === 0) return { error: "No user speech recorded in voice session." };

  const opening = userTurns[0]!.content;
  const turn = await nextIdeaTurn(transcript);

  const fullTranscript = [...transcript];
  if (fullTranscript[fullTranscript.length - 1]?.role === "user") {
    fullTranscript.push({ role: "assistant", content: turn.reply });
  }

  const now = new Date().toISOString();
  const project: Project = {
    project_id: newId("prj"),
    owner_user_id: user.user_id,
    owner_name: user.full_name,
    title: turn.brief?.title || opening.slice(0, 70),
    status: turn.ready ? "structured" : "drafting",
    brief: turn.brief,
    transcript: fullTranscript,
    match: null,
    created_at: now,
    updated_at: now,
  };

  await saveProject(project);
  return { ok: true, projectId: project.project_id };
}

/* ---------------------------- The idea interview ----------------------- */

/** Creates the project from the student's opening sentence and asks question one. */
export async function startProject(seed: string) {
  const user = await requireUser();
  const opening = seed.trim();
  if (opening.length < 10) return { error: "Give it a sentence or two to work with." };

  const transcript: IdeaTurn[] = [{ role: "user", content: opening }];
  const turn = await nextIdeaTurn(transcript);
  transcript.push({ role: "assistant", content: turn.reply });

  const now = new Date().toISOString();
  const project: Project = {
    project_id: newId("prj"),
    owner_user_id: user.user_id,
    owner_name: user.full_name,
    title: opening.slice(0, 70),
    status: turn.ready ? "structured" : "drafting",
    brief: turn.brief,
    transcript,
    match: null,
    created_at: now,
    updated_at: now,
  };
  if (turn.brief?.title) project.title = turn.brief.title;

  await saveProject(project);
  redirect(`/student/projects/${project.project_id}`);
}

/** One more answer from the student; returns the agent's next move. */
export async function replyToIdea(projectId: string, answer: string) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project || project.owner_user_id !== user.user_id) return { error: "Project not found." };
  if (!answer.trim()) return { error: "Write an answer first." };

  const transcript: IdeaTurn[] = [...project.transcript, { role: "user", content: answer.trim() }];
  const turn = await nextIdeaTurn(transcript);
  transcript.push({ role: "assistant", content: turn.reply });

  const updated: Project = {
    ...project,
    transcript,
    brief: turn.brief ?? project.brief,
    title: turn.brief?.title ?? project.title,
    status: turn.ready ? "structured" : project.status,
    updated_at: new Date().toISOString(),
  };
  await saveProject(updated);
  revalidatePath(`/student/projects/${projectId}`);
  return { ok: true, ready: turn.ready };
}

/** Saves the student's edits to the generated brief. Their words win. */
export async function saveBrief(projectId: string, brief: ProjectBrief) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project || project.owner_user_id !== user.user_id) return { error: "Project not found." };

  await saveProject({
    ...project,
    brief,
    title: brief.title || project.title,
    status: project.status === "drafting" ? "structured" : project.status,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/student/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------- Matching ------------------------------ */

export async function runMatching(projectId: string) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project || project.owner_user_id !== user.user_id) return { error: "Project not found." };
  if (!project.brief) return { error: "Finish the brief before matching." };

  const report = await matchFaculty(project);
  await saveProject({
    ...project,
    match: report,
    status: report.matches.length ? "matched" : project.status,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/student/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------ Invitations ---------------------------- */

/** Produces the editable first draft. Nothing is sent by this call. */
export async function generatePitch(projectId: string, facultyId: string) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project?.brief || project.owner_user_id !== user.user_id) return { error: "Project not found." };

  const match = project.match?.matches.find((m) => m.faculty_id === facultyId);
  if (!match) return { error: "Run matching again — that candidate is no longer in the shortlist." };

  return { ok: true, pitch: await draftPitch(project.brief, match, user) };
}

export async function sendInvitation(projectId: string, facultyId: string, pitch: string) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project || project.owner_user_id !== user.user_id) return { error: "Project not found." };
  if (pitch.trim().length < 40) return { error: "The message is too short to send." };

  const profile = await facultyById(facultyId);
  if (!profile) return { error: "That faculty member is not in the index." };

  const existing = await invitationsForProject(projectId);
  if (existing.some((i) => i.faculty_id === facultyId && i.status === "pending")) {
    return { error: `You already have a request with ${profile.faculty_name} awaiting a reply.` };
  }

  // Link to a faculty account if that person has signed in; otherwise the
  // request waits in the inbox until they do.
  const teachers = await listUsers("teacher");
  const account = teachers.find((t) => t.faculty_id === facultyId) ?? null;

  const now = new Date().toISOString();
  const invitation: Invitation = {
    invitation_id: newId("inv"),
    project_id: projectId,
    project_title: project.title,
    student_user_id: user.user_id,
    student_name: user.full_name,
    faculty_id: facultyId,
    faculty_name: profile.faculty_name,
    faculty_user_id: account?.user_id ?? null,
    pitch: pitch.trim(),
    status: "pending",
    feedback: "",
    redirected_to_faculty_id: null,
    redirected_to_faculty_name: null,
    created_at: now,
    updated_at: now,
  };

  await saveInvitation(invitation);
  await saveProject({ ...project, status: "in_review", updated_at: now });
  revalidatePath(`/student/projects/${projectId}`);
  revalidatePath("/student/requests");
  return { ok: true, invitationId: invitation.invitation_id };
}

/* -------------------------------- Meetings ----------------------------- */

export async function requestMeeting(
  invitationId: string,
  input: { mode: "online" | "offline"; slots: string[]; location: string; agenda: string },
) {
  const user = await requireUser();
  const invitation = await getInvitation(invitationId);
  if (!invitation) return { error: "Request not found." };

  const slots = input.slots.map((s) => s.trim()).filter(Boolean);
  if (!slots.length) return { error: "Offer at least one time that works for you." };
  if (input.mode === "offline" && !input.location.trim()) {
    return { error: "Say where you would meet." };
  }

  const now = new Date().toISOString();
  const meeting: Meeting = {
    meeting_id: newId("mtg"),
    invitation_id: invitationId,
    requested_by: user.user_id,
    mode: input.mode,
    slots,
    location: input.location.trim(),
    agenda: input.agenda.trim(),
    status: "proposed",
    confirmed_slot: null,
    created_at: now,
    updated_at: now,
  };
  await saveMeeting(meeting);
  revalidatePath(`/student/requests/${invitationId}`);
  revalidatePath(`/faculty/proposals/${invitationId}`);
  return { ok: true };
}

/* -------------------------------- Messages ----------------------------- */

export async function postMessage(threadId: string, body: string) {
  const user = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Write something first." };

  await saveMessage({
    message_id: newId("msg"),
    thread_id: threadId,
    sender_user_id: user.user_id,
    sender_name: user.full_name,
    body: text,
    created_at: new Date().toISOString(),
  });
  revalidatePath(`/student/requests/${threadId}`);
  revalidatePath(`/faculty/proposals/${threadId}`);
  return { ok: true };
}

export async function archiveProject(projectId: string) {
  const user = await requireUser();
  const project = await getProject(projectId);
  if (!project || project.owner_user_id !== user.user_id) return { error: "Project not found." };
  await saveProject({ ...project, status: "archived", updated_at: new Date().toISOString() });
  revalidatePath("/student/projects");
  return { ok: true };
}
