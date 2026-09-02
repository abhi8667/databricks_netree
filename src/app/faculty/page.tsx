import Link from "next/link";
import { ArrowUpRight, FilePlus2, Inbox, MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Button, Empty, Meter } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { inboxFor } from "@/lib/faculty-inbox";
import { interestsForOwner, opportunitiesOf, questionsFor } from "@/lib/repo";
import { publicationsFor, topicsFor } from "@/lib/store/reference";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export default async function FacultyDashboard() {
  const user = await requireUser();
  const [inbox, positions, interests, questions] = await Promise.all([
    inboxFor(user),
    opportunitiesOf(user.user_id),
    interestsForOwner(user.user_id),
    questionsFor(user.user_id, "teacher"),
  ]);

  const [topics, recent] = user.faculty_id
    ? await Promise.all([topicsFor(user.faculty_id), publicationsFor(user.faculty_id, 4)])
    : [[], []];

  const pending = inbox.filter((i) => i.status === "pending");
  const waitingApplicants = interests.filter((i) => i.status === "pending");
  const openQuestions = questions.filter((q) => q.status === "open");
  const maxTopic = Math.max(1, ...topics.map((t) => t.n_papers));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow={`${user.standing} · ${user.department}`}
        title={`${pending.length ? `${pending.length} proposal${pending.length === 1 ? "" : "s"} waiting` : "Nothing waiting on you"}`}
        description={
          pending.length
            ? "Each one arrived because its brief overlaps work you have published. The evidence is on the proposal."
            : "When a student's idea overlaps your published work, their proposal lands here."
        }
        actions={
          <Button asChild size="sm">
            <Link href="/faculty/positions/new">
              <FilePlus2 className="h-4 w-4" />
              Post a position
            </Link>
          </Button>
        }
      />

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Tile
          href="/faculty/proposals"
          icon={Inbox}
          value={pending.length}
          label="Proposals to review"
        />
        <Tile
          href="/faculty/positions"
          icon={FilePlus2}
          value={waitingApplicants.length}
          label="Applicants to decide"
        />
        <Tile
          href="/faculty/questions"
          icon={MessageCircleQuestion}
          value={openQuestions.length}
          label="Questions unanswered"
        />
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between border-b border-rule pb-3">
          <h2 className="font-read text-xl text-ink">Proposals</h2>
          <Link href="/faculty/proposals" className="eyebrow hover:text-ink">
            All {inbox.length}
          </Link>
        </div>

        {inbox.length === 0 ? (
          <div className="mt-5">
            <Empty title="No proposals yet.">
              {user.faculty_id
                ? "Students reach you through the overlap between their idea and your papers."
                : "Your account is not linked to a publication record yet, so the matcher cannot route students to you. Link it from your profile."}
            </Empty>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {inbox.slice(0, 5).map((invitation) => (
              <li key={invitation.invitation_id}>
                <Link
                  href={`/faculty/proposals/${invitation.invitation_id}`}
                  className="group flex items-start justify-between gap-6 py-4 transition-colors hover:bg-fill"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-ink">{invitation.project_title}</p>
                    <p className="mt-1 text-[13px] text-mute">
                      {invitation.student_name}
                      {invitation.redirected_to_faculty_id ? " · redirected to you" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[11px] text-faint">
                      {relativeTime(invitation.created_at)}
                    </span>
                    <Badge tone={invitation.status === "pending" ? "solid" : "default"}>
                      {STATUS_COPY.invitation[invitation.status]}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {topics.length ? (
        <section className="mt-14 grid gap-10 border-t border-rule pt-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow">What the index says you work on</p>
            <div className="mt-4 space-y-3">
              {topics.slice(0, 6).map((topic) => (
                <Meter
                  key={topic.topic}
                  value={topic.n_papers}
                  max={maxTopic}
                  label={`${topic.topic} · to ${topic.latest_year}`}
                />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-mute">
              Drawn from your publication record, not from anything you typed. This is what students
              are matched against.
            </p>
          </div>
          <div>
            <p className="eyebrow">Most recent publications</p>
            <ul className="mt-4 space-y-3">
              {recent.map((paper) => (
                <li key={paper.publication_id} className="flex gap-3">
                  <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-faint">
                    {paper.publication_year}
                  </span>
                  <a
                    href={paper.publication_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] leading-snug text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
                  >
                    {paper.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {positions.length ? (
        <section className="mt-14">
          <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">Your positions</h2>
          <ul className="mt-2 divide-y divide-rule">
            {positions.map((position) => {
              const applicants = interests.filter(
                (i) => i.opportunity_id === position.opportunity_id,
              );
              return (
                <li
                  key={position.opportunity_id}
                  className="flex items-center justify-between gap-6 py-4"
                >
                  <Link href="/faculty/positions" className="min-w-0 truncate text-[15px] text-ink">
                    {position.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    {applicants.length} applied · {STATUS_COPY.opportunity[position.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  value,
  label,
}: {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
}) {
  return (
    <Link href={href} className="invert-card rounded-lg border border-rule bg-white p-5">
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <p className="mt-8 font-mono text-3xl tabular-nums leading-none">{value}</p>
      <p className="eyebrow mt-2">{label}</p>
    </Link>
  );
}
