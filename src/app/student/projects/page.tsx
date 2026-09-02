import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Button, Empty, Ident } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { invitationsFromStudent, projectsOf } from "@/lib/repo";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, invitations] = await Promise.all([
    projectsOf(user.user_id),
    invitationsFromStudent(user.user_id),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Research Ideation"
        title="Everything you have pitched"
        description="Each project retains its conversational interview, structured brief, and algorithmic faculty matching."
        actions={
          <Button asChild size="sm" variant="emerald">
            <Link href="/student/projects/new">
              <Plus className="h-4 w-4" />
              New idea
            </Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <div className="mt-8">
          <Empty
            title="No ideas yet."
            action={
              <Button asChild size="sm" variant="emerald" className="mt-1">
                <Link href="/student/projects/new">Start one</Link>
              </Button>
            }
          >
            You do not need a finished plan. A sentence or spoken thought is enough to begin.
          </Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {projects.map((project) => {
            const sent = invitations.filter((i) => i.project_id === project.project_id);
            const matched = project.match?.matches.length ?? 0;
            return (
              <Link
                key={project.project_id}
                href={`/student/projects/${project.project_id}`}
                className="group flex flex-col justify-between gap-3 rounded-2xl border border-rule bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-500/60 hover:shadow-soft dark:border-dark-border dark:bg-dark-card sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <Badge tone={project.status === "drafting" ? "muted" : "emerald"}>
                      {STATUS_COPY.project[project.status]}
                    </Badge>
                    <Ident>{project.project_id}</Ident>
                  </div>
                  <p className="mt-2 truncate text-[16px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
                    {project.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute dark:text-dark-mute">
                    {project.brief?.one_liner || "Interview in progress"}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:justify-end">
                  <span className="rounded-md bg-forest-50 px-2 py-0.5 font-mono text-[11px] text-forest-700 dark:bg-forest-950 dark:text-forest-300">
                    {matched ? `${matched} matches` : "in ideation"}
                    {sent.length ? ` · ${sent.length} sent` : ""}
                  </span>
                  <span className="font-mono text-[11px] text-faint dark:text-dark-faint">
                    {relativeTime(project.updated_at)}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-rule/60 text-mute transition-all group-hover:border-forest-500/50 group-hover:bg-forest-50 group-hover:text-forest-700 dark:border-dark-border dark:text-dark-mute dark:group-hover:bg-forest-950 dark:group-hover:text-forest-300">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
