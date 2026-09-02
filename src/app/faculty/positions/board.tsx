"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, MapPin, Users, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { respondToInterest, setOpportunityStatus } from "@/app/actions/faculty";
import { STATUS_COPY } from "@/lib/status";
import type { Interest, Opportunity } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function PositionsBoard({
  positions,
  interests,
}: {
  positions: Opportunity[];
  interests: Interest[];
}) {
  return (
    <ul className="mt-6 space-y-4">
      {positions.map((position) => (
        <PositionCard
          key={position.opportunity_id}
          position={position}
          applicants={interests.filter((i) => i.opportunity_id === position.opportunity_id)}
        />
      ))}
    </ul>
  );
}

function PositionCard({
  position,
  applicants,
}: {
  position: Opportunity;
  applicants: Interest[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const toggle = () => {
    startTransition(async () => {
      await setOpportunityStatus(
        position.opportunity_id,
        position.status === "open" ? "closed" : "open",
      );
      router.refresh();
    });
  };

  const decide = (interestId: string, accept: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await respondToInterest(interestId, accept);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  };

  const accepted = applicants.filter((a) => a.status === "accepted").length;

  return (
    <li className="rulebox p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={position.status === "open" ? "solid" : "muted"}>
              {STATUS_COPY.opportunity[position.status]}
            </Badge>
            <span className="font-mono text-[11px] text-faint">
              {accepted} of {position.seats} filled
            </span>
          </div>
          <h2 className="mt-2 text-[17px] font-medium text-ink">{position.title}</h2>
        </div>
        <Button size="sm" variant="quiet" onClick={toggle} disabled={pending}>
          {position.status === "open" ? "Close position" : "Reopen"}
        </Button>
      </div>

      <p className="mt-3 font-read text-[16px] leading-relaxed text-ink">{position.summary}</p>

      {position.requirements.length ? (
        <ul className="mt-4 space-y-1.5">
          {position.requirements.map((requirement) => (
            <li key={requirement} className="flex gap-2.5 text-[14px] leading-relaxed text-mute">
              <span className="mt-2.5 h-px w-3 shrink-0 bg-rule" />
              {requirement}
            </li>
          ))}
        </ul>
      ) : null}

      {position.skills.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {position.skills.map((skill) => (
            <Badge key={skill} className="normal-case tracking-normal">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
        <dd className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {position.weekly_hours || "hours flexible"}
        </dd>
        <dd className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {position.mode}
        </dd>
        <dd className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {applicants.length} applied
        </dd>
      </dl>

      {applicants.length ? (
        <div className="mt-5 border-t border-rule pt-4">
          <p className="eyebrow">Applicants</p>
          <ul className="mt-3 space-y-4">
            {applicants.map((applicant) => (
              <li key={applicant.interest_id} className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="text-[15px] text-ink">{applicant.student_name}</span>
                    <span className="font-mono text-[11px] text-faint">
                      {relativeTime(applicant.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-mute">
                    {applicant.note}
                  </p>
                </div>
                {applicant.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={pending}
                      onClick={() => decide(applicant.interest_id, true)}
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Take them on
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => decide(applicant.interest_id, false)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Pass
                    </Button>
                  </div>
                ) : (
                  <Badge tone={applicant.status === "accepted" ? "solid" : "muted"}>
                    {STATUS_COPY.interest[applicant.status]}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          {error ? <p className="mt-3 text-[13px] text-ink">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
