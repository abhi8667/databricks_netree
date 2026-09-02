"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, Textarea } from "@/components/ui/primitives";
import { startProject } from "@/app/actions/projects";

const EXAMPLES = [
  "A browser extension that flags phishing pages before the student clicks through.",
  "Crowd density estimation from campus CCTV, so events can be managed live.",
  "Anonymising hospital records so they can be shared with researchers safely.",
];

export function SeedForm() {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await startProject(value);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="mt-8 stagger">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={6}
        autoFocus
        placeholder="Start anywhere. Rough is fine."
        className="border-ink font-read text-lg leading-relaxed"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-faint">
          {value.trim().split(/\s+/).filter(Boolean).length} words · Ctrl+Enter to start
        </span>
        <Button onClick={submit} disabled={pending || value.trim().length < 10}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Reading it" : "Start the interview"}
          {pending ? null : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
      ) : null}

      <div className="mt-12 border-t border-rule pt-6">
        <p className="eyebrow">Or borrow a starting point</p>
        <ul className="mt-3 space-y-2">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setValue(example)}
                className="group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-[14px] leading-relaxed text-mute transition-colors hover:bg-fill hover:text-ink"
              >
                <span className="mt-1.5 h-px w-4 shrink-0 bg-rule transition-colors group-hover:bg-ink" />
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
