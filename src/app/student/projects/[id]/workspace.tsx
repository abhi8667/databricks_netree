"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Loader2,
  Pencil,
  Radar,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge, Button, Field, Ident, Input, Meter, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { OverlapField } from "@/components/overlap-field";
import { ProjectEventsBlock } from "@/components/project-events-block";
import {
  generatePitch,
  replyToIdea,
  runMatching,
  saveBrief,
  sendInvitation,
} from "@/app/actions/projects";
import { STATUS_COPY } from "@/lib/status";
import type { FacultyMatch, Invitation, Project, ProjectBrief } from "@/lib/types";
import type { EventMatch } from "@/lib/event-types";
import { cn } from "@/lib/utils";

/**
 * A project moves through three stages, and unlike most numbered UI this one
 * really is a sequence: you cannot match against a brief that does not exist.
 * So the stages are numbered, and a stage you have not reached stays shut.
 */
const STAGES = ["Interview", "Brief", "Faculty"] as const;

export function Workspace({
  project,
  invitations,
  events,
}: {
  project: Project;
  invitations: Invitation[];
  events?: EventMatch[];
}) {
  const stage = project.match?.matches.length ? 2 : project.brief ? 1 : 0;

  return (
    <div className="stagger">
      <header className="mt-5 border-b border-rule pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={project.status === "drafting" ? "muted" : "outline"}>
            {STATUS_COPY.project[project.status]}
          </Badge>
          <Ident>{project.project_id}</Ident>
        </div>
        <h1 className="mt-3 font-read text-3xl leading-tight text-ink sm:text-4xl">
          {project.title}
        </h1>
        {project.brief?.one_liner ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute">
            {project.brief.one_liner}
          </p>
        ) : null}

        <ol className="mt-6 flex items-center gap-6">
          {STAGES.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]",
                  index <= stage ? "border-ink bg-ink text-paper" : "border-rule text-faint",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.12em]",
                  index <= stage ? "text-ink" : "text-faint",
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <Interview project={project} />
      {project.brief ? <BriefEditor project={project} brief={project.brief} /> : null}
      {project.brief ? <Matches project={project} invitations={invitations} /> : null}
      {project.brief && events && events.length > 0 ? (
        <ProjectEventsBlock events={events} />
      ) : null}
    </div>
  );
}

/* ------------------------------- Interview ----------------------------- */

