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
        eyebrow="Ideas"
        title="Everything you have pitched"
        description="Each one keeps its interview, its brief and the faculty search that came out of it."
        actions={
          <Button asChild size="sm">
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
              <Button asChild size="sm" className="mt-1">
                <Link href="/student/projects/new">Start one</Link>
              </Button>
            }
          >
            You do not need a finished plan. A sentence is enough to begin.
          </Empty>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-rule">
          {projects.map((project) => {
            const sent = invitations.filter((i) => i.project_id === project.project_id);
            const matched = project.match?.matches.length ?? 0;
            return (
              <li key={project.project_id}>
                <Link
                  href={`/student/projects/${project.project_id}`}
                  className="group grid gap-3 py-5 transition-colors hover:bg-fill sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Badge tone={project.status === "drafting" ? "muted" : "default"}>
                        {STATUS_COPY.project[project.status]}
                      </Badge>
                      <Ident>{project.project_id}</Ident>
                    </div>
                    <p className="mt-2 truncate text-[16px] text-ink">{project.title}</p>
                    <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                      {project.brief?.one_liner || "Interview still open"}
                    </p>
                  </div>
                  <div className="flex items-center gap-5 sm:justify-end">
                    <span className="font-mono text-[11px] text-faint">
                      {matched ? `${matched} matches` : "not matched"}
                      {sent.length ? ` · ${sent.length} sent` : ""}
                    </span>
                    <span className="font-mono text-[11px] text-faint">
                      {relativeTime(project.updated_at)}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
