import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/primitives";
import { requireUser, listUsers } from "@/lib/auth";
import { questionsFrom } from "@/lib/repo";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { AskForm } from "./ask-form";
import { CheckCircle2, MessageSquareText } from "lucide-react";

export default async function AskPage() {
  const user = await requireUser();
  const [questions, alumni, teachers] = await Promise.all([
    questionsFrom(user.user_id),
    listUsers("alumni"),
    listUsers("teacher"),
  ]);

  const mentors = [...alumni, ...teachers]
    .filter((m) => m.department)
    .map((m) => ({
      user_id: m.user_id,
      full_name: m.full_name,
      role: m.role,
      standing: m.standing,
      interests: m.interests,
    }));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-8">
      {/* Top Header & Ask Form Box */}
      <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <PageHeader
          eyebrow="Ask a mentor"
          title="One question, no proposal"
          description="For the things that do not need a full project behind them. Ask alumni about career paths and tech stacks, or ask faculty about lab requirements."
        />

        <AskForm mentors={mentors} />
      </section>

      {/* Questions & Answers Box */}
      <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <div className="flex items-center justify-between border-b border-rule/70 pb-4 dark:border-dark-border/70">
          <div className="flex items-center gap-2">
            <h2 className="font-read text-xl text-ink dark:text-dark-ink">Your questions</h2>
            {questions.length ? <Badge tone="emerald">{questions.length}</Badge> : null}
          </div>
          <span className="font-mono text-xs text-mute dark:text-dark-mute">
            {questions.filter((q) => q.status === "answered").length} answered
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquareText className="mx-auto h-8 w-8 text-mute/60 dark:text-dark-mute/60" />
            <p className="mt-2 text-[14px] text-mute dark:text-dark-mute">Nothing asked yet. Send a question to an alumni or faculty mentor above!</p>
          </div>
        ) : (
          <ul className="divide-y divide-rule/70 dark:divide-dark-border/70">
            {questions.map((question) => (
              <li key={question.question_id} className="py-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge tone={question.status === "answered" ? "emerald" : "muted"}>
                    {question.status === "answered" ? "Answered" : "Waiting for response"}
                  </Badge>
                  <span className="font-mono text-[11px] text-faint dark:text-dark-faint">
                    to {question.target_name ?? (question.audience === "alumni" ? "Alumni network" : "Faculty")}
                    {" · "}
                    {relativeTime(question.created_at)}
                  </span>
                </div>
                <p className="mt-2.5 text-[17px] font-medium text-ink dark:text-dark-ink">{question.topic}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-mute dark:text-dark-mute">
                  {question.body}
                </p>
                {question.answer ? (
                  <div className="mt-4 rounded-2xl border-l-4 border-emerald-500 bg-forest-50/70 p-4.5 shadow-xs dark:bg-forest-950/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        {question.answered_by || "Alumni"} replied
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink dark:text-dark-ink">
                      {question.answer}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-rule/50 bg-paper/50 px-3.5 py-2 text-xs text-mute dark:border-dark-border/50 dark:bg-dark-paper/50 dark:text-dark-mute">
                    ⏳ Waiting for an alumni or faculty member to pick this up and reply.
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