function Interview({ project }: { project: Project }) {
  const router = useRouter();
  const [answer, setAnswer] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [expanded, setExpanded] = React.useState(!project.brief);

  const lastQuestion =
    [...project.transcript].reverse().find((t) => t.role === "assistant")?.content ?? "";
  const answered = project.transcript.filter((t) => t.role === "user");
  const done = Boolean(project.brief);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await replyToIdea(project.project_id, answer);
      if (result?.error) setError(result.error);
      else {
        setAnswer("");
        router.refresh();
      }
    });
  };

  return (
    <section className="border-b border-rule py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-read text-xl text-ink">The interview</h2>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          {expanded ? "Collapse" : `${answered.length} answers`}
        </button>
      </div>

      {expanded ? (
        <ol className="mt-6 space-y-6">
          {project.transcript.map((turn, i) =>
            turn.role === "assistant" ? (
              <li key={i} className="border-l-2 border-ink pl-4">
                <p className="eyebrow">Netree asks</p>
                <p className="mt-1.5 font-read text-lg leading-snug text-ink">{turn.content}</p>
              </li>
            ) : (
              <li key={i} className="pl-4">
                <p className="eyebrow">You</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-mute">{turn.content}</p>
              </li>
            ),
          )}
        </ol>
      ) : null}

      {!done ? (
        <div className="mt-7 rounded-lg border border-ink bg-white p-5">
          <p className="font-read text-lg leading-snug text-ink">{lastQuestion}</p>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            autoFocus
            placeholder="Answer in your own words."
            className="mt-4"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-faint">
              {answered.length} of about 5 answered
            </span>
            <Button size="sm" onClick={submit} disabled={pending || !answer.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Thinking" : "Send"}
            </Button>
          </div>
          {error ? <p className="mt-3 text-[13px] text-ink">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------- Brief ------------------------------- */

function BriefEditor({ project, brief }: { project: Project; brief: ProjectBrief }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ProjectBrief>(brief);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setDraft(brief), [brief]);

  const save = () => {
    startTransition(async () => {
      await saveBrief(project.project_id, draft);
      setEditing(false);
      router.refresh();
    });
  };

  const list = (key: keyof ProjectBrief) => (draft[key] as string[]) ?? [];
  const setList = (key: keyof ProjectBrief, value: string) =>
    setDraft({ ...draft, [key]: value.split(",").map((s) => s.trim()).filter(Boolean) });

  return (
    <section className="border-b border-rule py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-read text-xl text-ink">The brief</h2>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-6 space-y-5">
          <Field label="Title">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="One line">
            <Input
              value={draft.one_liner}
              onChange={(e) => setDraft({ ...draft, one_liner: e.target.value })}
            />
          </Field>
          <Field label="Problem">
            <Textarea
              rows={3}
              value={draft.problem}
              onChange={(e) => setDraft({ ...draft, problem: e.target.value })}
            />
          </Field>
          <Field label="Approach">
            <Textarea
              rows={3}
              value={draft.approach}
              onChange={(e) => setDraft({ ...draft, approach: e.target.value })}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Research areas" hint="Comma separated. These drive the search.">
              <Input
                value={list("domain_tags").join(", ")}
                onChange={(e) => setList("domain_tags", e.target.value)}
              />
            </Field>
            <Field label="Help needed" hint="Comma separated.">
              <Input
                value={list("skills_needed").join(", ")}
                onChange={(e) => setList("skills_needed", e.target.value)}
              />
            </Field>
            <Field label="Deliverables">
              <Input
                value={list("deliverables").join(", ")}
                onChange={(e) => setList("deliverables", e.target.value)}
              />
            </Field>
            <Field label="Timeline">
              <Input
                value={draft.timeline}
                onChange={(e) => setDraft({ ...draft, timeline: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {brief.problem ? <Para label="Problem">{brief.problem}</Para> : null}
            {brief.approach ? <Para label="Approach">{brief.approach}</Para> : null}
            {brief.open_questions.length ? (
              <div>
                <p className="eyebrow">Still undecided</p>
                <ul className="mt-2 space-y-1">
                  {brief.open_questions.map((q) => (
                    <li key={q} className="flex gap-2 text-[14px] leading-relaxed text-mute">
                      <span className="mt-2.5 h-px w-3 shrink-0 bg-rule" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <dl className="space-y-4">
            <Chips label="Research areas" values={brief.domain_tags} solid />
            <Chips label="Help needed" values={brief.skills_needed} />
            <Chips label="Deliverables" values={brief.deliverables} />
            {brief.timeline ? (
              <div>
                <dt className="eyebrow">Timeline</dt>
                <dd className="mt-1.5 text-[14px] text-ink">{brief.timeline}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
    </section>
  );
}

function Para({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-read text-[17px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Chips({ label, values, solid }: { label: string; values: string[]; solid?: boolean }) {
  if (!values.length) return null;
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} tone={solid ? "outline" : "default"} className="normal-case tracking-normal">
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Matches ------------------------------ */

function Matches({ project, invitations }: { project: Project; invitations: Invitation[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<string | null>(null);
  const report = project.match;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await runMatching(project.project_id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-read text-xl text-ink">Faculty overlap</h2>
        <Button size="sm" variant={report ? "quiet" : "solid"} onClick={run} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          {pending ? "Searching the corpus" : report ? "Run again" : "Find faculty"}
        </Button>
      </div>

      {error ? <p className="mt-4 text-[13px] text-ink">{error}</p> : null}

      {!report ? (
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
          Netree compares your brief against every publication in the department index and ranks
          people by how much of their published work actually overlaps it.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {report.method.map((m) => (
              <Badge key={m} tone="muted" className="normal-case tracking-normal">
                {m}
              </Badge>
            ))}
          </div>

          <p
            className={cn(
              "border-l-2 py-1 pl-4 text-[15px] leading-relaxed",
              report.weak_field ? "border-ink text-ink" : "border-rule text-mute",
            )}
          >
            {report.note}
          </p>

          {report.genie_answer ? (
            <details className="rulebox group px-4 py-3">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink">
                What Genie said
              </summary>
              <p className="mt-3 font-read text-[15px] leading-relaxed text-ink">
                {report.genie_answer}
              </p>
              {report.genie_sql ? (
                <pre className="mt-3 overflow-x-auto border-t border-rule pt-3 font-mono text-[11px] leading-relaxed text-mute">
                  {report.genie_sql}
                </pre>
              ) : null}
            </details>
          ) : null}

          {report.matches.length ? (
            <>
              <OverlapField matches={report.matches} activeId={active} onHover={setActive} />
              <ul className="space-y-3">
                {report.matches.map((match) => (
                  <MatchCard
                    key={match.faculty_id}
                    match={match}
                    project={project}
                    invitation={invitations.find((i) => i.faculty_id === match.faculty_id) ?? null}
                    hovered={active === match.faculty_id}
                    onHover={setActive}
                  />
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[15px] text-mute">
              No publication in the index overlaps this brief. Widen the research areas in the brief
              and run it again, or ask a mentor a direct question instead.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function MatchCard({
  match,
  project,
  invitation,
  hovered,
  onHover,
}: {
  match: FacultyMatch;
  project: Project;
  invitation: Invitation | null;
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const maxTopic = Math.max(1, ...match.overlap_topics.map((t) => t.n_papers));

  return (
    <li
      onMouseEnter={() => onHover(match.faculty_id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "rounded-lg border bg-white p-5 transition-colors",
        hovered ? "border-ink" : "border-rule",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-medium text-ink">{match.faculty_name}</h3>
            {match.profile_status === "incomplete" ? (
              <Badge tone="muted">Profile incomplete</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-mute">
            {match.designation} · {match.department}
          </p>
          <Ident className="mt-1 block">{match.faculty_id}</Ident>
        </div>

        <div className="flex items-center gap-6 text-right">
          <Figure value={match.depth} label="Papers" />
          <Figure value={match.breadth} label="Topics" />
          <Figure value={`${Math.round(match.closeness * 100)}`} label="Closeness" />
        </div>
      </div>

      <p className="mt-4 font-read text-[16px] leading-relaxed text-ink">{match.rationale}</p>

      {match.overlap_topics.length ? (
        <div className="mt-5 space-y-2.5">
          {match.overlap_topics.slice(0, 3).map((topic) => (
            <Meter
              key={topic.topic}
              value={topic.n_papers}
              max={maxTopic}
              label={`${topic.topic} · to ${topic.latest_year}`}
            />
          ))}
        </div>
      ) : null}

      {match.evidence.length ? (
        <details className="mt-5 border-t border-rule pt-3">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink">
            {match.evidence.length} papers behind this
          </summary>
          <ul className="mt-3 space-y-2">
            {match.evidence.map((paper) => (
              <li key={paper.publication_id} className="flex items-start gap-3">
                <span className="mt-1 w-8 shrink-0 font-mono text-[11px] tabular-nums text-faint">
                  {paper.year}
                </span>
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group min-w-0 flex-1 text-[14px] leading-snug text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
                >
                  {paper.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 text-faint group-hover:text-ink" />
                  {paper.venue ? (
                    <span className="mt-0.5 block text-[12px] text-mute no-underline">
                      {paper.venue}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        {invitation ? (
          <>
            <Badge tone={invitation.status === "pending" ? "default" : "solid"}>
              {STATUS_COPY.invitation[invitation.status]}
            </Badge>
            <Link
              href={`/student/requests/${invitation.invitation_id}`}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
            >
              Open the thread
            </Link>
          </>
        ) : (
          <PitchDialog match={match} project={project} />
        )}
        <span className="ml-auto font-mono text-[11px] text-faint">
          {match.n_publications} publications indexed · h-index {match.h_index}
        </span>
      </div>
    </li>
  );
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="font-mono text-xl tabular-nums leading-none text-ink">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{label}</p>
    </div>
  );
}

/* ------------------------------ Pitch dialog --------------------------- */

function PitchDialog({ match, project }: { match: FacultyMatch; project: Project }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pitch, setPitch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [drafting, setDrafting] = React.useState(false);
  const [sending, startSending] = React.useTransition();

  const load = async () => {
    if (pitch) return;
    setDrafting(true);
    const result = await generatePitch(project.project_id, match.faculty_id);
    setDrafting(false);
    if (result?.error) setError(result.error);
    else setPitch(result.pitch ?? "");
  };

  const send = () => {
    setError(null);
    startSending(async () => {
      const result = await sendInvitation(project.project_id, match.faculty_id, pitch);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Sparkles className="h-3.5 w-3.5" />
          Draft a request
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Write to ${match.faculty_name}`}
        description="Netree drafted this from your brief and their papers. Edit it until it sounds like you — it is sent exactly as written."
        className="max-w-2xl"
      >
        {drafting ? (
          <div className="flex items-center gap-2 py-12 text-mute">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em]">Drafting</span>
          </div>
        ) : (
          <>
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={14}
              className="font-read text-[15px] leading-relaxed"
            />
            {error ? (
              <p className="mt-3 border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] text-faint">
                {pitch.trim().split(/\s+/).filter(Boolean).length} words
              </p>
              <Button onClick={send} disabled={sending || pitch.trim().length < 40}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending" : "Send request"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
