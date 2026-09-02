import "server-only";
import { hasServing } from "@/lib/env";
import { chatJson, type ChatMessage } from "@/lib/databricks/serving";
import type { IdeaTurn, ProjectBrief } from "@/lib/types";

/**
 * The idea interview.
 *
 * A student arrives with a sentence. Faculty matching needs a paragraph with
 * a problem, an approach and a domain in it. This agent closes that gap by
 * asking one question at a time, and stops asking the moment it can fill the
 * brief - a fixed questionnaire would ask a student who already wrote three
 * paragraphs the same five questions as one who wrote a line.
 */

const SYSTEM = `You are the idea desk for Netree, a campus research collaboration platform.

A student is describing a project idea. Your job is to shape it into a brief a
professor can judge in thirty seconds.

Rules:
- Ask exactly ONE question per turn. Keep it under 25 words, concrete, and
  answerable by an undergraduate. No compound questions.
- Prioritise what the matching engine needs: the problem being solved, the
  technical approach, the domain, and what the student needs help with.
- Never ask for information the student already gave you.
- Ask at most 5 questions total. Set "ready" to true as soon as you can write a
  usable brief, even if some fields are thin - put what is still unknown in
  open_questions rather than asking a sixth question.
- Never invent facts the student did not say. Empty is better than made up.

Reply with JSON only, in this exact shape:
{
  "reply": "your single question, or a short confirmation when ready",
  "ready": false,
  "brief": null
}

When ready is true, "brief" must be:
{
  "title": "short project title",
  "one_liner": "one sentence a professor could skim",
  "problem": "2-3 sentences on what is broken today",
  "approach": "2-3 sentences on how the student intends to tackle it",
  "domain_tags": ["research area", "..."],
  "deliverables": ["what will exist at the end"],
  "skills_have": ["what the student can already do"],
  "skills_needed": ["what they need from a mentor or collaborator"],
  "timeline": "e.g. one semester",
  "resources": "hardware, datasets, lab access needed",
  "open_questions": ["anything still undecided"]
}`;

export type IdeaResponse = {
  reply: string;
  ready: boolean;
  brief: ProjectBrief | null;
  /** Which engine produced this turn, surfaced in the UI as provenance. */
  source: "model-serving" | "guided";
};

/** Questions the guided path walks through when Model Serving is unavailable. */
const GUIDED = [
  "What problem does this solve, and who feels it today?",
  "How would you build it? Name the techniques or tools you have in mind.",
  "Which research area does this sit closest to - vision, security, networks, data, something else?",
  "What can you already do yourself, and where do you need a mentor?",
  "What would exist at the end of it, and over what time frame?",
];

export async function nextIdeaTurn(transcript: IdeaTurn[]): Promise<IdeaResponse> {
  const userTurns = transcript.filter((t) => t.role === "user");

  if (hasServing()) {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM },
        ...transcript.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      ];
      const out = await chatJson<{ reply: string; ready: boolean; brief: ProjectBrief | null }>(
        messages,
      );
      return {
        reply: out.reply,
        ready: Boolean(out.ready && out.brief),
        brief: out.ready ? normaliseBrief(out.brief) : null,
        source: "model-serving",
      };
    } catch (err) {
      console.warn("[netree] idea agent fell back to the guided script:", err);
    }
  }

  // Guided path: same interview, fixed order, no model required. The opening
  // sentence is the first answer, so the next question is the one after it.
  const next = userTurns.length - 1;
  if (next >= 0 && next < GUIDED.length) {
    return { reply: GUIDED[next]!, ready: false, brief: null, source: "guided" };
  }
  return {
    reply: "That is enough to write the brief. Review it and edit anything that reads wrong.",
    ready: true,
    brief: heuristicBrief(transcript),
    source: "guided",
  };
}

function normaliseBrief(brief: ProjectBrief | null): ProjectBrief {
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
  return {
    title: brief?.title?.trim() || "Untitled project",
    one_liner: brief?.one_liner?.trim() || "",
    problem: brief?.problem?.trim() || "",
    approach: brief?.approach?.trim() || "",
    domain_tags: arr(brief?.domain_tags),
    deliverables: arr(brief?.deliverables),
    skills_have: arr(brief?.skills_have),
    skills_needed: arr(brief?.skills_needed),
    timeline: brief?.timeline?.trim() || "",
    resources: brief?.resources?.trim() || "",
    open_questions: arr(brief?.open_questions),
  };
}

/**
 * Assembles a brief from the answers themselves. Deliberately extractive: it
 * quotes the student rather than paraphrasing, because a guessed paraphrase in
 * a document a professor will read is worse than a blunt one.
 */
function heuristicBrief(transcript: IdeaTurn[]): ProjectBrief {
  const answers = transcript.filter((t) => t.role === "user").map((t) => t.content.trim());
  const [seed = "", problem = "", approach = "", domain = "", skills = "", outcome = ""] = answers;

  const firstSentence = (text: string) =>
    (text.split(/(?<=[.!?])\s/)[0] ?? text).slice(0, 180).trim();

  const words = `${seed} ${domain}`.toLowerCase();
  const KNOWN: [RegExp, string][] = [
    [/vision|image|video|camera|surveillance|detect/, "Computer Vision"],
    [/security|phish|attack|malware|intrusion|encrypt/, "Network Security and Intrusion Detection"],
    [/cloud|kubernetes|container|serverless|scaling/, "Cloud Computing and Resource Management"],
    [/network|traffic|routing|protocol|5g|iot/, "Internet Traffic Analysis"],
    [/neural|deep learning|transformer|llm|model|nlp|language/, "Advanced Neural Network Applications"],
    [/anomaly|fraud|outlier/, "Anomaly Detection"],
    [/privacy|anonym|federated/, "Privacy Preserving Data Publishing"],
    [/data|database|query|pipeline|warehouse/, "Data Management and Algorithms"],
  ];
  const tags = KNOWN.filter(([re]) => re.test(words)).map(([, tag]) => tag);
  if (domain) tags.unshift(firstSentence(domain));

  // A title, not a sentence: the first clause, capped, with no trailing comma.
  const title =
    seed
      .split(/\s+/)
      .slice(0, 9)
      .join(" ")
      .replace(/[,;:.\s]+$/, "") || "Untitled project";

  return {
    title,
    one_liner: firstSentence(seed),
    problem: problem || seed,
    approach,
    domain_tags: [...new Set(tags)].slice(0, 6),
    deliverables: outcome ? [firstSentence(outcome)] : [],
    skills_have: skills ? [skills] : [],
    skills_needed: [],
    timeline: /semester|month|week|year/i.test(outcome) ? firstSentence(outcome) : "",
    resources: "",
    open_questions: [
      !approach && "How the system will actually be built",
      !outcome && "What the finished project looks like",
    ].filter(Boolean) as string[],
  };
}
