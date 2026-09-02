import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { questionsFor } from "@/lib/repo";

export default async function AlumniLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "alumni") redirect("/");
  if (!user.department) redirect("/onboarding");

  const questions = await questionsFor(user.user_id, "alumni");

  return (
    <AppShell
      roleLabel="Alumni"
      user={{ full_name: user.full_name, college_id: user.college_id }}
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
