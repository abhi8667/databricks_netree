import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  FileText,
  Layers,
  MessageCircleQuestion,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge, Empty, Button } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import {
  interestsFromStudent,
  invitationsFromStudent,
  openOpportunities,
  projectsOf,
  questionsFrom,
} from "@/lib/repo";
import { referenceData } from "@/lib/store/reference";
import { relativeTime } from "@/lib/utils";
import { STATUS_COPY } from "@/lib/status";

export default async function StudentDashboard() {
  const user = await requireUser();
  const [projects, invitations, interests, questions, opportunities, reference] =
    await Promise.all([
      projectsOf(user.user_id),
      invitationsFromStudent(user.user_id),
      interestsFromStudent(user.user_id),
      questionsFrom(user.user_id),
      openOpportunities(),
      referenceData(),
    ]);

  const active = projects.filter((p) => p.status !== "archived");
  const answered = questions.filter((q) => q.status === "answered");
  const responded = invitations.filter((i) => i.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      {/* Hero Welcome Box - Opaque & Protected from Background Lines */}
      <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <div className="max-w-2xl">
          <p className="eyebrow">{`${user.department} · ${user.standing}`}</p>
          <h1 className="mt-2 font-read text-3xl leading-tight text-ink dark:text-dark-ink sm:text-4xl">
            Good to see you, {user.full_name.split(" ")[0]}.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mute dark:text-dark-mute">
            Brainstorm a research thesis with AI, find published faculty with proven overlap, or explore open research assistantships.
          </p>
        </div>

        {/* Quick Visual Metrics inside the Hero Box */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule/60 pt-5 dark:border-dark-border/60">
          <div className="flex items-center gap-2 rounded-xl border border-rule/80 bg-forest-50/60 px-3.5 py-1.5 shadow-xs dark:border-dark-border dark:bg-forest-950/40">
            <span className="h-2 w-2 rounded-full bg-forest-500 shadow-glow-sm" />
            <span className="font-mono text-xs text-mute dark:text-dark-mute">Active Ideas:</span>
            <span className="font-mono text-xs font-semibold text-forest-700 dark:text-forest-300">
              {active.length}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-rule/80 bg-emerald-50/60 px-3.5 py-1.5 shadow-xs dark:border-dark-border dark:bg-emerald-950/40">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow-sm" />
            <span className="font-mono text-xs text-mute dark:text-dark-mute">Open Lab Positions:</span>
            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {opportunities.length}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-rule/80 bg-teal-50/60 px-3.5 py-1.5 shadow-xs dark:border-dark-border dark:bg-teal-950/40">
            <span className="h-2 w-2 rounded-full bg-teal-500 shadow-glow-sm" />
            <span className="font-mono text-xs text-mute dark:text-dark-mute">Faculty Replies:</span>
            <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">
              {responded.length}
            </span>
          </div>
        </div>
      </section>

      {/* Primary Action Tiles */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Action
          href="/student/projects/new"
          icon={Sparkles}
          title="Pitch an idea"
          body="Voice-enabled AI ideation to refine your hypothesis and find faculty matches."
        />
        <Action
          href="/student/opportunities"
          icon={Compass}
          title="Open positions"
          body={`${opportunities.length} research opportunities posted across departments.`}
        />
        <Action
          href="/student/ask"
          icon={MessageCircleQuestion}
          title="Ask a mentor"
          body="Direct async questions to faculty and alumni without a full proposal."
        />
      </section>

      {/* Active Projects List Box */}
      <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <div className="flex items-baseline justify-between border-b border-rule/70 pb-4 dark:border-dark-border/70">
          <div>
            <h2 className="font-read text-xl text-ink dark:text-dark-ink">Your research ideas</h2>
            <p className="mt-0.5 text-xs text-mute dark:text-dark-mute">
              Active project drafts and submitted faculty briefs.
            </p>
          </div>
          <Link
            href="/student/projects"
            className="font-mono text-xs font-semibold text-forest-700 transition-colors hover:text-forest-900 dark:text-forest-400 dark:hover:text-forest-300"
          >
            All {projects.length} →
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="mt-6">
            <Empty
              title="No ideas in flight yet."
              action={
                <Button asChild size="sm" variant="emerald" className="mt-2">
                  <Link href="/student/projects/new">Start your first idea</Link>
                </Button>
              }
            >
              An idea only needs a sentence to begin. Talk or type it out, and Netree turns it
              into a polished proposal ready for faculty review.
            </Empty>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {active.slice(0, 4).map((project) => {
              const sent = invitations.filter((i) => i.project_id === project.project_id);
              return (
                <Link
                  key={project.project_id}
                  href={`/student/projects/${project.project_id}`}
                  className="group flex flex-col justify-between gap-3 rounded-2xl border border-rule/80 bg-paper/70 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-500/60 hover:bg-white hover:shadow-soft dark:border-dark-border/80 dark:bg-dark-paper/60 dark:hover:bg-dark-card sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
                      {project.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[13px] text-mute dark:text-dark-mute">
                      {project.brief?.one_liner || "Interview in progress — voice or text"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {sent.length ? (
                      <span className="rounded-md bg-forest-50 px-2 py-0.5 font-mono text-[11px] text-forest-700 dark:bg-forest-950 dark:text-forest-300">
                        {sent.length} sent
                      </span>
                    ) : null}
                    <Badge tone={project.status === "drafting" ? "muted" : "emerald"}>
                      {STATUS_COPY.project[project.status]}
                    </Badge>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-rule/60 text-mute transition-all group-hover:border-forest-500/50 group-hover:bg-forest-50 group-hover:text-forest-700 dark:border-dark-border dark:text-dark-mute dark:group-hover:bg-forest-950 dark:group-hover:text-forest-300">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Replies & Mentorship Updates Box */}
      {responded.length || answered.length || interests.length ? (
        <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
          <div className="border-b border-rule/70 pb-4 dark:border-dark-border/70">
            <h2 className="font-read text-xl text-ink dark:text-dark-ink">Replies waiting</h2>
            <p className="mt-0.5 text-xs text-mute dark:text-dark-mute">
              Feedback from professors and faculty mentors.
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            {responded.slice(0, 4).map((invitation) => (
              <Link
                key={invitation.invitation_id}
                href={`/student/requests/${invitation.invitation_id}`}
                className="group flex flex-col justify-between gap-3 rounded-2xl border border-rule/80 bg-paper/70 p-4 shadow-xs transition-all hover:border-forest-500/50 hover:bg-white dark:border-dark-border/80 dark:bg-dark-paper/60 dark:hover:bg-dark-card sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
                    {invitation.faculty_name} responded to {invitation.project_title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute dark:text-dark-mute">
                    {invitation.feedback || STATUS_COPY.invitation[invitation.status]}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-faint dark:text-dark-faint">
                  {relativeTime(invitation.updated_at)}
                </span>
              </Link>
            ))}
            {answered.slice(0, 2).map((question) => (
              <Link
                key={question.question_id}
                href="/student/ask"
                className="group block rounded-2xl border border-rule/80 bg-paper/70 p-4 shadow-xs transition-all hover:border-forest-500/50 hover:bg-white dark:border-dark-border/80 dark:bg-dark-paper/60 dark:hover:bg-dark-card"
              >
                <p className="text-[14px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
                  {question.answered_by ?? "A mentor"} answered your question on {question.topic}
                </p>
                <p className="mt-1 line-clamp-1 text-[13px] text-mute dark:text-dark-mute">
                  {question.answer}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Educational Department Research Horizon Box */}
      <section className="rounded-3xl border border-forest-500/30 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-forest-500/30 dark:bg-dark-card/95 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-forest-500 shadow-glow-sm" />
          <p className="eyebrow">Department Research Horizon</p>
        </div>
        <p className="mt-3 max-w-2xl font-read text-xl leading-relaxed text-ink dark:text-dark-ink">
          {reference.faculty.length} active researchers across {reference.publications.length}{" "}
          publications.
        </p>
        <p className="mt-2 text-sm text-mute dark:text-dark-mute">
          High publication density across Cloud Infrastructure, Neural Networks, Computer Vision,
          and Embedded Systems. Netree matches your thesis directly against these verified corpora.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Neural Networks", "Distributed Systems", "Computer Vision", "Cybersecurity", "Edge AI"].map(
            (topic) => (
              <span
                key={topic}
                className="rounded-xl border border-forest-500/20 bg-forest-50/60 px-3 py-1 font-mono text-[11px] font-medium text-forest-800 dark:border-forest-500/30 dark:bg-forest-950/60 dark:text-forest-300"
              >
                #{topic}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-6 rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-forest-500/60 hover:shadow-soft dark:border-dark-border/80 dark:bg-dark-card/95"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white dark:bg-forest-950/80 dark:text-forest-300 dark:group-hover:bg-forest-500 dark:group-hover:text-white">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
          {title}
          <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-mute dark:text-dark-mute">{body}</p>
      </div>
    </Link>
  );
}
