import "server-only";
import { hasGemini } from "@/lib/env";
import { chatJson } from "@/lib/ai/gemini";
import { referenceData } from "@/lib/store/reference";
import { searchPublications, tokenize } from "./vectors";
import type { ProjectBrief } from "@/lib/types";

/**
 * Grounding an idea in the department's own vocabulary.
 *
 * `faculty_topic` carries 449 OpenAlex topic labels — a controlled vocabulary,
 * not free text — and for every faculty member how many papers they have in
 * each, how recent, and how cited. That is the table that can actually answer
 * "who has the experience for this idea", and it is what Genie can query in
 * SQL. But it can only be queried with labels that exist.
 *
 * So the first step of matching is entity linking: turn a student's prose into
 * a weighted set of real labels. The model *selects* from the vocabulary, it
 * never writes a label, because a label that does not exist joins to nothing
 * and fails silently.
 */

export type LinkedTopic = { topic: string; weight: number; dept_papers: number };
export type TopicLink = { topics: LinkedTopic[]; source: "gemini" | "derived" };

const MAX_TOPICS = 8;

type Vocabulary = { labels: string[]; deptPapers: Map<string, number>; canonical: Map<string, string> };

let vocab: Vocabulary | null = null;
let vocabAt = 0;
const TTL = 10 * 60_000;

/** Every topic label the department actually publishes in, with its size. */
export async function vocabulary(): Promise<Vocabulary> {
  if (vocab && Date.now() - vocabAt < TTL) return vocab;
  const { topics } = await referenceData();
  const deptPapers = new Map<string, number>();
  for (const row of topics) {
    deptPapers.set(row.topic, (deptPapers.get(row.topic) ?? 0) + row.n_papers);
  }
  const labels = [...deptPapers.keys()].sort();
  const canonical = new Map(labels.map((l) => [l.toLowerCase(), l]));
  vocab = { labels, deptPapers, canonical };
  vocabAt = Date.now();
  return vocab;
}

function briefText(brief: ProjectBrief) {
  return [
    brief.title,
    brief.one_liner,
    brief.domain_tags.join(", "),
    brief.problem,
    brief.approach,
    brief.skills_needed.join(", "),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Fallback path, and a good one: the corpus already knows which topics a piece
 * of text belongs to. Retrieve the publications closest to the idea, then read
 * the labels off them, weighted by how close each paper was. Every label this
 * produces exists by construction, and it needs no model at all — which is
 * what keeps local mode honest.
 */
async function derivedTopics(brief: ProjectBrief): Promise<LinkedTopic[]> {
  const { deptPapers } = await vocabulary();
  const { publications } = await referenceData();
  const byId = new Map(publications.map((p) => [p.publication_id, p]));

  const hits = await searchPublications(briefText(brief), 60);
  if (!hits.length) return [];

  const best = hits[0]!.similarity || 1;
  const weight = new Map<string, number>();
  for (const hit of hits) {
    const pub = byId.get(hit.publication_id);
    if (!pub) continue;
    const share = hit.similarity / best;
    for (const raw of pub.topics_all.split(";")) {
      const topic = raw.trim();
      if (!topic || !deptPapers.has(topic)) continue;
      weight.set(topic, (weight.get(topic) ?? 0) + share);
    }
  }
  if (!weight.size) return [];

  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TOPICS);
  const top = ranked[0]![1];
  return ranked
    .map(([topic, w]) => ({
      topic,
      weight: Number((w / top).toFixed(3)),
      dept_papers: deptPapers.get(topic) ?? 0,
    }))
    .filter((t) => t.weight >= 0.15);
}

/**
 * Gemini picks from the list. The whole vocabulary is ~3k tokens, so it all
 * goes in the prompt — no retrieval step to get wrong, and the model is doing
 * classification against a fixed label set rather than generation.
 */
async function geminiTopics(brief: ProjectBrief): Promise<LinkedTopic[]> {
  const { labels, deptPapers, canonical } = await vocabulary();

  const out = await chatJson<{ topics: { topic: string; weight: number }[] }>(
    [
      {
        role: "system",
        content:
          "You map a student's research idea onto a fixed list of academic topic labels.\n" +
          "Rules:\n" +
          `- Choose ONLY labels that appear verbatim in the provided list. Never write a new label.\n` +
          `- Choose at most ${MAX_TOPICS}, ordered most central first.\n` +
          "- weight is 1.0 for the topic the project is actually about, lower for supporting areas.\n" +
          "- If nothing in the list genuinely describes the idea, return an empty array. An empty " +
          "answer is correct and useful; a loose match is not.\n" +
          'Reply as JSON only: {"topics":[{"topic":"exact label","weight":0.0}]}',
      },
      {
        role: "user",
        content: `IDEA\n${briefText(brief)}\n\nAVAILABLE LABELS\n${labels.join("\n")}`,
      },
    ],
    { temperature: 0.1, maxTokens: 700 },
  );

  const seen = new Set<string>();
  const picked: LinkedTopic[] = [];
  for (const row of out.topics ?? []) {
    // Anything not in the vocabulary is dropped rather than trusted - this is
    // the guard that makes a hallucinated label harmless instead of silent.
    const topic = canonical.get(String(row.topic ?? "").trim().toLowerCase());
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    picked.push({
      topic,
      weight: Math.min(Math.max(Number(row.weight) || 0, 0), 1) || 0.5,
      dept_papers: deptPapers.get(topic) ?? 0,
    });
    if (picked.length >= MAX_TOPICS) break;
  }
  return picked;
}

export async function linkTopics(brief: ProjectBrief): Promise<TopicLink> {
  if (hasGemini()) {
    try {
      const topics = await geminiTopics(brief);
      // One label is not enough to rank on - fall through and let the corpus
      // widen it rather than matching the whole department on a single tag.
      if (topics.length >= 2) return { topics, source: "gemini" };
    } catch (err) {
      console.warn("[netree] topic linking fell back to the corpus:", err);
    }
  }
  return { topics: await derivedTopics(brief), source: "derived" };
}

/** Department-wide publication count across the linked topics. */
export function topicCoverage(topics: LinkedTopic[]) {
  return topics.reduce((sum, t) => sum + t.dept_papers, 0);
}

/**
 * How concentrated the linking is, 0-1, where 1 is perfectly flat.
 *
 * A grounded idea has one topic it is clearly about and a tail of supporting
 * ones - phishing links at 1.00, 0.44, 0.37, 0.36. An idea the department has
 * no vocabulary for links to everything equally, because the retrieval behind
 * it is noise: protein folding links at 1.00, 0.99, 0.85, 0.79, 0.69 across
 * quantum computing, stock forecasting and data storage. Eight topics that fit
 * equally well means none of them fit.
 */
export function flatness(topics: LinkedTopic[]) {
  if (topics.length < 2) return 0;
  const tail = topics.slice(1);
  return tail.reduce((sum, t) => sum + t.weight, 0) / tail.length;
}

/** Rare topics discriminate; department-wide ones do not. */
export function specificity(deptPapers: number, corpusSize = 650) {
  return Math.log(corpusSize / (deptPapers + 1));
}

export { briefText, tokenize };
