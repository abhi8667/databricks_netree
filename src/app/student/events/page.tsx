import { PageHeader } from "@/components/app-shell";
import { EventsSection } from "@/components/events-section";
import { requireUser } from "@/lib/auth";
import { getRankedEventsForStudent } from "@/lib/events/service";

export default async function StudentEventsPage() {
  const user = await requireUser();
  const eventsFeed = await getRankedEventsForStudent(user);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Campus Research & Builder Ecosystem"
        title="Events & Hackathons"
        description="Live feeds from Bengaluru Tech Week and HackCulture, ranked against your research background and current project topics."
      />

      <EventsSection feed={eventsFeed} />
    </div>
  );
}
