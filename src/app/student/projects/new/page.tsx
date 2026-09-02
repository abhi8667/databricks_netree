import { PageHeader } from "@/components/app-shell";
import { SeedForm } from "./seed-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="New idea"
        title="What do you want to build?"
        description="One or two sentences is enough. Netree will ask what it still needs, then turn the whole thing into a brief a professor can read in half a minute."
      />
      <SeedForm />
    </div>
  );
}
