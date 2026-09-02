"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, MapPin, Users } from "lucide-react";
import { Badge, Button, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { expressInterest } from "@/app/actions/engage";
import { STATUS_COPY } from "@/lib/status";
import type { Interest, Opportunity } from "@/lib/types";
import { parseTopTopics } from "@/lib/utils";

type Item = { opportunity: Opportunity; topics: string; interest: Interest | null };

export function OpportunityList({ items }: { items: Item[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map(({ opportunity, topics, interest }) => (
        <li key={opportunity.opportunity_id} className="rulebox p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-medium text-ink">{opportunity.title}</h2>
              <p className="mt-1 text-[13px] text-mute">{opportunity.owner_name}</p>
            </div>
            {interest ? (
              <Badge tone={interest.status === "accepted" ? "solid" : "default"}>
                {STATUS_COPY.interest[interest.status]}
              </Badge>
            ) : null}
          </div>

          <p className="mt-3 font-read text-[16px] leading-relaxed text-ink">
            {opportunity.summary}
          </p>

          {opportunity.requirements.length ? (
            <ul className="mt-4 space-y-1.5">
              {opportunity.requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2.5 text-[14px] leading-relaxed text-mute">
                  <span className="mt-2.5 h-px w-3 shrink-0 bg-rule" />
                  {requirement}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
            <dd className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {opportunity.weekly_hours || "hours flexible"}
            </dd>
            <dd className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {opportunity.mode}
            </dd>
            <dd className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {opportunity.seats} {opportunity.seats === 1 ? "seat" : "seats"}
            </dd>
            {opportunity.duration ? <dd>{opportunity.duration}</dd> : null}
          </dl>

          {topics ? (
            <p className="mt-4 text-[13px] leading-relaxed text-mute">
              <span className="eyebrow mr-2">Publishes on</span>
              {parseTopTopics(topics)
                .slice(0, 3)
                .map((t) => t.topic)
                .join(" · ")}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {opportunity.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {opportunity.skills.map((skill) => (
                  <Badge key={skill} className="normal-case tracking-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="ml-auto">
              {interest ? (
                <p className="font-mono text-[11px] text-faint">Applied</p>
              ) : (
                <ApplyDialog opportunity={opportunity} />
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ApplyDialog({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await expressInterest(opportunity.opportunity_id, note);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Show interest</Button>
      </DialogTrigger>
      <DialogContent
        title={opportunity.title}
        description="Say why you fit and what you have already built. This is all they see before deciding."
      >
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={7}
          autoFocus
          placeholder="I built a small version of this last semester using…"
        />
        {error ? (
          <p className="mt-3 border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="font-mono text-[11px] text-faint">
            {note.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <Button onClick={submit} disabled={pending || note.trim().length < 20}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Sending" : "Send interest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
