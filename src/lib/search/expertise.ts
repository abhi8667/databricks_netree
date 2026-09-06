import "server-only";
import { gold, hasGenie, hasWarehouse } from "@/lib/env";
import { askGenie, genieRows, type GenieResult } from "@/lib/databricks/genie";
import { query } from "@/lib/databricks/sql";
import { referenceData } from "@/lib/store/reference";
import type { LinkedTopic } from "./topics";

/**
 * The expertise retrieval step — Genie's job.
 *
 * Once an idea has been grounded in real topic labels, "who has the experience
 * for this" stops being a similarity question and becomes an aggregation:
 * which faculty publish in these topics, how many papers each, how recently.
 * That is SQL, and Genie writes it from the labels plus the column comments on
 * netree.gold.
 *
 * Genie is asked for *facts*, never for a ranking. If it ranked, it would
 * write slightly different SQL every run and the results would stop being
 * reproducible or testable. The weighting lives in `match.ts` where it can be
 * held to an eval.
 *
 * Three tiers, in order: Genie, the same question as hand-written SQL, then
 * the local CSV mirror. A failure at any tier is reported, never silent.
 */

export type ExpertiseRow = {
  faculty_id: string;
  topic: string;
  n_papers: number;
  latest_year: number;
  citations: number;
  is_active_topic: boolean;
};

export type ExpertiseResult = {
  rows: ExpertiseRow[];
  source: "genie" | "sql" | "local";
  genie: GenieResult | null;
  /** Set when Genie was asked but could not carry the answer. */
  degraded: string | null;
};

const num = (v: unknown) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

/** Genie names columns however it likes; find the one that means what we need. */
function pick(row: Record<string, string | null>, ...names: string[]) {
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find((k) => k.toLowerCase() === name);
    if (hit && row[hit] !== null && row[hit] !== "") return row[hit];
  }
  return null;
}

export function genieQuestion(topics: LinkedTopic[]) {
  const list = topics.map((t) => `"${t.topic}"`).join(", ");
  return (
    `Using faculty_topic joined to faculty_expertise, list every faculty member who has ` +
    `published in any of these research topics: ${list}. ` +
    `Return one row per faculty member per topic with the columns faculty_id, faculty_name, ` +
    `topic, n_papers, latest_year, citations and is_active_topic. ` +
    `Do not aggregate across topics and do not rank — return every matching row, limit 200.`
  );
}

async function fromGenie(topics: LinkedTopic[]): Promise<ExpertiseResult | null> {
  if (!hasGenie()) return null;
  const wanted = new Map(topics.map((t) => [t.topic.toLowerCase(), t.topic]));

  let result: GenieResult;
  try {
    result = await askGenie(genieQuestion(topics));
  } catch (err) {
    console.warn("[netree] Genie expertise query failed:", err);
    return { rows: [], source: "genie", genie: null, degraded: String(err).slice(0, 200) };
  }

  const rows: ExpertiseRow[] = [];
  for (const row of genieRows(result)) {
    const facultyId = pick(row, "faculty_id", "facultyid", "id");
    const topic = pick(row, "topic", "topic_name", "research_topic");
    if (!facultyId || !topic) continue;
    // Only labels we asked for — Genie occasionally widens a query on its own.
    const canonical = wanted.get(topic.trim().toLowerCase());
    if (!canonical) continue;
    rows.push({
      faculty_id: facultyId.trim(),
      topic: canonical,
      n_papers: num(pick(row, "n_papers", "num_papers", "paper_count", "papers")),
      latest_year: num(pick(row, "latest_year", "last_year", "max_year")),
      citations: num(pick(row, "citations", "total_citations", "cited_by_count")),
      is_active_topic: String(pick(row, "is_active_topic", "active") ?? "").toLowerCase() === "true",
    });
  }

  if (!rows.length) {
    return {
      rows: [],
      source: "genie",
      genie: result,
      degraded: "Genie answered but returned no rows we could read as faculty topics.",
    };
  }
  return { rows, source: "genie", genie: result, degraded: null };
}

/** The same question, written by hand. The backstop when Genie is unavailable. */
async function fromSql(topics: LinkedTopic[]): Promise<ExpertiseRow[]> {
  if (!hasWarehouse()) return [];
  const params = topics.map((t, i) => ({ name: `t${i}`, value: t.topic }));
  const placeholders = params.map((p) => `:${p.name}`).join(", ");
  const rows = await query<Record<string, string>>(
    `SELECT faculty_id, topic, n_papers, latest_year, citations, is_active_topic
       FROM ${gold("faculty_topic")}
      WHERE topic IN (${placeholders})`,
    params,
  );
  return rows.map((r) => ({
    faculty_id: r.faculty_id!,
    topic: r.topic!,
    n_papers: num(r.n_papers),
    latest_year: num(r.latest_year),
    citations: num(r.citations),
    is_active_topic: String(r.is_active_topic).toLowerCase() === "true",
  }));
}

async function fromLocal(topics: LinkedTopic[]): Promise<ExpertiseRow[]> {
  const wanted = new Set(topics.map((t) => t.topic));
  const { topics: rows } = await referenceData();
  return rows
    .filter((r) => wanted.has(r.topic))
    .map((r) => ({
      faculty_id: r.faculty_id,
      topic: r.topic,
      n_papers: r.n_papers,
      latest_year: r.latest_year,
      citations: r.citations,
      is_active_topic: r.is_active_topic,
    }));
}

export async function retrieveExpertise(topics: LinkedTopic[]): Promise<ExpertiseResult> {
  if (!topics.length) return { rows: [], source: "local", genie: null, degraded: null };

  const genie = await fromGenie(topics);
  if (genie?.rows.length) return genie;

  const carried = genie?.genie ?? null;
  const degraded = genie?.degraded ?? null;

  if (hasWarehouse()) {
    try {
      const rows = await fromSql(topics);
      if (rows.length) return { rows, source: "sql", genie: carried, degraded };
    } catch (err) {
      console.warn("[netree] expertise SQL failed, using the local mirror:", err);
    }
  }
  return { rows: await fromLocal(topics), source: "local", genie: carried, degraded };
}
