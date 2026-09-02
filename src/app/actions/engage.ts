"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  getOpportunity,
  interestsFromStudent,
  saveInterest,
  saveQuestion,
} from "@/lib/repo";
import { newId } from "@/lib/utils";
import type { Interest, Question } from "@/lib/types";

/** A student putting their hand up for a faculty-posted position. */
export async function expressInterest(opportunityId: string, note: string) {
  const user = await requireUser();
  const opportunity = await getOpportunity(opportunityId);
  if (!opportunity) return { error: "That position is no longer listed." };
  if (opportunity.status !== "open") return { error: "That position has been closed." };
  if (note.trim().length < 20) {
    return { error: "Say something specific about why you fit — one line is not enough." };
  }

  const mine = await interestsFromStudent(user.user_id);
  if (mine.some((i) => i.opportunity_id === opportunityId)) {
    return { error: "You have already applied to this one." };
  }

  const now = new Date().toISOString();
  const interest: Interest = {
    interest_id: newId("int"),
    opportunity_id: opportunityId,
    opportunity_title: opportunity.title,
    student_user_id: user.user_id,
    student_name: user.full_name,
    note: note.trim(),
    status: "pending",
    created_at: now,
    updated_at: now,
  };
  await saveInterest(interest);
  revalidatePath("/student/opportunities");
  revalidatePath("/faculty/positions");
  return { ok: true };
}

/** The lightweight path: one question, no proposal. */
export async function askQuestion(input: {
  audience: "alumni" | "teacher";
  targetUserId: string | null;
  targetName: string | null;
  topic: string;
  body: string;
}) {
  const user = await requireUser();
  if (input.body.trim().length < 15) return { error: "Ask the whole question." };
  if (!input.topic.trim()) return { error: "Give it a subject so the right person picks it up." };

  const now = new Date().toISOString();
  const question: Question = {
    question_id: newId("qst"),
    asker_user_id: user.user_id,
    asker_name: user.full_name,
    audience: input.audience,
    target_user_id: input.targetUserId,
    target_name: input.targetName,
    topic: input.topic.trim(),
    body: input.body.trim(),
    answer: "",
    answered_by: null,
    status: "open",
    created_at: now,
    updated_at: now,
  };
  await saveQuestion(question);
  revalidatePath("/student/ask");
  revalidatePath("/alumni");
  revalidatePath("/faculty/questions");
  return { ok: true };
}
