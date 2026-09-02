"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, CornerUpRight, Loader2, PenLine, X } from "lucide-react";
import { Badge, Button, Textarea } from "@/components/ui/primitives";
import {
  acceptProposal,
  declineProposal,
  redirectProposal,
  requestChanges,
} from "@/app/actions/faculty";
import { STATUS_COPY } from "@/lib/status";
import type { Invitation } from "@/lib/types";
import { cn, parseTopTopics } from "@/lib/utils";

type Colleague = {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  top_topics: string;
};

type Choice = "accept" | "changes" | "redirect" | "decline";

const CHOICES: { key: Choice; label: string; icon: React.ElementType; hint: string }[] = [
  {
    key: "accept",
    label: "Accept",
    icon: Check,
    hint: "You are willing to guide this. Add anything they should prepare.",
  },
  {
    key: "changes",
    label: "Request changes",
    icon: PenLine,
    hint: "The idea is workable but not yet. Say precisely what has to change.",
  },
  {
    key: "redirect",
    label: "Pass to a colleague",
    icon: CornerUpRight,
    hint: "Someone else is closer to this. The request moves to their inbox.",
  },
  {
    key: "decline",
    label: "Decline",
    icon: X,
    hint: "Not something you can take on. A reason saves them a wasted follow-up.",
  },
];

export function DecisionPanel({
  invitation,
  colleagues,
}: {
  invitation: Invitation;
  colleagues: Colleague[];
}) {
  const router = useRouter();
  const [choice, setChoice] = React.useState<Choice | null>(null);
  const [note, setNote] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const settled = invitation.status !== "pending";

  const submit = () => {
    if (!choice) return;
    setError(null);
    startTransition(async () => {
      const result =
        choice === "accept"
          ? await acceptProposal(invitation.invitation_id, note)
          : choice === "changes"
            ? await requestChanges(invitation.invitation_id, note)
            : choice === "redirect"
              ? await redirectProposal(invitation.invitation_id, target, note)
              : await declineProposal(invitation.invitation_id, note);

      if (result && "error" in result && result.error) setError(result.error);
      else {
        setChoice(null);
        setNote("");
        router.refresh();
      }
    });
  };

  if (settled) {
    return (
      <div className="rulebox p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="solid">{STATUS_COPY.invitation[invitation.status]}</Badge>
          {invitation.redirected_to_faculty_name ? (
            <span className="text-[14px] text-mute">
              now with {invitation.redirected_to_faculty_name}
            </span>
          ) : null}
        </div>
        {invitation.feedback ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {invitation.feedback}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-mute">
          Decisions are recorded as new revisions, so the student sees exactly this. Keep talking in
          the thread below if it needs more.
        </p>
      </div>
    );
  }

  const selected = CHOICES.find((c) => c.key === choice);
  const targetColleague = colleagues.find((c) => c.faculty_id === target);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {CHOICES.map((option) => {
          const Icon = option.icon;
          const active = choice === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setChoice(active ? null : option.key)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                active ? "border-ink bg-ink text-paper" : "border-rule bg-white hover:border-ink",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-paper" : "text-mute")} />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{option.label}</span>
                <span
                  className={cn(
                    "mt-1 block text-[12px] leading-relaxed",
                    active ? "text-white/60" : "text-mute",
                  )}
                >
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="space-y-4 border-t border-rule pt-5 animate-rise">
          {choice === "redirect" ? (
            <div className="space-y-2">
              <label className="eyebrow" htmlFor="redirect-target">
                Send it to
              </label>
              <select
                id="redirect-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-10 w-full rounded-md border border-rule bg-white px-3 text-sm text-ink transition-colors hover:border-faint focus:border-ink focus:outline-none"
              >
                <option value="">Choose a colleague</option>
                {colleagues.map((c) => (
                  <option key={c.faculty_id} value={c.faculty_id}>
                    {c.faculty_name} — {c.designation}
                  </option>
                ))}
              </select>
              {targetColleague ? (
                <p className="text-[13px] leading-relaxed text-mute">
                  Publishes on{" "}
                  {parseTopTopics(targetColleague.top_topics)
                    .slice(0, 3)
                    .map((t) => t.topic)
                    .join(" · ") || "no indexed topics"}
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="eyebrow" htmlFor="decision-note">
              {choice === "accept" ? "Anything they should prepare" : "What the student needs to know"}
            </label>
            <Textarea
              id="decision-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                choice === "accept"
                  ? "Read these two papers before we meet, and bring a one-page plan."
                  : choice === "changes"
                    ? "Narrow it to one dataset and drop the mobile app — the core question is enough for a semester."
                    : choice === "redirect"
                      ? "This is closer to their line of work than mine."
                      : "I am not taking new projects this semester."
              }
            />
          </div>

          {error ? (
            <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
          ) : null}

          <Button onClick={submit} disabled={pending || (choice === "redirect" && !target)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Recording" : selected.label}
          </Button>
        </div>
      ) : (
        <p className="text-[14px] text-mute">Pick one. Nothing is sent until you confirm.</p>
      )}
    </div>
  );
}
