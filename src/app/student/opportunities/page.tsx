import { PageHeader } from "@/components/app-shell";
import { Empty } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { interestsFromStudent, openOpportunities } from "@/lib/repo";
import { referenceData } from "@/lib/store/reference";
import { OpportunityList } from "./list";

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const [opportunities, mine, reference] = await Promise.all([
    openOpportunities(),
    interestsFromStudent(user.user_id),
    referenceData(),
  ]);

  // Faculty who posted a position get their indexed topics shown alongside it,
  // so a student can tell whether the position sits in their real research line.
  const topicsByFaculty = new Map<string, string>();
  for (const f of reference.faculty) topicsByFaculty.set(f.faculty_id, f.top_topics);

  const enriched = opportunities.map((o) => ({
    opportunity: o,
    topics: o.faculty_id ? (topicsByFaculty.get(o.faculty_id) ?? "") : "",
    interest: mine.find((i) => i.opportunity_id === o.opportunity_id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Open positions"
        title="Projects faculty are staffing right now"
        description="These are posted by professors themselves, with the hours and the commitment stated up front."
      />

      {enriched.length === 0 ? (
        <div className="mt-8">
          <Empty title="No open positions today.">
            When a professor posts one it lands here. In the meantime, pitching your own idea works
            just as well.
          </Empty>
        </div>
      ) : (
        <OpportunityList items={enriched} />
      )}
    </div>
  );
}
