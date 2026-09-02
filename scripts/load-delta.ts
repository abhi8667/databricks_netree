/**
 * Loads Data/delta/*.csv into the Unity Catalog tables.
 *
 *   npm run db:load            # replaces the reference tables
 *   npm run db:load -- --keep  # appends instead of replacing
 *
 * Everything goes through the SQL Statement Execution API with bound
 * parameters, so no file upload, no volume, and no cluster filesystem access
 * is needed - the same path the running application uses.
 */
import path from "node:path";
import { execute, query } from "../src/lib/databricks/sql";
import { dbx, hasWarehouse } from "../src/lib/env";
import { readCsv, bool, maybeNum } from "../src/lib/store/csv";

const DATA = path.join(process.cwd(), "Data", "delta");
const BATCH = 20;

type Column = { name: string; type: "STRING" | "INT" | "DOUBLE" | "BOOLEAN"; from?: string };

type Spec = {
  file: string;
  table: string;
  columns: Column[];
};

const s = (name: string, from?: string): Column => ({ name, type: "STRING", from });
const i = (name: string, from?: string): Column => ({ name, type: "INT", from });
const d = (name: string, from?: string): Column => ({ name, type: "DOUBLE", from });
const b = (name: string, from?: string): Column => ({ name, type: "BOOLEAN", from });

const SPECS: Spec[] = [
  {
    file: "dim_faculty.csv",
    table: `${dbx.catalog}.${dbx.schemaSilver}.dim_faculty`,
    columns: [
      s("faculty_id"), s("faculty_name"), s("designation"), s("department"),
      s("qualification"), s("experience"), s("areas_of_interest"), s("official_email"),
      s("orcid_id"), s("scopus_id"), s("researcher_id"), s("google_scholar_id"),
      s("vidwan_id"), s("openalex_author_ids"), i("openalex_works_count_sum"),
      i("openalex_cited_by_count_sum"), i("openalex_h_index_max"), s("roster_status"),
      s("primary_profile_or_roster_source"), s("retrieved_at"), s("notes"),
      i("n_publications"), i("first_year"), i("latest_year"), i("n_recent"),
      i("total_citations"), b("is_head"), s("profile_status"), b("is_research_active"),
      s("collaboration_status"),
    ],
  },
  {
    file: "dim_publication.csv",
    table: `${dbx.catalog}.${dbx.schemaSilver}.dim_publication`,
    columns: [
      s("publication_id"), s("title"), i("publication_year"), s("publication_type"),
      s("venue"), s("doi"), s("publication_url"), s("openalex_work_id"),
      i("cited_by_count"), s("source_name"), s("abstract"), s("topic_1"), s("topic_2"),
      s("topic_3"), d("topic_1_score"), s("subfield"), s("field"), s("domain"),
      s("topics_all"), s("keywords"), s("concepts"), s("venue_name"), s("venue_type"),
      s("language"), i("n_authors"), b("is_open_access"), s("oa_status"), s("oa_url"),
      s("author_institutions"), s("institution_countries"), b("has_rvce_author"),
      s("attribution_confidence"), b("is_recent"),
    ],
  },
  {
    file: "bridge_faculty_publication.csv",
    table: `${dbx.catalog}.${dbx.schemaSilver}.bridge_faculty_publication`,
    columns: [
      s("faculty_id"), s("publication_id"), s("faculty_name"),
      s("match_method"), s("verification_status"), s("source_name"),
    ],
  },
  {
    file: "faculty_topic.csv",
    table: `${dbx.catalog}.${dbx.schemaGold}.faculty_topic`,
    columns: [
      s("faculty_id"), s("topic"), i("n_papers"), i("first_year"), i("latest_year"),
      i("citations"), s("field"), s("domain"), b("is_active_topic"),
    ],
  },
  {
    file: "gold_faculty_expertise.csv",
    table: `${dbx.catalog}.${dbx.schemaGold}.faculty_expertise`,
    columns: [
      s("faculty_id"), s("faculty_name"), s("designation"), s("department"), b("is_head"),
      s("areas_of_interest"), s("top_topics"), i("n_publications"), i("n_recent"),
      i("first_year"), i("latest_year"), i("total_citations"), i("openalex_h_index_max"),
      b("is_research_active"), s("profile_status"), s("collaboration_status"),
      s("official_email"), s("google_scholar_id"), s("vidwan_id"),
    ],
  },
  {
    file: "publication_embedding_input.csv",
    table: `${dbx.catalog}.${dbx.schemaGold}.publication_embedding`,
    columns: [s("publication_id"), s("embedding_text"), i("text_len"), b("has_abstract")],
  },
  {
    file: "qa_attribution_flags.csv",
    table: `${dbx.catalog}.${dbx.schemaGold}.qa_attribution_flags`,
    columns: [
      s("publication_id"), s("title"), i("publication_year"), s("venue"),
      s("author_institutions"),
    ],
  },
];

/** CSV holds everything as text; Delta wants the declared type or NULL. */
function cast(value: string | undefined, column: Column): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (column.type === "STRING") return raw;
  if (column.type === "BOOLEAN") return bool(raw) ? "true" : "false";
  const n = maybeNum(raw);
  if (n === null) return null;
  return column.type === "INT" ? String(Math.round(n)) : String(n);
}

async function loadSpec(spec: Spec, replace: boolean) {
  const rows = readCsv(path.join(DATA, spec.file));
  process.stdout.write(`${spec.table.padEnd(46)} ${String(rows.length).padStart(5)} rows `);

  if (replace) await execute(`TRUNCATE TABLE ${spec.table}`);

  const names = spec.columns.map((c) => c.name).join(", ");
  for (let start = 0; start < rows.length; start += BATCH) {
    const slice = rows.slice(start, start + BATCH);
    const params: { name: string; value: string | null; type: string }[] = [];
    const tuples = slice.map((row, r) => {
      const cells = spec.columns.map((column, c) => {
        const key = `p${r}_${c}`;
        params.push({
          name: key,
          value: cast(row[column.from ?? column.name], column),
          type: column.type,
        });
        return `:${key}`;
      });
      return `(${cells.join(", ")})`;
    });

    await execute(
      `INSERT INTO ${spec.table} (${names}) VALUES ${tuples.join(", ")}`,
      params,
    );
    process.stdout.write(".");
  }

  const [count] = await query<{ n: string }>(`SELECT count(*) AS n FROM ${spec.table}`);
  process.stdout.write(` -> ${count?.n ?? "?"}\n`);
}

async function main() {
  if (!hasWarehouse()) {
    console.error("No warehouse configured. See .env.example.");
    process.exit(1);
  }
  const replace = !process.argv.includes("--keep");
  process.stdout.write(replace ? "Replacing reference tables\n\n" : "Appending\n\n");
  for (const spec of SPECS) await loadSpec(spec, replace);
  process.stdout.write("\nDone. Next: npm run db:embed\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
