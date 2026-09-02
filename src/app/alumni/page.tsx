import { PageHeader } from "@/components/app-shell";
import { QuestionQueue } from "@/components/question-queue";
import { requireUser } from "@/lib/auth";
import { questionsFor } from "@/lib/repo";

export default async function AlumniPage() {
  const user = await requireUser();
  const questions = await questionsFor(user.user_id, "alumni");
  const open = questions.filter((q) => q.status === "open").length;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow={user.standing || "Alumni"}
        title={open ? `${open} student${open === 1 ? "" : "s"} waiting on you` : "Nothing waiting"}
        description="Students ask alumni the things faculty cannot answer: what the work is actually like, what was worth learning, what to skip."
      />
      <QuestionQueue
        questions={questions}
        emptyNote="When a student sends a question to alumni, it appears here. Answering one takes a minute and saves them a semester."
      />
    </div>
  );
}
