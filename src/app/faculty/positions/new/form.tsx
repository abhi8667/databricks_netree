"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { createOpportunity } from "@/app/actions/faculty";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: Opportunity["mode"][] = ["on-campus", "remote", "hybrid"];

export function PositionForm() {
  const [mode, setMode] = React.useState<Opportunity["mode"]>("on-campus");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [requirements, setRequirements] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [weeklyHours, setWeeklyHours] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [seats, setSeats] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createOpportunity({
        title,
        summary,
        requirements,
        skills,
        weekly_hours: weeklyHours,
        mode,
        duration,
        seats,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="mt-8 space-y-6 stagger">
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Edge inference for campus traffic cameras"
        />
      </Field>

      <Field label="What the project is" hint="Three or four sentences. Plain language.">
        <Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>

      <Field label="Requirements" hint="One per line.">
        <Textarea
          rows={4}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder={"Comfortable with Python and PyTorch\nAvailable through both semesters"}
        />
      </Field>

      <Field label="Skills" hint="Comma separated. Shown as tags on the listing.">
        <Input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="PyTorch, OpenCV, Linux"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Hours a week">
          <Input
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            placeholder="8-10 hours"
          />
        </Field>
        <Field label="Duration">
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="One semester"
          />
        </Field>
        <Field label="Seats">
          <Input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="eyebrow">Where the work happens</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={cn(
                "rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                mode === option
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-mute hover:border-ink hover:text-ink",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
      ) : null}

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <Button size="lg" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Posting" : "Post position"}
        </Button>
        <p className="text-[13px] text-mute">It goes live to students immediately.</p>
      </div>
    </div>
  );
}
