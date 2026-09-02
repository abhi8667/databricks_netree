import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { referenceData } from "@/lib/store/reference";
import { OnboardingForm } from "./form";

/**
 * Sign-in and onboarding both write through the SQL warehouse, and the first
 * statement after an idle period waits on it starting up. The platform default
 * of a few seconds kills that mid-flight, which the browser shows as a button
 * stuck on "Saving" - the server action is capped by this page's budget.
 */
export const maxDuration = 60;

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { faculty } = await referenceData();
  const roster =
    user.role === "teacher"
      ? faculty
          .map((f) => ({
            faculty_id: f.faculty_id,
            faculty_name: f.faculty_name,
            designation: f.designation,
            n_publications: f.n_publications,
          }))
          .sort((a, b) => a.faculty_name.localeCompare(b.faculty_name))
      : [];

  const suggested = user.faculty_id
    ? (faculty.find((f) => f.faculty_id === user.faculty_id) ?? null)
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10">
      <OnboardingForm
        user={user}
        roster={roster}
        suggestedTopics={suggested?.top_topics ?? ""}
        suggestedPublications={suggested?.n_publications ?? 0}
      />
    </main>
  );
}
