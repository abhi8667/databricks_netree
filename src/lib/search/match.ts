import "server-only";
import { hasGemini } from "@/lib/env";
import { chat } from "@/lib/ai/gemini";
import { referenceData } from "@/lib/store/reference";
import { searchPublications } from "./vectors";
import { briefText, flatness, linkTopics, specificity, topicCoverage, type LinkedTopic } from "./topics";
import { retrieveExpertise } from "./expertise";
import type { FacultyMatch, MatchReport, Project, ProjectBrief } from "@/lib/types";

/**
 * Faculty matching.
 *
 * Ranking used to start from text similarity: embed the idea, cosine it
 * against 650 publications, group the winners by author. That inverts the
 * evidence. Similarity has no absolute scale — SCHEMA.md section 11 measured
 * an out-of-scope idea scoring 0.327, above a legitimate third-place match —
 * so "closest paper" cannot tell you whether campus covers a subject at all,
 * and a corpus that is 3% populated produces a confident, wrong shortlist.
 *
 * The order is now:
 *
 *   1. Ground the idea in the department's own 449 topic labels (topics.ts).
 *   2. Ask Genie which faculty publish in those topics, with counts and years
 *      (expertise.ts). This produces the candidate set.
 *   3. Score deterministically, here, so the ranking is reproducible and can
 *      be held to `npm run eval:match`.
 *   4. Only then use embeddings, scoped to the candidates, to pick which of
 *      *their* papers to show and to break ties between close candidates.
 *
 * Two dataset facts shape the weights. Three faculty hold half the corpus, so
 * paper counts are log-damped and topic rarity is weighted — a department-wide
 * label like "Advanced Neural Network Applications" cannot carry a candidate
 * who is missing the topic the project is actually about. And the department
 * clusters narrowly, so an idea that maps to no well-populated label is
 * reported as a weak field rather than filled with the least-bad answers.
 */

/** How much the evidence papers can move an order set by topic expertise. */
const EVIDENCE_WEIGHT = 0.28;
/** Below this many department papers across the linked topics, nobody is a fit. */
const MIN_DEPT_PAPERS = 5;
/**
 * The topic the idea is actually about has to be one the department publishes
 * in. Summing across every linked topic is not enough - eight unrelated topics
 * of four papers each add up to a number that looks like coverage and is not.
 */
const MIN_PRIMARY_PAPERS = 10;
/**
 * Above this, a *derived* linking is scattered and no topic genuinely won.
 *
 * Only the derived path is held to it, because the two paths produce weights
 * that are not the same quantity. Derived weights are shares of retrieval mass,
 * so a real match decays fast (1.00, 0.44, 0.37) and noise stays flat (1.00,
 * 0.99, 0.85). Gemini's weights are judgements of importance and sit high
 * across the board (1, 0.9, 0.8) even when the primary topic is exactly right.
 * One threshold cannot mean the same thing in both.
 */
const MAX_DERIVED_FLATNESS = 0.65;
/** Papers in a topic before it counts fully towards coverage. */
const DEPTH_FOR_FULL_CREDIT = 2;
const SHORTLIST = 6;

/**
 * The search text used for evidence selection. Title, one-liner and research
 * areas are repeated because they name the subject, while the problem and
 * approach paragraphs carry incidental vocabulary that matches papers about
 * something else entirely.
 */
export function briefToQuery(brief: ProjectBrief) {
  const subject = [brief.title, brief.one_liner, brief.domain_tags.join(" ")]
    .filter(Boolean)
    .join("\n");
  return [subject, subject, brief.problem, brief.approach, brief.skills_needed.join(" ")]
    .filter(Boolean)
    .join("\n");
}

type Candidate = {
  faculty_id: string;
  topicScore: number;
  coverage: number;
  depth: number;
  matched: { topic: string; n_papers: number; latest_year: number }[];
};

/**
 * Expertise rows -> a ranked candidate list.
 *
 * `specificity` weights a topic by how rare it is in the department, so
 * matching on "Spam and Phishing Detection" counts for more than matching on a
 * label half the department publishes under. `coverage` is the share of the
 * idea's topic weight a person actually covers, raised above linear: someone
 * strong in a supporting area but absent from the core topic should not
 * outrank someone who works on the thing itself.
 */
