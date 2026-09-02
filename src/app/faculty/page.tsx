import Link from "next/link";
import { ArrowUpRight, FilePlus2, Inbox, MessageCircleQuestion, Sparkles } from "lucide-react";
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
        title={
          pending.length
            ? `${pending.length} proposal${pending.length === 1 ? "" : "s"} waiting`
            : "Review & Research Command"
        }
        description={
          pending.length
            ? "Each proposal arrived because the student's research thesis algorithmically overlaps your published papers."
            : "When a student pitches an idea overlapping your publication index, their proposal lands here."
        }
        actions={
          <Button asChild size="sm" variant="emerald">
            <Link href="/faculty/positions/new">
              <FilePlus2 className="h-4 w-4" />
              Post a position
            </Link>
          </Button>
        }
      />

      {/* Metrics Row */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Tile
          href="/faculty/proposals"
          icon={Inbox}
          value={pending.length}
          label="Proposals to review"
          color="forest"
        />
        <Tile
          href="/faculty/positions"
          icon={FilePlus2}
          value={waitingApplicants.length}
          label="Applicants to decide"
          color="emerald"
        />
        <Tile
          href="/faculty/questions"
          icon={MessageCircleQuestion}
          value={openQuestions.length}
          label="Questions unanswered"
          color="teal"
        />
      </section>

      {/* Proposals Stream */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between border-b border-rule pb-3 dark:border-dark-border">
          <h2 className="font-read text-xl text-ink dark:text-dark-ink">Active Proposals</h2>
          <Link
            href="/faculty/proposals"
            className="font-mono text-xs text-forest-700 transition-colors hover:text-forest-900 dark:text-forest-400 dark:hover:text-forest-300"
          >
            All {inbox.length} →
          </Link>
        </div>

        {inbox.length === 0 ? (
          <div className="mt-5">
            <Empty title="No proposals waiting.">
              {user.faculty_id
                ? "Students reach you through algorithmic overlap between their thesis and your indexed papers."
                : "Your account is not linked to a publication record yet. Link it from your profile to activate student matching."}
            </Empty>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {inbox.slice(0, 5).map((invitation) => (
              <Link
                key={invitation.invitation_id}
                href={`/faculty/proposals/${invitation.invitation_id}`}
                className="group flex flex-col justify-between gap-3 rounded-xl border border-rule bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-500/60 hover:shadow-soft dark:border-dark-border dark:bg-dark-card sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink transition-colors group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-forest-400">
                    {invitation.project_title}
                  </p>
                  <p className="mt-1 text-[13px] text-mute dark:text-dark-mute">
                    Student: <span className="font-medium text-ink dark:text-dark-ink">{invitation.student_name}</span>
                    {invitation.redirected_to_faculty_id ? " · redirected by colleague" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] text-faint dark:text-dark-faint">
                    {relativeTime(invitation.created_at)}
                  </span>
                  <Badge tone={invitation.status === "pending" ? "solid" : "emerald"}>
                    {STATUS_COPY.invitation[invitation.status]}
                  </Badge>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-rule/60 text-mute transition-all group-hover:border-forest-500/50 group-hover:bg-forest-50 group-hover:text-forest-700 dark:border-dark-border dark:text-dark-mute dark:group-hover:bg-forest-950 dark:group-hover:text-forest-300">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Publications & Indexed Topics */}
      {topics.length ? (
        <section className="mt-12 grid gap-8 rounded-2xl border border-rule bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-dark-border dark:bg-dark-card/70 sm:grid-cols-2 sm:p-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-forest-500 shadow-glow-sm" />
              <p className="eyebrow">Publication Index & Topic Weights</p>
            </div>
            <div className="mt-5 space-y-3.5">
              {topics.slice(0, 6).map((topic) => (
                <Meter
                  key={topic.topic}
                  value={topic.n_papers}
                  max={maxTopic}
                  label={`${topic.topic} (${topic.latest_year})`}
                />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-mute dark:text-dark-mute">
              Calculated from your verified scholarly papers. Incoming student ideas are vector-matched
              against these topic clusters.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-forest-600 dark:text-forest-400" />
              <p className="eyebrow">Recent Publications</p>
            </div>
            <ul className="mt-5 space-y-3">
              {recent.map((paper) => (
                <li
                  key={paper.publication_id}
                  className="rounded-xl border border-rule/60 bg-paper/50 p-3 transition-colors hover:border-forest-500/40 dark:border-dark-border/60 dark:bg-dark-surface/40"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="rounded bg-forest-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-forest-700 dark:bg-forest-950 dark:text-forest-300">
                      {paper.publication_year}
                    </span>
                    <a
                      href={paper.publication_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium leading-snug text-ink transition-colors hover:text-forest-700 dark:text-dark-ink dark:hover:text-forest-400"
                    >
                      {paper.title}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Laboratory & Research Positions */}
      {positions.length ? (
        <section className="mt-12">
          <h2 className="border-b border-rule pb-3 font-read text-xl text-ink dark:border-dark-border dark:text-dark-ink">
            Your open positions
          </h2>
          <div className="mt-4 grid gap-3">
            {positions.map((position) => {
              const applicants = interests.filter(
                (i) => i.opportunity_id === position.opportunity_id,
              );
              return (
                <div
                  key={position.opportunity_id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-rule bg-white p-4 shadow-xs dark:border-dark-border dark:bg-dark-card sm:flex-row sm:items-center"
                >
                  <Link
                    href="/faculty/positions"
                    className="min-w-0 truncate text-[15px] font-medium text-ink transition-colors hover:text-forest-700 dark:text-dark-ink dark:hover:text-forest-400"
                  >
                    {position.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[11px] text-faint dark:text-dark-faint">
                    {applicants.length} applied · {STATUS_COPY.opportunity[position.status]}
                  </span>
                </div>
              );
            })}
          </div>
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
  color,
}: {
  href: string;
  icon: React.ElementType;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-4 rounded-2xl border border-rule bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-forest-500/60 hover:shadow-soft dark:border-dark-border dark:bg-dark-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-600 group-hover:text-white dark:bg-forest-950/80 dark:text-forest-300 dark:group-hover:bg-forest-500 dark:group-hover:text-white">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-mute opacity-0 transition-all group-hover:opacity-100 group-hover:text-forest-700 dark:group-hover:text-forest-400" />
      </div>
      <div>
        <p className="font-mono text-3xl font-semibold tabular-nums leading-none text-ink dark:text-dark-ink">
          {value}
        </p>
        <p className="eyebrow mt-2">{label}</p>
      </div>
    </Link>
  );
}
