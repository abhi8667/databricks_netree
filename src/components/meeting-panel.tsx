"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Video,
  X,
} from "lucide-react";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { requestMeeting } from "@/app/actions/projects";
import { respondToMeeting } from "@/app/actions/faculty";
import { STATUS_COPY } from "@/lib/status";
import type { Meeting } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildGoogleCalendarUrl, buildIcsContent, downloadIcsFile } from "@/lib/calendar";

/**
 * Meetings are proposed as a set of times, not a single one - a student
 * guessing a professor's calendar wastes a round trip. The professor picks a
 * slot, and that is the confirmation.
 */
export function MeetingPanel({
  invitationId,
  meetings,
  canPropose,
  canDecide,
  projectTitle = "Research Collaboration Meeting",
  facultyName,
}: {
  invitationId: string;
  meetings: Meeting[];
  canPropose: boolean;
  canDecide: boolean;
  projectTitle?: string;
  facultyName?: string;
}) {
  return (
    <div className="space-y-5">
      {meetings.length ? (
        <ul className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingRow
              key={meeting.meeting_id}
              meeting={meeting}
              invitationId={invitationId}
              canDecide={canDecide && meeting.status === "proposed"}
              projectTitle={projectTitle}
              facultyName={facultyName}
            />
          ))}
        </ul>
      ) : null}

      {canPropose ? <ProposeForm invitationId={invitationId} hasPrior={meetings.length > 0} /> : null}

      {!canPropose && !meetings.length ? (
        <p className="text-[14px] text-mute">No meeting has been proposed on this request yet.</p>
      ) : null}
    </div>
  );
}

function MeetingRow({
  meeting,
  invitationId,
  canDecide,
  projectTitle = "Research Collaboration Meeting",
  facultyName,
}: {
  meeting: Meeting;
  invitationId: string;
  canDecide: boolean;
  projectTitle?: string;
  facultyName?: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const act = (accept: boolean, slot?: string) => {
    setError(null);
    startTransition(async () => {
      const result = await respondToMeeting(meeting.meeting_id, invitationId, { accept, slot });
      if (result && "error" in result && result.error) setError(result.error);
      else router.refresh();
    });
  };

  const isConfirmed = meeting.status === "confirmed" && Boolean(meeting.confirmed_slot);

  const calOpts = isConfirmed
    ? {
        title: `Netree Meeting: ${projectTitle}`,
        description: `Academic research discussion for project "${projectTitle}".${
          facultyName ? ` With ${facultyName}.` : ""
        }${meeting.agenda ? `\n\nAgenda: ${meeting.agenda}` : ""}`,
        location: meeting.mode === "online" ? "Google Meet (Online)" : meeting.location || "Campus Lab",
        slot: meeting.confirmed_slot!,
        durationMinutes: 45,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }
    : null;

  const handleDownloadIcs = () => {
    if (!calOpts) return;
    const content = buildIcsContent(calOpts);
    downloadIcsFile(`netree-meeting-${meeting.meeting_id.slice(0, 8)}`, content);
  };

  const handleCopy = () => {
    if (!meeting.confirmed_slot) return;
    const text = `📅 Netree Research Meeting\nProject: ${projectTitle}\nTime: ${
      meeting.confirmed_slot
    }\nLocation: ${meeting.mode === "online" ? "Online" : meeting.location || "On Campus"}${
      meeting.agenda ? `\nAgenda: ${meeting.agenda}` : ""
    }`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="rulebox p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[14px] text-ink font-medium">
          {meeting.mode === "online" ? (
            <Video className="h-4 w-4 text-mute" />
          ) : (
            <MapPin className="h-4 w-4 text-mute" />
          )}
          {meeting.mode === "online" ? "Online Meeting" : meeting.location || "On campus"}
        </span>
        <Badge tone={meeting.status === "confirmed" ? "solid" : "default"}>
          {STATUS_COPY.meeting[meeting.status]}
        </Badge>
      </div>

      {meeting.agenda ? (
        <p className="mt-3 text-[14px] leading-relaxed text-mute">{meeting.agenda}</p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {meeting.slots.map((slot) => {
          const chosen = meeting.confirmed_slot === slot;
          return (
            <li
              key={slot}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 transition-colors",
                chosen ? "bg-fill border border-rule" : ""
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 text-[14px]",
                  chosen ? "font-medium text-ink" : "text-mute",
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {slot}
                {chosen ? <Badge tone="solid">Confirmed Slot</Badge> : null}
              </span>
              {canDecide ? (
                <Button size="sm" variant="quiet" disabled={pending} onClick={() => act(true, slot)}>
                  <Check className="h-3.5 w-3.5" />
                  Confirm this slot
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Calendar Auto-Sync Actions when Confirmed */}
      {isConfirmed && calOpts ? (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="eyebrow text-micro text-mute mb-2.5">Auto-Sync to Calendar</p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildGoogleCalendarUrl(calOpts)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink shadow-sm transition hover:bg-ink hover:text-paper"
            >
              <Calendar className="h-3.5 w-3.5" />
              Google Calendar
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink shadow-sm transition hover:bg-ink hover:text-paper"
            >
              <Download className="h-3.5 w-3.5" />
              Apple / Outlook (.ics)
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-mute transition hover:text-ink"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied invite!" : "Copy Details"}
            </button>
          </div>
        </div>
      ) : null}

      {canDecide ? (
        <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(false)}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            None of these work
          </Button>
          {error ? <p className="text-[13px] text-ink">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function ProposeForm({ invitationId, hasPrior }: { invitationId: string; hasPrior: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!hasPrior);
  const [mode, setMode] = React.useState<"online" | "offline">("online");
  const [slots, setSlots] = React.useState(["", "", ""]);
  const [location, setLocation] = React.useState("");
  const [agenda, setAgenda] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestMeeting(invitationId, { mode, slots, location, agenda });
      if (result?.error) setError(result.error);
      else {
        setSlots(["", "", ""]);
        setAgenda("");
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <Button variant="quiet" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="h-4 w-4" />
        Propose another time
      </Button>
    );
  }

  return (
    <div className="rulebox space-y-4 p-4">
      <div className="flex gap-2">
        {(["online", "offline"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              mode === option
                ? "border-ink bg-ink text-paper"
                : "border-rule text-mute hover:border-ink hover:text-ink",
            )}
          >
            {option === "online" ? "Online" : "In person"}
          </button>
        ))}
      </div>

      <Field label="Times that work for you" hint="Offer two or three. They pick one.">
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <Input
              key={i}
              value={slot}
              onChange={(e) => setSlots(slots.map((s, j) => (j === i ? e.target.value : s)))}
              placeholder={
                i === 0 ? "Tue 9 Sep, 4:00 pm" : i === 1 ? "Wed 10 Sep, 11:30 am" : "Optional third"
              }
            />
          ))}
        </div>
      </Field>

      {mode === "offline" ? (
        <Field label="Where">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="CSE department, second floor"
          />
        </Field>
      ) : null}

      <Field label="What you want to cover" hint="Optional, but it shortens the meeting.">
        <Textarea rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
      </Field>

      {error ? (
        <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Sending" : "Request meeting"}
        </Button>
        {hasPrior ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