function scoreCandidates(
  rows: { faculty_id: string; topic: string; n_papers: number; latest_year: number; is_active_topic: boolean }[],
  topics: LinkedTopic[],
): Candidate[] {
  const weightOf = new Map(topics.map((t) => [t.topic, t.weight]));
  const deptOf = new Map(topics.map((t) => [t.topic, t.dept_papers]));
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0) || 1;

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!weightOf.has(row.topic)) continue;
    const list = grouped.get(row.faculty_id) ?? [];
    list.push(row);
    grouped.set(row.faculty_id, list);
  }

  const out: Candidate[] = [];
  for (const [facultyId, hits] of grouped) {
    let base = 0;
    let covered = 0;
    let depth = 0;
    const seen = new Set<string>();

    for (const hit of hits) {
      if (seen.has(hit.topic)) continue;
      seen.add(hit.topic);
      const weight = weightOf.get(hit.topic)!;
      const recency = hit.is_active_topic || hit.latest_year >= 2023 ? 1 : 0.65;
      base += weight * specificity(deptOf.get(hit.topic) ?? 0) * Math.log1p(hit.n_papers) * recency;
      // Coverage has to mean the person actually works in the area, not that
      // they brushed against it once. A prolific author touches many topics
      // with a single paper each; counted flat, that breadth outscores someone
      // with six papers on the subject itself. A lone paper counts half.
      covered += weight * Math.min(hit.n_papers / DEPTH_FOR_FULL_CREDIT, 1);
      depth += hit.n_papers;
    }

    if (base <= 0) continue;
    const coverage = covered / totalWeight;
    out.push({
      faculty_id: facultyId,
      topicScore: base * Math.pow(coverage, 1.5),
      coverage,
      depth,
      matched: hits
        .filter((h, i, arr) => arr.findIndex((x) => x.topic === h.topic) === i)
        .sort((a, b) => b.n_papers - a.n_papers)
        .map((h) => ({ topic: h.topic, n_papers: h.n_papers, latest_year: h.latest_year })),
    });
  }

  return out.sort((a, b) => b.topicScore - a.topicScore);
}

