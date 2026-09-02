import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProject, invitationsForProject } from "@/lib/repo";
import { getRankedEventsForProject } from "@/lib/events/service";
import { Workspace } from "./workspace";

/**
 * Matching runs Genie, the vector search and a Gemini pass before it writes the
 * report - tens of seconds on a cold warehouse. The server action is capped by
 * this page's budget, and the platform default cuts it off mid-run.
 */
export const maxDuration = 60;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  if (!project) notFound();
  if (project.owner_user_id !== user.user_id) redirect("/student/projects");

  const [invitations, events] = await Promise.all([
    invitationsForProject(id),
    getRankedEventsForProject(project, user),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <Link
        href="/student/projects"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All ideas
      </Link>
      <Workspace project={project} invitations={invitations} events={events} />
    </div>
  );
}
