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

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
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
        <div className="flex items-baseline justify-between border-b border-rule pb-3">
          <h2 className="font-read text-xl text-ink">Your ideas</h2>
          <Link href="/student/projects" className="eyebrow hover:text-ink">
            All {projects.length}
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="mt-5">
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
          <ul className="mt-2 divide-y divide-rule">
            {active.slice(0, 4).map((project) => {
              const sent = invitations.filter((i) => i.project_id === project.project_id);
              return (
                <li key={project.project_id}>
                  <Link
                    href={`/student/projects/${project.project_id}`}
                    className="group flex items-start justify-between gap-6 py-4 transition-colors hover:bg-fill"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] text-ink">{project.title}</p>
                      <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                        {project.brief?.one_liner || "Interview in progress"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {sent.length ? (
                        <span className="font-mono text-[11px] text-mute">
                          {sent.length} sent
                        </span>
                      ) : null}
                      <Badge tone={project.status === "drafting" ? "muted" : "default"}>
                        {STATUS_COPY.project[project.status]}
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {responded.length || answered.length || interests.length ? (
        <section className="mt-14">
          <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">Replies waiting</h2>
          <ul className="mt-2 divide-y divide-rule">
            {responded.slice(0, 5).map((invitation) => (
              <li key={invitation.invitation_id} className="py-4">
                <Link
                  href={`/student/requests/${invitation.invitation_id}`}
                  className="group flex items-start justify-between gap-6"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] text-ink">
                      {invitation.faculty_name} responded to {invitation.project_title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                      {invitation.feedback || STATUS_COPY.invitation[invitation.status]}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    {relativeTime(invitation.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
            {answered.slice(0, 3).map((question) => (
              <li key={question.question_id} className="py-4">
                <Link href="/student/ask" className="block">
                  <p className="text-[15px] text-ink">
                    {question.answered_by ?? "A mentor"} answered your question on {question.topic}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute">{question.answer}</p>
                </Link>
              </li>
            ))}
            {interests.slice(0, 3).map((interest) => (
              <li key={interest.interest_id} className="flex items-center justify-between gap-6 py-4">
                <p className="min-w-0 truncate text-[15px] text-ink">{interest.opportunity_title}</p>
                <Badge tone={interest.status === "accepted" ? "solid" : "default"}>
                  {STATUS_COPY.interest[interest.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 border-t border-rule pt-8">
        <p className="eyebrow">What the department actually publishes</p>
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
      className="invert-card group flex flex-col justify-between gap-8 rounded-lg border border-rule bg-white p-5"
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <div>
        <p className="flex items-center gap-1.5 text-[15px] font-medium">
          {title}
          <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </p>
        <p className="mt-1.5 min-h-[2.6em] text-[13px] leading-relaxed text-mute transition-colors group-hover:text-white/60">
          {body}
        </p>
      </div>
    </Link>
  );
}
