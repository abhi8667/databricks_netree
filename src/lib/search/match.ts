import "server-only";
import { rethrowFrameworkError } from "@/lib/framework-error";
import { hasGemini, hasGenie } from "@/lib/env";
import { askGenie, genieRows, type GenieResult } from "@/lib/databricks/genie";
import { chat } from "@/lib/ai/gemini";
import { referenceData } from "@/lib/store/reference";
import { searchPublications, spaceKind } from "./vectors";
import type { FacultyMatch, MatchReport, Project, ProjectBrief } from "@/lib/types";

/**
 * Faculty matching.
 *
 * The dataset's own validation (SCHEMA.md, section 11) makes two things clear,
 * and the ranking here is built around both:
 *
 *   1. There is no absolute similarity threshold that separates a real match
 *      from a bad one. An out-of-scope idea still scores respectably. What
 *      actually separates them is breadth - how many distinct papers and
 *      topics clear the bar - so breadth is weighted, and a candidate with a
 *      single loosely-matching paper is reported as a weak field, not a match.
 *
 *   2. Three faculty hold roughly half the corpus. Left alone they win every
 *      query. Depth and breadth are therefore log-damped, and normalised
 *      against each person's own publication count, so a focused researcher
 *      with four dead-on papers can beat a prolific one with four incidental
 *      ones.
 */

const FLOOR_RATIO = 0.45; // a hit counts as relevant at 45% of the best hit's score
const MIN_ABS = 0.05;

/**
 * The search text. Title, one-liner and research areas are repeated because
 * they name the subject, while the problem and approach paragraphs carry a lot
 * of incidental vocabulary - implementation nouns that match papers about
 * something else entirely. Repetition is how a term-frequency space is told
 * which words are the subject and which are the setting.
 */
export function briefToQuery(brief: ProjectBrief) {
  const subject = [brief.title, brief.one_liner, brief.domain_tags.join(" ")]
    .filter(Boolean)
    .join("\n");
  return [subject, subject, brief.problem, brief.approach, brief.skills_needed.join(" ")]
    .filter(Boolean)
    .join("\n");
}

async function genieShortlist(brief: ProjectBrief): Promise<{
  result: GenieResult | null;
  names: Map<string, number>;
}> {
  const names = new Map<string, number>();
  if (!hasGenie()) return { result: null, names };

  const topics = brief.domain_tags.slice(0, 6).join(", ") || brief.title;
  const question =
    `Which Computer Science faculty publish on ${topics}? ` +
    `Return faculty_name, designation, n_publications and top_topics, ` +
    `ordered by how many publications they have on those subjects, limit 12.`;

  try {
    const result = await askGenie(question);
    genieRows(result).forEach((row, index) => {
      const name = (row.faculty_name ?? row.name ?? "").trim();
      if (name) names.set(name.toLowerCase(), 1 - index / 24);
    });
    return { result, names };
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[netree] Genie shortlist unavailable:", err);
    return { result: null, names };
  }
}

