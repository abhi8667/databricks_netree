"use server";

import { redirect } from "next/navigation";
import { clearSession, currentUser, findByCollegeId, saveUser, setSession } from "@/lib/auth";
import { referenceData } from "@/lib/store/reference";
import { homeFor } from "@/lib/routes";
import { newId } from "@/lib/utils";
import type { NetreeUser, Role } from "@/lib/types";

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const role = String(form.get("role") ?? "") as Role;
  const collegeId = String(form.get("college_id") ?? "").trim();
  const fullName = String(form.get("full_name") ?? "").trim();

  if (!["student", "teacher", "alumni"].includes(role)) return { error: "Choose who you are first." };
  if (collegeId.length < 3) return { error: "Enter your college ID." };
  if (fullName.length < 2) return { error: "Enter your full name." };

  const existing = await findByCollegeId(collegeId, role);
  if (existing) {
    await setSession(existing.user_id);
    redirect(homeFor(existing));
  }

  const now = new Date().toISOString();
  const user: NetreeUser = {
    user_id: newId("usr"),
    role,
    full_name: fullName,
    email: "",
    college_id: collegeId,
    department: "",
    standing: "",
    bio: "",
    interests: [],
    achievements: "",
    resume_name: "",
    resume_text: "",
    linkedin_url: "",
    scholar_url: "",
    faculty_id: role === "teacher" ? await guessFacultyId(fullName) : null,
    open_to_collaboration: false,
    created_at: now,
    updated_at: now,
  };

  await saveUser(user);
  await setSession(user.user_id);
  redirect("/onboarding");
}

/**
 * Faculty accounts are linked to the campus dataset by name. The link is only
 * a suggestion at this point - onboarding shows it and lets the person confirm
 * or clear it, because attaching someone to the wrong publication record is a
 * worse failure than leaving it unlinked.
 */
async function guessFacultyId(fullName: string): Promise<string | null> {
  const { faculty } = await referenceData();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
  const target = norm(fullName);
  const exact = faculty.find((f) => norm(f.faculty_name) === target);
  if (exact) return exact.faculty_id;
  const partial = faculty.find((f) => {
    const parts = norm(f.faculty_name).split(" ");
    return parts.length > 1 && target.startsWith(parts[0]!) && target.includes(parts[1]!);
  });
  return partial?.faculty_id ?? null;
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}

export async function completeOnboarding(_prev: SignInState, form: FormData): Promise<SignInState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const department = String(form.get("department") ?? "").trim();
  const standing = String(form.get("standing") ?? "").trim();
  if (!department) return { error: "Department is required." };
  if (!standing) return { error: user.role === "teacher" ? "Designation is required." : "This field is required." };

  const facultyIdRaw = String(form.get("faculty_id") ?? "").trim();

  const updated: NetreeUser = {
    ...user,
    email: String(form.get("email") ?? "").trim(),
    department,
    standing,
    bio: String(form.get("bio") ?? "").trim(),
    interests: String(form.get("interests") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    achievements: String(form.get("achievements") ?? "").trim(),
    resume_name: String(form.get("resume_name") ?? "").trim(),
    resume_text: String(form.get("resume_text") ?? "").trim(),
    linkedin_url: String(form.get("linkedin_url") ?? "").trim(),
    scholar_url: String(form.get("scholar_url") ?? "").trim(),
    faculty_id: user.role === "teacher" ? facultyIdRaw || null : null,
    open_to_collaboration: form.get("open_to_collaboration") === "on",
    updated_at: new Date().toISOString(),
  };

  await saveUser(updated);
  redirect(homeFor(updated));
}
