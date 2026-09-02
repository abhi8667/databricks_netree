import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { questionsFor } from "@/lib/repo";
import { getNotificationsForUser } from "@/lib/notifications-server";

export default async function AlumniLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "alumni") redirect("/");
  if (!user.department) redirect("/onboarding");

  const [questions, notifications] = await Promise.all([
    questionsFor(user.user_id, "alumni"),
    getNotificationsForUser(user),
  ]);

  return (
    <AppShell
      roleLabel="Alumni"
      user={{ full_name: user.full_name, college_id: user.college_id }}
      initialNotifications={notifications}
      nav={[
        {
          href: "/alumni",
          label: "Questions",
          count: questions.filter((q) => q.status === "open").length,
        },
        { href: "/alumni/department", label: "Department" },
        { href: "/onboarding", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
