import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { invitationsFromStudent, projectsOf, questionsFrom } from "@/lib/repo";
import { getRankedEventsForStudent } from "@/lib/events/service";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/");
  if (!user.department) redirect("/onboarding");

  const [projects, invitations, questions, eventsFeed] = await Promise.all([
    projectsOf(user.user_id),
    invitationsFromStudent(user.user_id),
    questionsFrom(user.user_id),
    getRankedEventsForStudent(user),
  ]);

  const answered = questions.filter((q) => q.status === "answered").length;
  const replied = invitations.filter((i) => i.status !== "pending").length;

  return (
    <AppShell
      roleLabel="Student"
      user={{ full_name: user.full_name, college_id: user.college_id }}
      nav={[
        { href: "/student", label: "Dashboard" },
        { href: "/student/schedule", label: "Schedule" },
        { href: "/student/projects", label: "My ideas", count: projects.length },
        { href: "/student/events", label: "Events & Hacks", count: eventsFeed.hackathons.length },
        { href: "/student/requests", label: "Requests", count: replied },
        { href: "/student/opportunities", label: "Open positions" },
        { href: "/student/ask", label: "Ask a mentor", count: answered },
        { href: "/onboarding", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
