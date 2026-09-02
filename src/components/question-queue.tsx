"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge, Button, Empty, Textarea } from "@/components/ui/primitives";
import { answerQuestion } from "@/app/actions/faculty";
import { STATUS_COPY } from "@/lib/status";
import type { Question } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

/**
 * The answer queue. Open questions first - a question with no answer is the
 * only thing here that costs a student anything.
 */
export function QuestionQueue({ questions, emptyNote }: { questions: Question[]; emptyNote: string }) {
  const open = questions.filter((q) => q.status === "open");
  const answered = questions.filter((q) => q.status === "answered");

  if (!questions.length) {
    return (
      <div className="mt-8">
        <Empty title="No questions yet.">{emptyNote}</Empty>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {open.length ? (
        <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
          <div className="flex items-center gap-2 border-b border-rule/70 pb-4 dark:border-dark-border/70">
            <h2 className="font-read text-xl text-ink dark:text-dark-ink">
              Waiting for an answer
            </h2>
            <Badge tone="emerald">{open.length} open</Badge>
          </div>
          <ul className="divide-y divide-rule/70 dark:divide-dark-border/70">
            {open.map((question) => (
              <QuestionRow key={question.question_id} question={question} />
            ))}
          </ul>
        </section>
      ) : null}

      {answered.length ? (
        <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
          <h2 className="border-b border-rule/70 pb-4 font-read text-xl text-ink dark:text-dark-ink">
            Answered
          </h2>
          <ul className="divide-y divide-rule/70 dark:divide-dark-border/70">
            {answered.map((question) => (
              <QuestionRow key={question.question_id} question={question} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function QuestionRow({ question }: { question: Question }) {
  const router = useRouter();
  const [answer, setAnswer] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await answerQuestion(question.question_id, answer);
      if (result?.error) setError(result.error);
      else {
        setAnswer("");
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone={question.status === "answered" ? "muted" : "emerald"}>
          {STATUS_COPY.question[question.status]}
        </Badge>
        <span className="font-mono text-[11px] text-faint dark:text-dark-faint">
          {question.asker_name} · {relativeTime(question.created_at)}
          {question.target_user_id ? " · sent to you directly" : " · open to the alumni group"}
        </span>
      </div>

      <p className="mt-2.5 text-[17px] font-medium text-ink dark:text-dark-ink">{question.topic}</p>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-mute dark:text-dark-mute">
        {question.body}
      </p>

      {question.answer ? (
        <div className="mt-4 rounded-2xl border-l-4 border-emerald-500 bg-forest-50/50 p-4 dark:bg-forest-950/40">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {question.answered_by || "Alumni"} answered
          </p>
          <p className="mt-1.5 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink dark:text-dark-ink">
            {question.answer}
          </p>
        </div>
      ) : open ? (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={4}
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer from what you have actually experienced in industry. Short is fine."
            className="dark:bg-dark-card dark:border-dark-border"
          />
          {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="emerald" onClick={submit} disabled={pending || answer.trim().length < 15}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Sending..." : "Send answer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="emerald" className="mt-4" onClick={() => setOpen(true)}>
          Answer this
        </Button>
      )}
    </li>
  );
}
