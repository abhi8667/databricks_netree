import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Linkedin } from "lucide-react";
import { Badge, Ident } from "@/components/ui/primitives";
import { Thread } from "@/components/thread";
import { MeetingPanel } from "@/components/meeting-panel";
import { requireUser, userById } from "@/lib/auth";
import { canAct } from "@/lib/faculty-inbox";
import { getInvitation, getProject, meetingsForInvitation, messagesInThread } from "@/lib/repo";
import { referenceData } from "@/lib/store/reference";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { DecisionPanel } from "./decision-panel";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const invitation = await getInvitation(id);
  if (!invitation) notFound();
  if (!canAct(user, invitation)) redirect("/faculty/proposals");

  const [project, student, messages, meetings, reference] = await Promise.all([
    getProject(invitation.project_id),
    userById(invitation.student_user_id),
    messagesInThread(id),
    meetingsForInvitation(id),
    referenceData(),
  ]);

  // Why this landed here: the match row the student acted on.
  const match =
    project?.match?.matches.find((m) => m.faculty_id === invitation.faculty_id) ?? null;

  const colleagues = reference.faculty
    .filter((f) => f.faculty_id !== user.faculty_id)
    .map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: f.faculty_name,
      designation: f.designation,
      top_topics: f.top_topics,
    }))
    .sort((a, b) => a.faculty_name.localeCompare(b.faculty_name));

  const brief = project?.brief ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <Link
        href="/faculty/proposals"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All proposals
      </Link>

      <header className="mt-5 border-b border-rule pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={invitation.status === "pending" ? "solid" : "outline"}>
            {STATUS_COPY.invitation[invitation.status]}
          </Badge>
          <Ident>{invitation.project_id}</Ident>
          <span className="font-mono text-[11px] text-faint">
            {relativeTime(invitation.created_at)}
          </span>
        </div>
        <h1 className="mt-3 font-read text-3xl leading-tight text-ink">
          {invitation.project_title}
        </h1>
        {brief?.one_liner ? (
          <p className="mt-3 text-[15px] leading-relaxed text-mute">{brief.one_liner}</p>
        ) : null}
      </header>

      {student ? (
        <section className="border-b border-rule py-6">
          <p className="eyebrow">Who is asking</p>
          <p className="mt-2 text-[16px] text-ink">
            {student.full_name} · {student.standing}
          </p>
          <p className="mt-1 font-mono text-[11px] text-faint">
            {student.college_id}
            {student.email ? ` · ${student.email}` : ""}
          </p>
          {student.bio ? (
            <p className="mt-3 text-[14px] leading-relaxed text-mute">{student.bio}</p>
          ) : null}
          {student.interests.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {student.interests.map((interest) => (
                <Badge key={interest} className="normal-case tracking-normal">
                  {interest}
                </Badge>
              ))}
            </div>
          ) : null}
          {student.achievements ? (
            <div className="mt-4">
              <p className="eyebrow">Achievements</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-mute">
                {student.achievements}
              </p>
            </div>
          ) : null}
          {student.resume_name ? (
            <p className="mt-3 font-mono text-[11px] text-faint">
              Résumé on file: {student.resume_name}
            </p>
          ) : null}
          {student.linkedin_url || student.scholar_url ? (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {student.linkedin_url ? (
                <a
                  href={student.linkedin_url.startsWith("http") ? student.linkedin_url : `https://${student.linkedin_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-white px-2.5 py-1 text-[12px] font-medium text-ink transition-colors hover:border-forest-500 hover:text-forest-700 hover:bg-forest-50/40"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                  <span>LinkedIn</span>
                  <ExternalLink className="h-3 w-3 text-faint" />
                </a>
              ) : null}
              {student.scholar_url ? (
                <a
                  href={student.scholar_url.startsWith("http") ? student.scholar_url : `https://${student.scholar_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-white px-2.5 py-1 text-[12px] font-medium text-ink transition-colors hover:border-forest-500 hover:text-forest-700 hover:bg-forest-50/40"
                >
                  <span>Google Scholar</span>
                  <ExternalLink className="h-3 w-3 text-faint" />
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {match ? (
        <section className="border-b border-rule py-6">
          <p className="eyebrow">Why this reached you</p>
          <p className="mt-2 font-read text-[16px] leading-relaxed text-ink">{match.rationale}</p>
          <p className="mt-2 font-mono text-[11px] text-mute">
            {match.depth} matching papers · {match.breadth} overlapping topics ·{" "}
            {Math.round(match.closeness * 100)}% closeness on the strongest
          </p>
          <ul className="mt-4 space-y-2">
            {match.evidence.map((paper) => (
              <li key={paper.publication_id} className="flex items-start gap-3">
                <span className="mt-0.5 w-8 shrink-0 font-mono text-[11px] tabular-nums text-faint">
                  {paper.year}
                </span>
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14px] leading-snug text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
                >
                  {paper.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 text-faint" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-b border-rule py-6">
        <p className="eyebrow">Their message</p>
        <p className="mt-3 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink">
          {invitation.pitch}
        </p>
      </section>

      {brief ? (
        <section className="border-b border-rule py-6">
          <p className="eyebrow">The brief</p>
          <dl className="mt-3 space-y-4">
            {brief.problem ? <Row label="Problem">{brief.problem}</Row> : null}
            {brief.approach ? <Row label="Approach">{brief.approach}</Row> : null}
            {brief.skills_needed.length ? (
              <Row label="What they want from you">{brief.skills_needed.join(", ")}</Row>
            ) : null}
            {brief.timeline ? <Row label="Timeline">{brief.timeline}</Row> : null}
            {brief.open_questions.length ? (
              <Row label="Still undecided">{brief.open_questions.join(" · ")}</Row>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="border-b border-rule py-6">
        <h2 className="font-read text-xl text-ink">Your decision</h2>
        <div className="mt-5">
          <DecisionPanel invitation={invitation} colleagues={colleagues} />
        </div>
      </section>

      <section className="border-b border-rule py-6">
        <h2 className="font-read text-xl text-ink">Meeting</h2>
        <div className="mt-5">
          <MeetingPanel
            invitationId={id}
            meetings={meetings}
            canPropose={false}
            canDecide={invitation.status !== "declined"}
            projectTitle={invitation.project_title}
            facultyName={user.full_name}
          />
        </div>
      </section>

      <section className="py-6">
        <h2 className="font-read text-xl text-ink">Ask the student</h2>
        <p className="mt-1.5 text-[14px] text-mute">
          Clarify before you decide. They see this immediately.
        </p>
        <div className="mt-5">
          <Thread
            threadId={id}
            messages={messages}
            meId={user.user_id}
            placeholder="Which dataset are you planning to use?"
          />
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
