import "server-only";
import { hasWarehouse, gold } from "@/lib/env";
import { query } from "@/lib/databricks/sql";
import { referenceData } from "@/lib/store/reference";

/**
 * Semantic search over the 650-publication corpus.
 *
 * At this scale a brute-force cosine over vectors held in memory is the right
 * answer — no index, no vector-search endpoint, no sync job. Two vector
 * sources: dense embeddings written to `netree.gold.publication_embedding` by
 * the embedding pass, or a TF-IDF space built from the same `embedding_text`
 * when no serving endpoint is wired up. Both are cosine-comparable within
 * themselves, and the ranking logic downstream does not care which is in use.
 */

const STOP = new Set(
  ("a an the and or of for to in on with by is are was were be been this that these those it its as at from " +
    "we our their they them he she his her which who whom what when where how why not no can could would should " +
    "may might must will shall do does did done have has had having using used use paper study propose proposed " +
    "approach method results result show shows shown based new novel via into over under between among such than " +
    "also more most much many very both each other others any all some one two three there here about").split(" "),
);

export function tokenize(text: string) {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (raw.length < 3 || raw.length > 28) continue;
    if (STOP.has(raw)) continue;
    if (/^\d+$/.test(raw)) continue;
    out.push(raw);
  }
  return out;
}

export type SparseVector = Map<string, number>;

type TfidfSpace = { kind: "tfidf"; idf: Map<string, number>; docs: Map<string, SparseVector> };
type DenseSpace = { kind: "dense"; docs: Map<string, Float32Array> };

export type VectorSpace = TfidfSpace | DenseSpace;

let space: VectorSpace | null = null;
let builtAt = 0;
const TTL = 10 * 60_000;

function weigh(tokens: string[], idf: Map<string, number>): SparseVector {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const vec: SparseVector = new Map();
  let norm = 0;
  for (const [term, count] of tf) {
    const weight = (1 + Math.log(count)) * (idf.get(term) ?? 0);
    if (weight <= 0) continue;
    vec.set(term, weight);
    norm += weight * weight;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [term, weight] of vec) vec.set(term, weight / norm);
  return vec;
}

function buildTfidf(texts: Map<string, string>): TfidfSpace {
  const tokenised = new Map<string, string[]>();
  const df = new Map<string, number>();
  for (const [id, text] of texts) {
    const tokens = tokenize(text);
    tokenised.set(id, tokens);
    for (const term of new Set(tokens)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = tokenised.size || 1;
  const idf = new Map<string, number>();
  for (const [term, count] of df) idf.set(term, Math.log((n + 1) / (count + 0.5)));
  const docs = new Map<string, SparseVector>();
  for (const [id, tokens] of tokenised) docs.set(id, weigh(tokens, idf));
  return { kind: "tfidf", idf, docs };
}

function normalise(v: Float32Array) {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm;
  return out;
}

/**
 * A partly-filled embedding table is worse than an empty one. Retrieval over a
 * fraction of the corpus still returns a confident top six - drawn from
 * whichever rows happened to be embedded before the job stopped - and nothing
 * in the scores reveals it. Coverage is therefore checked against the table's
 * own row count, and anything short of MIN_COVERAGE falls back to TF-IDF over
 * the whole corpus rather than ranking on a sample.
 */
const MIN_COVERAGE = 0.8;

async function loadDenseSpace(): Promise<DenseSpace | null> {
  if (!hasWarehouse()) return null;
  try {
    const [tally] = await query<{ total: string; embedded: string }>(
      `SELECT count(*) AS total, count(vector) AS embedded FROM ${gold("publication_embedding")}`,
    );
    const total = Number(tally?.total ?? 0);
    const embedded = Number(tally?.embedded ?? 0);
    if (!total || !embedded) return null;
    if (embedded / total < MIN_COVERAGE) {
      console.warn(
        `[netree] only ${embedded}/${total} publications are embedded, below the ` +
          `${Math.round(MIN_COVERAGE * 100)}% needed to rank on. Using TF-IDF over the full ` +
          `corpus instead - run npm run db:embed to finish the vectors.`,
      );
      return null;
    }

    const [rows, { publications }] = await Promise.all([
      query<{ publication_id: string; vector: string }>(
        `SELECT publication_id, to_json(vector) AS vector
           FROM ${gold("publication_embedding")}
          WHERE vector IS NOT NULL`,
      ),
      referenceData(),
    ]);
    if (!rows.length) return null;

    // The embedding table is written from the full publication set, including
    // the low-confidence attribution slice the reader filters out. Retrieving a
    // paper the app cannot show gives a match with no citation behind it, so
    // the dense space is held to the same set as the TF-IDF one below.
    const showable = new Set(publications.map((p) => p.publication_id));
    const docs = new Map<string, Float32Array>();
    for (const row of rows) {
      if (!showable.has(row.publication_id)) continue;
      docs.set(row.publication_id, normalise(Float32Array.from(JSON.parse(row.vector) as number[])));
    }
    if (!docs.size) return null;
    return { kind: "dense", docs };
  } catch {
    return null;
  }
}

export async function vectorSpace(): Promise<VectorSpace> {
  if (space && Date.now() - builtAt < TTL) return space;
  const dense = await loadDenseSpace();
  if (dense) {
    space = dense;
  } else {
    const { embeddingText, publications } = await referenceData();
    // Drop the known-bad attribution slice before it can ever be retrieved.
    const usable = new Map<string, string>();
    for (const pub of publications) {
      if (pub.attribution_confidence === "low") continue;
      usable.set(
        pub.publication_id,
        embeddingText.get(pub.publication_id) ?? `${pub.title}\n${pub.topics_all}`,
      );
    }
    space = buildTfidf(usable);
  }
  builtAt = Date.now();
  return space;
}

export type Hit = { publication_id: string; similarity: number };

export async function searchPublications(text: string, topK = 120): Promise<Hit[]> {
  const s = await vectorSpace();
  const hits: Hit[] = [];

  if (s.kind === "tfidf") {
    const q = weigh(tokenize(text), s.idf);
    if (!q.size) return [];

    // Cosine alone favours very short documents: a title-only record that
    // happens to share one mid-frequency word ("browser") scores as highly as
    // a full abstract that matches on eight. Scaling by how much of the query
    // a document actually covers, and dropping single-term coincidences,
    // removes that bias without needing longer documents.
    const span = Math.min(q.size, 8);
    for (const [id, doc] of s.docs) {
      let dot = 0;
      let matched = 0;
      // Iterate the query side - it is always far shorter than a document.
      for (const [term, weight] of q) {
        const w = doc.get(term);
        if (w) {
          dot += weight * w;
          matched++;
        }
      }
      if (dot <= 0 || matched < 2) continue;
      const coverage = Math.min(matched, 8) / span;
      hits.push({ publication_id: id, similarity: dot * (0.3 + 0.7 * coverage) });
    }
  } else {
    const { embed } = await import("@/lib/databricks/serving");
    const [raw] = await embed([text]);
    if (!raw) return [];
    const q = normalise(Float32Array.from(raw));
    for (const [id, doc] of s.docs) {
      let dot = 0;
      const len = Math.min(q.length, doc.length);
      for (let i = 0; i < len; i++) dot += q[i]! * doc[i]!;
      if (dot > 0) hits.push({ publication_id: id, similarity: dot });
    }
  }

  hits.sort((a, b) => b.similarity - a.similarity);
  return hits.slice(0, topK);
}

export async function spaceKind() {
  return (await vectorSpace()).kind;
}
