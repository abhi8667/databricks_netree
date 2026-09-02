import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/primitives";
import { requireUser, listUsers } from "@/lib/auth";
import { questionsFrom } from "@/lib/repo";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { AskForm } from "./ask-form";

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
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Ask a mentor"
        title="One question, no proposal"
        description="For the things that do not need a project behind them. Send it to the whole group or to one person."
      />

      <AskForm mentors={mentors} />

      <section className="mt-14">
        <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">Your questions</h2>
        {questions.length === 0 ? (
          <p className="mt-4 text-[14px] text-mute">Nothing asked yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {questions.map((question) => (
              <li key={question.question_id} className="py-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge tone={question.status === "answered" ? "solid" : "muted"}>
                    {STATUS_COPY.question[question.status]}
                  </Badge>
                  <span className="font-mono text-[11px] text-faint">
                    to {question.target_name ?? (question.audience === "alumni" ? "alumni" : "faculty")}
                    {" · "}
                    {relativeTime(question.created_at)}
                  </span>
                </div>
                <p className="mt-2.5 text-[16px] text-ink">{question.topic}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-mute">
                  {question.body}
                </p>
                {question.answer ? (
                  <div className="mt-4 border-l-2 border-ink pl-4">
                    <p className="eyebrow">{question.answered_by} replied</p>
                    <p className="mt-1.5 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink">
                      {question.answer}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