export async function matchFaculty(project: Project): Promise<MatchReport> {
  const brief = project.brief;
  if (!brief) throw new Error("Project has no structured brief yet");

  // 1. Ground the idea in the controlled vocabulary.
  const { topics, source: topicSource } = await linkTopics(brief);
  const deptPapers = topicCoverage(topics);

  const method: string[] = [
    topicSource === "gemini"
      ? "Topics linked by Gemini from the department vocabulary"
      : "Topics derived from the closest publications",
  ];

  // The gate that carries the abstention is MIN_PRIMARY_PAPERS: whatever the
  // idea is mainly about has to be something the department actually publishes
  // in. Across both linking paths that separates cleanly - the three benchmark
  // ideas land on topics with 24, 40 and 26 department papers, while protein
  // folding lands on one with 1.
  const primary = topics[0];
  const spread = topicSource === "derived" ? flatness(topics) : 0;
  const ungrounded =
    !topics.length ||
    deptPapers < MIN_DEPT_PAPERS ||
    (primary?.dept_papers ?? 0) < MIN_PRIMARY_PAPERS ||
    spread > MAX_DERIVED_FLATNESS;

  if (ungrounded) {
    return {
      project_id: project.project_id,
      generated_at: new Date().toISOString(),
      method,
      genie_answer: null,
      genie_sql: null,
      topics,
      topic_source: topicSource,
      weak_field: true,
      note: !topics.length
        ? "This idea does not map onto any research area the department publishes in. There is no match to show, and a loose one would waste your time and theirs."
        : spread > MAX_DERIVED_FLATNESS
          ? `This idea spreads thinly across ${topics.length} unrelated areas (${topics.slice(0, 3).map((t) => t.topic).join(", ")}) without settling in any of them. That is what it looks like when the department has no vocabulary for a subject.`
          : `The closest research area on campus is ${primary!.topic}, where the whole department has ${primary!.dept_papers} publication${primary!.dept_papers === 1 ? "" : "s"}. Nobody here has sustained work in this area.`,
      matches: [],
    };
  }

  // 2. Genie retrieves who publishes in those topics.
  const expertise = await retrieveExpertise(topics);
  method.push(
    expertise.source === "genie"
      ? "Genie SQL over netree.gold.faculty_topic"
      : expertise.source === "sql"
        ? "Direct SQL over netree.gold.faculty_topic"
        : "Local faculty_topic mirror",
  );
  if (expertise.degraded) console.warn("[netree] Genie degraded:", expertise.degraded);

  // 3. Deterministic ranking.
  const ranked = scoreCandidates(expertise.rows, topics);
  const reference = await referenceData();
  const { faculty, publications, bridge } = reference;
  const profileOf = new Map(faculty.map((f) => [f.faculty_id, f]));
  const pubById = new Map(publications.map((p) => [p.publication_id, p]));

  // 4. Embeddings, scoped: which of *their* papers is this idea closest to.
  const hits = await searchPublications(briefToQuery(brief), 400);
  const simOf = new Map(hits.map((h) => [h.publication_id, h.similarity]));
  const bestSim = hits[0]?.similarity ?? 0;
  method.push(bestSim ? "Evidence papers ranked by embedding similarity" : "Evidence papers ranked by citations");

  const pubsOf = new Map<string, string[]>();
  for (const link of bridge) {
    const list = pubsOf.get(link.faculty_id) ?? [];
    list.push(link.publication_id);
    pubsOf.set(link.faculty_id, list);
  }

  const matchedTopics = new Set(topics.map((t) => t.topic));
  const pool = ranked.slice(0, SHORTLIST * 2);
  const topScore = pool[0]?.topicScore || 1;

  const candidates: FacultyMatch[] = [];
  for (const candidate of pool) {
    const profile = profileOf.get(candidate.faculty_id);
    if (!profile) continue;

    // Their own publications that sit in one of the matched topics, ordered by
    // how close each is to the idea. Citations stand in when no vectors exist,
    // so the card is never empty and never arbitrary.
    const own = (pubsOf.get(candidate.faculty_id) ?? [])
      .map((id) => pubById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .filter((p) => p.topics_all.split(";").some((t) => matchedTopics.has(t.trim())))
      .map((p) => ({ pub: p, sim: simOf.get(p.publication_id) ?? 0 }))
      .sort((a, b) => b.sim - a.sim || b.pub.cited_by_count - a.pub.cited_by_count);

    const closeness = bestSim ? Math.min((own[0]?.sim ?? 0) / bestSim, 1) : 0;
    const score = (candidate.topicScore / topScore) * (1 - EVIDENCE_WEIGHT) + closeness * EVIDENCE_WEIGHT;

    candidates.push({
      faculty_id: candidate.faculty_id,
      faculty_name: profile.faculty_name,
      designation: profile.designation,
      department: profile.department,
      closeness: Number(closeness.toFixed(3)),
      depth: candidate.depth,
      breadth: candidate.matched.length,
      coverage: Number(candidate.coverage.toFixed(3)),
      score: Number(score.toFixed(4)),
      n_publications: profile.n_publications,
      latest_year: profile.latest_year,
      total_citations: profile.total_citations,
      h_index: profile.h_index,
      profile_status: profile.profile_status,
      collaboration_status: profile.collaboration_status,
      overlap_topics: candidate.matched.slice(0, 5),
      evidence: own.slice(0, 4).map(({ pub, sim }) => ({
        publication_id: pub.publication_id,
        title: pub.title,
        year: pub.publication_year,
        venue: pub.venue,
        url: pub.publication_url,
        similarity: Number((bestSim ? sim / bestSim : 0).toFixed(3)),
      })),
      rationale: "",
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const shortlist = candidates.slice(0, SHORTLIST);

  // Breadth and depth together, as SCHEMA.md section 11 concluded — a single
  // paper on a peripheral topic is a conversation, not a match.
  const weakField =
    shortlist.length === 0 || (shortlist[0]!.depth <= 1 && shortlist[0]!.breadth <= 1);

  await writeRationales(shortlist, brief, topics);

  return {
    project_id: project.project_id,
    generated_at: new Date().toISOString(),
    method,
    genie_answer: expertise.genie?.text ?? null,
    genie_sql: expertise.genie?.sql ?? null,
    topics,
    topic_source: topicSource,
    weak_field: weakField,
    note: weakField
      ? "No one on campus has sustained work in this area. Each candidate below has a single loosely related paper, so treat these as conversations worth having rather than strong overlap."
      : `${shortlist.length} faculty publish in ${topics.slice(0, 3).map((t) => t.topic).join(", ")}. Ranked by how many papers they have in those areas, how recent, and how closely their strongest paper matches this idea.`,
    matches: shortlist,
  };
}

/** One honest sentence per candidate, grounded in the retrieved facts. */
async function writeRationales(matches: FacultyMatch[], brief: ProjectBrief, topics: LinkedTopic[]) {
  const fallback = (m: FacultyMatch) => {
    const topic = m.overlap_topics[0];
    const paper = m.evidence[0];
    if (topic && paper) {
      return `${topic.n_papers} paper${topic.n_papers === 1 ? "" : "s"} in ${topic.topic}, most recent ${topic.latest_year}. Closest to your idea is "${paper.title}" (${paper.year}).`;
    }
    if (topic) {
      return `${topic.n_papers} paper${topic.n_papers === 1 ? "" : "s"} in ${topic.topic}, most recent ${topic.latest_year}.`;
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
    papers_in_area: m.depth,
  }));

  try {
    const text = await chat(
      [
        {
          role: "system",
          content:
            "You explain research overlap to undergraduates. For each faculty member, write one sentence " +
            "(max 30 words) saying what part of their published work overlaps the student's idea, naming a " +
            "real topic or paper from the data given. Use only the facts provided — never invent a paper, a " +
            "count or a year. Never claim they are available, interested, or accepting students. " +
            'Reply as JSON: {"RVCE-CSE-001": "sentence"} and nothing else.',
        },
        {
          role: "user",
          content:
            `Student idea: ${brief.title} - ${brief.one_liner}\n` +
            `Problem: ${brief.problem}\n` +
            `Research areas: ${topics.map((t) => t.topic).join(", ")}\n\n` +
            `Candidates:\n${JSON.stringify(payload)}`,
        },
      ],
      { temperature: 0.2, maxTokens: 800 },
    );
    const start = text.indexOf("{");
    const parsed = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1)) as Record<string, string>;
    matches.forEach((m) => (m.rationale = parsed[m.faculty_id]?.trim() || fallback(m)));
  } catch (err) {
    console.warn("[netree] rationale generation failed, using evidence summary:", err);
    matches.forEach((m) => (m.rationale = fallback(m)));
  }
}

export { briefText };