export async function matchFaculty(project: Project): Promise<MatchReport> {
  const brief = project.brief;
  if (!brief) throw new Error("Project has no structured brief yet");

  const queryText = briefToQuery(brief);
  const [reference, hits, genie, kind] = await Promise.all([
    referenceData(),
    searchPublications(queryText, 150),
    genieShortlist(brief),
    spaceKind(),
  ]);
  const { faculty, topics, publications, bridge } = reference;

  const method = [kind === "dense" ? "Embeddings via Model Serving" : "Embeddings over the corpus"];
  if (genie.result) method.unshift("Genie SQL over netree.gold");

  const pubById = new Map(publications.map((p) => [p.publication_id, p]));

  // A hit only counts if the paper behind it can be shown. The vector space and
  // the faculty bridge are both built from the full publication set, so either
  // can name a paper the reader filtered out - and evidence we cannot render is
  // not evidence, so these are dropped before they reach scoring.
  const resolved = hits.filter((h) => pubById.has(h.publication_id));
  const best = resolved[0]?.similarity ?? 0;
  const floor = Math.max(best * FLOOR_RATIO, MIN_ABS);

  const facultyOfPub = new Map<string, string[]>();
  for (const link of bridge) {
    const list = facultyOfPub.get(link.publication_id) ?? [];
    list.push(link.faculty_id);
    facultyOfPub.set(link.publication_id, list);
  }

  const byFaculty = new Map<string, { publication_id: string; similarity: number }[]>();
  for (const hit of resolved) {
    for (const facultyId of facultyOfPub.get(hit.publication_id) ?? []) {
      const list = byFaculty.get(facultyId) ?? [];
      list.push(hit);
      byFaculty.set(facultyId, list);
    }
  }

  // The idea's own vocabulary, used to name which of a person's topics overlap.
  const ideaWords = new Set(
    queryText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );

  const candidates: FacultyMatch[] = [];

  for (const [facultyId, facultyHits] of byFaculty) {
    const profile = faculty.find((f) => f.faculty_id === facultyId);
    if (!profile) continue;

    facultyHits.sort((a, b) => b.similarity - a.similarity);
    const relevant = facultyHits.filter((h) => h.similarity >= floor);
    if (!relevant.length) continue;

    const closeness = relevant[0]!.similarity / (best || 1);
    const depth = relevant.length;

    const relevantIds = new Set(relevant.map((h) => h.publication_id));
    const matchedTopics = new Set<string>();
    for (const id of relevantIds) {
      for (const topic of (pubById.get(id)?.topics_all ?? "").split(";")) {
        const clean = topic.trim();
        if (clean) matchedTopics.add(clean);
      }
    }

    const ownTopics = topics.filter((t) => t.faculty_id === facultyId);

    // Breadth is how many of this person's topics the matching papers actually
    // sit in. A topic whose *label* happens to share a word with the idea is
    // not overlap - counting those inflated every candidate to a dozen topics.
    const overlapping = ownTopics
      .filter((t) => matchedTopics.has(t.topic))
      .sort((a, b) => b.n_papers - a.n_papers);
    const breadth = overlapping.length;

    // For display only, fall back to topics that read as related, so a card is
    // never blank - but those never count towards the ranking.
    const personTopics = overlapping.length
      ? overlapping
      : ownTopics
          .filter((t) =>
            t.topic
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .some((w) => w.length > 3 && ideaWords.has(w)),
          )
          .sort((a, b) => b.n_papers - a.n_papers);

    // Log-damped so the three prolific authors cannot buy their way to the top,
    // then weighted by how much of their own corpus this actually is, so
    // incidental overlap inside a large body of work counts for less than
    // focused overlap inside a small one.
    const depthScore = Math.log1p(depth) / Math.log1p(12);
    const breadthScore = Math.log1p(breadth) / Math.log1p(8);
    const focus = depth / Math.max(profile.n_publications, depth, 1);
    const recency = profile.latest_year && profile.latest_year >= 2023 ? 1 : 0.72;
    const genieBoost = genie.names.get(profile.faculty_name.toLowerCase()) ?? 0;

    const score =
      (0.42 * closeness +
        0.22 * Math.min(depthScore, 1) +
        0.16 * Math.min(breadthScore, 1) +
        0.12 * Math.min(focus * 2.5, 1) +
        0.08 * genieBoost) *
      recency;

    candidates.push({
      faculty_id: facultyId,
      faculty_name: profile.faculty_name,
      designation: profile.designation,
      department: profile.department,
      closeness: Number(closeness.toFixed(3)),
      depth,
      breadth,
      score: Number(score.toFixed(4)),
      n_publications: profile.n_publications,
      latest_year: profile.latest_year,
      total_citations: profile.total_citations,
      h_index: profile.h_index,
      profile_status: profile.profile_status,
      collaboration_status: profile.collaboration_status,
      overlap_topics: personTopics.slice(0, 5).map((t) => ({
        topic: t.topic,
        n_papers: t.n_papers,
        latest_year: t.latest_year,
      })),
      evidence: relevant.slice(0, 4).flatMap((h) => {
        const pub = pubById.get(h.publication_id);
        if (!pub) return [];
        return [
          {
            publication_id: pub.publication_id,
            title: pub.title,
            year: pub.publication_year,
            venue: pub.venue,
            url: pub.publication_url,
            similarity: Number((h.similarity / (best || 1)).toFixed(3)),
          },
        ];
      }),
      rationale: "",
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const shortlist = candidates.slice(0, 6);

  // Breadth, not score, is what tells us whether campus really covers this.
  const weakField =
    shortlist.length === 0 || (shortlist[0]!.depth <= 1 && shortlist[0]!.breadth <= 1);

  await writeRationales(shortlist, brief);

  return {
    project_id: project.project_id,
    generated_at: new Date().toISOString(),
    method,
    genie_answer: genie.result?.text ?? null,
    genie_sql: genie.result?.sql ?? null,
    weak_field: weakField,
    note: weakField
      ? "No one on campus has sustained work in this area. Each candidate below has a single loosely related paper, so treat these as conversations worth having rather than strong overlap."
      : `${shortlist.length} faculty have published work that overlaps this idea. Ranked by how close the overlap is and how many distinct papers and topics it spans.`,
    matches: shortlist,
  };
}

/** One honest sentence per candidate, grounded in the evidence rows. */
async function writeRationales(matches: FacultyMatch[], brief: ProjectBrief) {
  const fallback = (m: FacultyMatch) => {
    const topic = m.overlap_topics[0];
    const paper = m.evidence[0];
    if (topic && paper) {
      return `${m.depth} paper${m.depth === 1 ? "" : "s"} overlap this idea, concentrated in ${topic.topic} (${topic.n_papers} publications, most recent ${topic.latest_year}). Closest is "${paper.title}" (${paper.year}).`;
    }
    return `${m.depth} publication${m.depth === 1 ? "" : "s"} overlap this idea.`;
  };

  if (!hasGemini() || !matches.length) {
    matches.forEach((m) => (m.rationale = fallback(m)));
    return;
  }

  const payload = matches.map((m) => ({
    faculty_id: m.faculty_id,
    name: m.faculty_name,
    topics: m.overlap_topics,
    papers: m.evidence.map((e) => ({ title: e.title, year: e.year })),
    depth: m.depth,
  }));

  try {
    const text = await chat(
      [
        {
          role: "system",
          content:
            "You explain research overlap to undergraduates. For each faculty member, write one sentence " +
            "(max 30 words) saying what part of their published work overlaps the student's idea, naming a " +
            "real topic or paper. Never claim they are available, interested, or accepting students. " +
            'Reply as JSON: {"RVCE-CSE-001": "sentence"} and nothing else.',
        },
        {
          role: "user",
          content: `Student idea: ${brief.title} - ${brief.one_liner}\nProblem: ${brief.problem}\n\nCandidates:\n${JSON.stringify(payload)}`,
        },
      ],
      { temperature: 0.2, maxTokens: 800 },
    );
    const start = text.indexOf("{");
    const parsed = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1)) as Record<string, string>;
    matches.forEach((m) => (m.rationale = parsed[m.faculty_id]?.trim() || fallback(m)));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[netree] rationale generation failed, using evidence summary:", err);
    matches.forEach((m) => (m.rationale = fallback(m)));
  }
}
