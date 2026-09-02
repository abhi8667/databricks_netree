import { PageHeader } from "@/components/app-shell";
import { PositionForm } from "./form";

export default function NewPositionPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="New position"
        title="Describe the work"
        description="Students decide from this page alone. Say what the project is, what you expect each week, and what they need to already know."
      />
      <PositionForm />
    </div>
  );
}
