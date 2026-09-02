import { PageHeader } from "@/components/app-shell";
import { referenceData } from "@/lib/store/reference";
import { Directory } from "./directory";

export default async function DepartmentPage() {
  const { faculty, topics, publications } = await referenceData();

  const byFaculty = new Map<string, { topic: string; n_papers: number; latest_year: number }[]>();
  for (const t of topics) {
    const list = byFaculty.get(t.faculty_id) ?? [];
    list.push({ topic: t.topic, n_papers: t.n_papers, latest_year: t.latest_year });
    byFaculty.set(t.faculty_id, list);
  }

  const entries = faculty
    .map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: f.faculty_name,
      designation: f.designation,
      department: f.department,
      n_publications: f.n_publications,
      latest_year: f.latest_year,
      total_citations: f.total_citations,
      profile_status: f.profile_status,
      is_head: f.is_head,
      topics: (byFaculty.get(f.faculty_id) ?? []).sort((a, b) => b.n_papers - a.n_papers).slice(0, 4),
    }))
    .sort((a, b) => b.n_publications - a.n_publications);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Department index"
        title="Who publishes what"
        description={`${faculty.length} faculty and ${publications.length} publications, as the matcher sees them. Topics come from the publication record, not from self-description.`}
      />
      <Directory entries={entries} />
    </div>
  );
}
