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
    <div className="mt-8 space-y-12">
      {open.length ? (
        <section>
          <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">
            Waiting for an answer
          </h2>
          <ul className="divide-y divide-rule">
            {open.map((question) => (
              <QuestionRow key={question.question_id} question={question} />
            ))}
          </ul>
        </section>
      ) : null}

      {answered.length ? (
        <section>
          <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">Answered</h2>
          <ul className="divide-y divide-rule">
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
        <Badge tone={question.status === "answered" ? "muted" : "solid"}>
          {STATUS_COPY.question[question.status]}
        </Badge>
        <span className="font-mono text-[11px] text-faint">
          {question.asker_name} · {relativeTime(question.created_at)}
          {question.target_user_id ? " · sent to you directly" : " · open to the group"}
        </span>
      </div>

      <p className="mt-2.5 text-[17px] text-ink">{question.topic}</p>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-mute">
        {question.body}
      </p>

      {question.answer ? (
        <div className="mt-4 border-l-2 border-ink pl-4">
          <p className="eyebrow">{question.answered_by} answered</p>
          <p className="mt-1.5 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink">
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
            placeholder="Answer from what you have actually done. Short is fine."
          />
          {error ? <p className="text-[13px] text-ink">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submit} disabled={pending || answer.trim().length < 20}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Sending" : "Send answer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="quiet" className="mt-4" onClick={() => setOpen(true)}>
          Answer this
        </Button>
      )}
    </li>
  );
}
