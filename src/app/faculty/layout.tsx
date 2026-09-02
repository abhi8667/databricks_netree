import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { inboxFor } from "@/lib/faculty-inbox";
import { interestsForOwner, questionsFor } from "@/lib/repo";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/");
  if (!user.department) redirect("/onboarding");

  const [inbox, interests, questions] = await Promise.all([
    inboxFor(user),
    interestsForOwner(user.user_id),
    questionsFor(user.user_id, "teacher"),
  ]);

  return (
    <AppShell
      roleLabel="Faculty"
      user={{ full_name: user.full_name, college_id: user.college_id }}
      nav={[
        { href: "/faculty", label: "Dashboard" },
        { href: "/faculty/schedule", label: "Schedule" },
        {
          href: "/faculty/proposals",
          label: "Proposals",
          count: inbox.filter((i) => i.status === "pending").length,
        },
        {
          href: "/faculty/positions",
          label: "My positions",
          count: interests.filter((i) => i.status === "pending").length,
        },
        {
          href: "/faculty/questions",
          label: "Questions",
          count: questions.filter((q) => q.status === "open").length,
        },
        { href: "/onboarding", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
