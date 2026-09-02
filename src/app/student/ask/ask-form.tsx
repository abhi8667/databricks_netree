"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { askQuestion } from "@/app/actions/engage";
import { cn } from "@/lib/utils";

type Mentor = {
  user_id: string;
  full_name: string;
  role: string;
  standing: string;
  interests: string[];
};

export function AskForm({ mentors }: { mentors: Mentor[] }) {
  const router = useRouter();
  const [audience, setAudience] = React.useState<"alumni" | "teacher">("alumni");
  const [target, setTarget] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const eligible = mentors.filter((m) =>
    audience === "alumni" ? m.role === "alumni" : m.role === "teacher",
  );

  const submit = () => {
    setError(null);
    const chosen = eligible.find((m) => m.user_id === target) ?? null;
    startTransition(async () => {
      const result = await askQuestion({
        audience,
        targetUserId: chosen?.user_id ?? null,
        targetName: chosen?.full_name ?? null,
        topic,
        body,
      });
      if (result?.error) setError(result.error);
      else {
        setTopic("");
        setBody("");
        setTarget("");
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-8 space-y-5">
      <div className="flex gap-2">
        {(
          [
            { key: "alumni", label: "Alumni" },
            { key: "teacher", label: "Faculty" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              setAudience(option.key);
              setTarget("");
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              audience === option.key
                ? "border-ink bg-ink text-paper"
                : "border-rule text-mute hover:border-ink hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field
        label="Send to"
        hint={
          eligible.length
            ? "Leave it open and whoever knows the answer picks it up."
            : "Nobody in this group has signed in yet — an open question waits for the first one."
        }
      >
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-10 w-full rounded-md border border-rule bg-white px-3 text-sm text-ink transition-colors hover:border-faint focus:border-ink focus:outline-none"
        >
          <option value="">Anyone in {audience === "alumni" ? "alumni" : "faculty"}</option>
          {eligible.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
              {m.standing ? ` — ${m.standing}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Subject">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Choosing between a paper and a product for the final year"
        />
      </Field>

      <Field label="Your question">
        <Textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Give enough context that they can answer without a follow-up."
        />
      </Field>

      {error ? (
        <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{error}</p>
      ) : null}

      <Button onClick={submit} disabled={pending || body.trim().length < 15}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Sending" : "Send question"}
      </Button>
    </div>
  );
}
