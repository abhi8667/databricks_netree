import { PageHeader } from "@/components/app-shell";
import { QuestionQueue } from "@/components/question-queue";
import { requireUser } from "@/lib/auth";
import { questionsFor } from "@/lib/repo";

export default async function FacultyQuestionsPage() {
  const user = await requireUser();
  const questions = await questionsFor(user.user_id, "teacher");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Questions"
        title="Short questions from students"
        description="No proposal attached. Someone wants one thing clarified before they commit time to it."
      />
      <QuestionQueue
        questions={questions}
        emptyNote="Questions addressed to you, and open questions to faculty, land here."
      />
    </div>
  );
}
