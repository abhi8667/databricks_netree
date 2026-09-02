import "server-only";
import path from "node:path";
import { rethrowFrameworkError } from "@/lib/framework-error";
import { hasWarehouse, gold, silver } from "@/lib/env";
import { query } from "@/lib/databricks/sql";
import { readCsv, num, maybeNum, bool } from "./csv";
import type { FacultyProfile, FacultyTopic, PublicationLite } from "@/lib/types";

/**
 * Read side of the campus dataset. Backed by Unity Catalog gold tables when a
 * warehouse is configured; otherwise by the same CSVs that get loaded into it,
 * so the product behaves identically with or without a cluster attached.
 */

const DATA_DIR = path.join(process.cwd(), "Data", "delta");

type Cache = {
  faculty: FacultyProfile[];
  topics: FacultyTopic[];
  publications: PublicationLite[];
  bridge: { faculty_id: string; publication_id: string }[];
  embeddingText: Map<string, string>;
};

let cache: Cache | null = null;
let cacheAt = 0;
const TTL = 5 * 60_000;

function loadLocal(): Cache {
  const faculty = readCsv(path.join(DATA_DIR, "gold_faculty_expertise.csv")).map(toFaculty);
  const topics = readCsv(path.join(DATA_DIR, "faculty_topic.csv")).map(toTopic);
  const pubRows = readCsv(path.join(DATA_DIR, "dim_publication.csv"));
  const publications = pubRows.map(toPublication);
  const bridge = readCsv(path.join(DATA_DIR, "bridge_faculty_publication.csv")).map((r) => ({
    faculty_id: r.faculty_id!,
    publication_id: r.publication_id!,
  }));
  const embeddingText = new Map<string, string>();
  for (const r of readCsv(path.join(DATA_DIR, "publication_embedding_input.csv"))) {
    embeddingText.set(r.publication_id!, r.embedding_text ?? "");
  }
  return { faculty, topics, publications, bridge, embeddingText };
}

function toFaculty(r: Record<string, string>): FacultyProfile {
  return {
    faculty_id: r.faculty_id!,
    faculty_name: r.faculty_name!,
    designation: r.designation ?? "",
    department: r.department ?? "",
    is_head: bool(r.is_head),
    areas_of_interest: r.areas_of_interest ?? "",
    top_topics: r.top_topics ?? "",
    n_publications: num(r.n_publications),
    n_recent: num(r.n_recent),
    first_year: maybeNum(r.first_year),
    latest_year: maybeNum(r.latest_year),
    total_citations: num(r.total_citations),
    h_index: num(r.openalex_h_index_max),
    is_research_active: bool(r.is_research_active),
    profile_status: r.profile_status ?? "complete",
    collaboration_status: r.collaboration_status ?? "not_set",
    official_email: r.official_email ?? "",
    google_scholar_id: r.google_scholar_id ?? "",
    vidwan_id: r.vidwan_id ?? "",
  };
}

function toTopic(r: Record<string, string>): FacultyTopic {
  return {
    faculty_id: r.faculty_id!,
    topic: r.topic!,
    n_papers: num(r.n_papers),
    first_year: num(r.first_year),
    latest_year: num(r.latest_year),
    citations: num(r.citations),
    field: r.field ?? "",
    domain: r.domain ?? "",
    is_active_topic: bool(r.is_active_topic),
  };
}

function toPublication(r: Record<string, string>): PublicationLite {
  return {
    publication_id: r.publication_id!,
    title: r.title ?? "",
    publication_year: num(r.publication_year),
    venue: r.venue || r.venue_name || "",
    publication_url: r.publication_url ?? "",
    cited_by_count: num(r.cited_by_count),
    topics_all: r.topics_all ?? "",
    attribution_confidence: r.attribution_confidence ?? "medium",
  };
}

async function loadDatabricks(): Promise<Cache> {
  const [facultyRows, topicRows, pubRows, bridgeRows, embRows] = await Promise.all([
    query<Record<string, string>>(`SELECT * FROM ${gold("faculty_expertise")}`),
    query<Record<string, string>>(`SELECT * FROM ${gold("faculty_topic")}`),
    query<Record<string, string>>(
      `SELECT publication_id, title, publication_year, coalesce(venue, venue_name) AS venue,
              publication_url, cited_by_count, topics_all, attribution_confidence
         FROM ${silver("dim_publication")}
        WHERE attribution_confidence <> 'low'`,
    ),
    query<Record<string, string>>(
      `SELECT faculty_id, publication_id FROM ${silver("bridge_faculty_publication")}`,
    ),
    query<Record<string, string>>(
      `SELECT publication_id, embedding_text FROM ${gold("publication_embedding")}`,
    ),
  ]);

  const embeddingText = new Map<string, string>();
  for (const r of embRows) embeddingText.set(r.publication_id!, r.embedding_text ?? "");

  return {
    faculty: facultyRows.map(toFaculty),
    topics: topicRows.map(toTopic),
    publications: pubRows.map(toPublication),
    bridge: bridgeRows.map((r) => ({ faculty_id: r.faculty_id!, publication_id: r.publication_id! })),
    embeddingText,
  };
}

export async function referenceData(): Promise<Cache> {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  try {
    cache = hasWarehouse() ? await loadDatabricks() : loadLocal();
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[netree] gold read failed, falling back to local CSVs:", err);
    cache = loadLocal();
  }
  cacheAt = Date.now();
  return cache;
}

export async function facultyById(id: string) {
  const { faculty } = await referenceData();
  return faculty.find((f) => f.faculty_id === id) ?? null;
}

export async function topicsFor(id: string) {
  const { topics } = await referenceData();
  return topics.filter((t) => t.faculty_id === id).sort((a, b) => b.n_papers - a.n_papers);
}

export async function publicationsFor(id: string, limit = 12) {
  const { bridge, publications } = await referenceData();
  const ids = new Set(bridge.filter((b) => b.faculty_id === id).map((b) => b.publication_id));
  return publications
    .filter((p) => ids.has(p.publication_id))
    .sort((a, b) => b.publication_year - a.publication_year || b.cited_by_count - a.cited_by_count)
    .slice(0, limit);
}
