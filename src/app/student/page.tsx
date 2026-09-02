import Link from "next/link";
import { ArrowUpRight, Compass, MessageCircleQuestion, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
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
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow={`${user.department} · ${user.standing}`}
        title={`Good to see you, ${user.full_name.split(" ")[0]}.`}
        description="Start with an idea and Netree finds the faculty already publishing near it, or go straight to the positions they have opened."
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Action
          href="/student/projects/new"
          icon={Sparkles}
          title="Pitch an idea"
          body="Talk it through, get a brief, see who works on it."
        />
        <Action
          href="/student/opportunities"
          icon={Compass}
          title="Open positions"
          body={`${opportunities.length} posted by faculty right now.`}
        />
        <Action
          href="/student/ask"
          icon={MessageCircleQuestion}
          title="Ask a mentor"
          body="One question to alumni or faculty. No proposal needed."
        />
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between pb-3">
          <div>
            <h2 className="font-read text-xl text-ink">Your ideas</h2>
            <p className="mt-0.5 text-xs text-mute">Active project briefs and faculty matching in flight.</p>
          </div>
          <Link href="/student/projects" className="eyebrow text-forest-700 hover:text-ink">
            All {projects.length} →
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="mt-4">
            <Empty
              title="Nothing in flight yet."
              action={
                <Button asChild size="sm" className="mt-1">
                  <Link href="/student/projects/new">Start your first idea</Link>
                </Button>
              }
            >
              An idea only needs a sentence to start. The interview turns it into something a
              professor can judge in thirty seconds.
            </Empty>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {active.slice(0, 4).map((project) => {
              const sent = invitations.filter((i) => i.project_id === project.project_id);
              return (
                <Link
                  key={project.project_id}
                  href={`/student/projects/${project.project_id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rule/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-forest-500/50 hover:shadow-md hover:shadow-forest-950/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={project.status === "drafting" ? "muted" : "default"}>
                        {STATUS_COPY.project[project.status]}
                      </Badge>
                      {sent.length ? (
                        <span className="font-mono text-[11px] text-forest-800 bg-forest-50 border border-forest-200/80 px-2 py-0.5 rounded-full">
                          {sent.length} sent
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-[16px] font-medium text-ink group-hover:text-forest-800 transition-colors">
                      {project.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                      {project.brief?.one_liner || "Interview in progress"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                    <span className="font-mono text-[11px] text-faint">
                      {relativeTime(project.updated_at)}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {responded.length || answered.length || interests.length ? (
        <section className="mt-14">
          <h2 className="pb-3 font-read text-xl text-ink">Replies waiting</h2>
          <div className="mt-3 space-y-3">
            {responded.slice(0, 5).map((invitation) => (
              <Link
                key={invitation.invitation_id}
                href={`/student/requests/${invitation.invitation_id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rule/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-forest-500/50 hover:shadow-md hover:shadow-forest-950/5"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink group-hover:text-forest-800 transition-colors">
                    {invitation.faculty_name} responded to {invitation.project_title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                    {invitation.feedback || STATUS_COPY.invitation[invitation.status]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  <span className="font-mono text-[11px] text-faint">
                    {relativeTime(invitation.updated_at)}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
            {answered.slice(0, 3).map((question) => (
              <Link
                key={question.question_id}
                href="/student/ask"
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rule/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-forest-500/50 hover:shadow-md hover:shadow-forest-950/5"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink group-hover:text-forest-800 transition-colors">
                    {question.answered_by ?? "A mentor"} answered your question on {question.topic}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute">{question.answer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
            {interests.slice(0, 3).map((interest) => (
              <div
                key={interest.interest_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-rule/80 bg-white p-4 sm:p-5 shadow-xs"
              >
                <p className="min-w-0 truncate text-[15px] font-medium text-ink">{interest.opportunity_title}</p>
                <Badge tone={interest.status === "accepted" ? "solid" : "default"}>
                  {STATUS_COPY.interest[interest.status]}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
          <p className="eyebrow text-forest-800">What the department actually publishes</p>
        </div>
        <p className="mt-3 max-w-2xl font-read text-lg leading-relaxed text-ink">
          {reference.faculty.length} faculty, {reference.publications.length} publications, clustered
          hard around cloud, security, vision and neural networks. If your idea sits outside that,
          Netree will tell you plainly instead of inventing a match.
        </p>
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
      className="group flex flex-col justify-between gap-6 rounded-xl border border-rule/80 bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-forest-500/50 hover:shadow-md hover:shadow-forest-950/5 hover:-translate-y-0.5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white">
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink group-hover:text-forest-800 transition-colors">
          {title}
          <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </p>
        <p className="mt-1.5 min-h-[2.6em] text-[13px] leading-relaxed text-mute">
          {body}
        </p>
      </div>
    </Link>
  );
}
