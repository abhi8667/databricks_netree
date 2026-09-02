/**
 * Creates the Unity Catalog layout Netree reads and writes.
 *
 *   npm run db:bootstrap
 *
 * Safe to re-run: every statement is CREATE ... IF NOT EXISTS, and the column
 * comments are reapplied each time.
 *
 * The comments on netree.gold.faculty_expertise matter more than anything else
 * here. Genie writes its SQL from them, so each one is phrased the way a
 * student would describe the column out loud, not the way a data engineer
 * would name it.
 */
import { execute } from "../src/lib/databricks/sql";
import { dbx, hasWarehouse } from "../src/lib/env";

const CAT = dbx.catalog;
const RAW = `${CAT}.${dbx.schemaRaw}`;
const SILVER = `${CAT}.${dbx.schemaSilver}`;
const GOLD = `${CAT}.${dbx.schemaGold}`;

const STRUCTURE = [
  `CREATE CATALOG IF NOT EXISTS ${CAT}
     COMMENT 'Netree - campus research collaboration. Faculty publication record plus everything the application writes.'`,
  `CREATE SCHEMA IF NOT EXISTS ${RAW}
     COMMENT 'Untouched loads from the Delta CSV export.'`,
  `CREATE SCHEMA IF NOT EXISTS ${SILVER}
     COMMENT 'Cleaned dimensions and the application tables.'`,
  `CREATE SCHEMA IF NOT EXISTS ${GOLD}
     COMMENT 'The only schema the Genie space reads. Pre-joined and commented for natural-language questions.'`,
];

const REFERENCE_TABLES = [
  `CREATE TABLE IF NOT EXISTS ${SILVER}.dim_faculty (
     faculty_id STRING, faculty_name STRING, designation STRING, department STRING,
     qualification STRING, experience STRING, areas_of_interest STRING, official_email STRING,
     orcid_id STRING, scopus_id STRING, researcher_id STRING, google_scholar_id STRING,
     vidwan_id STRING, openalex_author_ids STRING, openalex_works_count_sum INT,
     openalex_cited_by_count_sum INT, openalex_h_index_max INT, roster_status STRING,
     primary_profile_or_roster_source STRING, retrieved_at STRING, notes STRING,
     n_publications INT, first_year INT, latest_year INT, n_recent INT, total_citations INT,
     is_head BOOLEAN, profile_status STRING, is_research_active BOOLEAN, collaboration_status STRING
   ) USING DELTA
   COMMENT 'One row per CSE faculty member, from official RVCE material. Not an HR roster.'`,

  `CREATE TABLE IF NOT EXISTS ${SILVER}.dim_publication (
     publication_id STRING, title STRING, publication_year INT, publication_type STRING,
     venue STRING, doi STRING, publication_url STRING, openalex_work_id STRING,
     cited_by_count INT, source_name STRING, abstract STRING, topic_1 STRING, topic_2 STRING,
     topic_3 STRING, topic_1_score DOUBLE, subfield STRING, field STRING, domain STRING,
     topics_all STRING, keywords STRING, concepts STRING, venue_name STRING, venue_type STRING,
     language STRING, n_authors INT, is_open_access BOOLEAN, oa_status STRING, oa_url STRING,
     author_institutions STRING, institution_countries STRING, has_rvce_author BOOLEAN,
     attribution_confidence STRING, is_recent BOOLEAN
   ) USING DELTA
   COMMENT 'One row per unique publication. Filter attribution_confidence <> ''low'' - that slice contains known misattributions.'`,

  `CREATE TABLE IF NOT EXISTS ${SILVER}.bridge_faculty_publication (
     faculty_id STRING, publication_id STRING, faculty_name STRING,
     match_method STRING, verification_status STRING, source_name STRING
   ) USING DELTA
   COMMENT 'Many-to-many between faculty and publications. A co-authored paper appears once per author.'`,

  `CREATE TABLE IF NOT EXISTS ${GOLD}.faculty_topic (
     faculty_id STRING, topic STRING, n_papers INT, first_year INT, latest_year INT,
     citations INT, field STRING, domain STRING, is_active_topic BOOLEAN
   ) USING DELTA
   COMMENT 'Which research topics each faculty member publishes on, and how much. Query this to answer "who works on X".'`,

  `CREATE TABLE IF NOT EXISTS ${GOLD}.faculty_expertise (
     faculty_id STRING, faculty_name STRING, designation STRING, department STRING,
     is_head BOOLEAN, areas_of_interest STRING, top_topics STRING, n_publications INT,
     n_recent INT, first_year INT, latest_year INT, total_citations INT,
     openalex_h_index_max INT, is_research_active BOOLEAN, profile_status STRING,
     collaboration_status STRING, official_email STRING, google_scholar_id STRING,
     vidwan_id STRING
   ) USING DELTA
   COMMENT 'One row per faculty member with their research topics already joined on. The primary surface for the Genie space.'`,

  `CREATE TABLE IF NOT EXISTS ${GOLD}.publication_embedding (
     publication_id STRING, embedding_text STRING, text_len INT,
     has_abstract BOOLEAN, vector ARRAY<FLOAT>
   ) USING DELTA
   COMMENT 'Embedding input and vector per publication. 650 rows - brute-force cosine in the application, no index needed.'`,

  `CREATE TABLE IF NOT EXISTS ${RAW}.events_raw (
     source STRING, external_id STRING, fetched_at TIMESTAMP,
     raw_json STRING, payload_hash STRING
   ) USING DELTA
   COMMENT 'Raw upstream JSON feeds from Bengaluru Tech Week and HackCulture.'`,

  `CREATE TABLE IF NOT EXISTS ${SILVER}.events (
     event_id STRING, source STRING, external_id STRING, kind STRING,
     title STRING, tagline STRING, description STRING, start_at TIMESTAMP,
     end_at TIMESTAMP, venue STRING, area STRING, track STRING, mode STRING,
     registration_open BOOLEAN, registration_url STRING, min_team_size INT,
     max_team_size INT, eligibility_text STRING, cover_image_url STRING,
     organizer_name STRING, tags STRING, payload_hash STRING, updated_at TIMESTAMP
   ) USING DELTA
   COMMENT 'Conformed events and hackathons across campus feeds.'`,

  `CREATE TABLE IF NOT EXISTS ${SILVER}.event_speakers (
     id STRING, event_external_id STRING, faculty_id STRING, display_name STRING,
     designation STRING, company STRING, linkedin_url STRING, square_picture_url STRING,
     featured BOOLEAN
   ) USING DELTA
   COMMENT 'Speakers at tech events, linked to faculty records where verified.'`,

  `CREATE OR REPLACE VIEW ${GOLD}.events_upcoming AS
   SELECT * FROM ${SILVER}.events
   WHERE start_at >= CURRENT_TIMESTAMP()`,
];

/**
 * Application tables. All append-only: a write adds a revision, a read keeps
 * the newest row per id. Nothing is updated in place, so the full history of
 * a proposal stays queryable and concurrent writers cannot lose each other.
 */
const APP_TABLES = [
  ["app_user", "Accounts. One revision per profile edit."],
  ["app_project", "Student project ideas, with the interview transcript and the structured brief."],
  ["app_opportunity", "Open positions posted by faculty."],
  ["app_invitation", "Collaboration requests from a student to a faculty member, and the reply."],
  ["app_interest", "Student applications to an open position."],
  ["app_message", "Clarification messages inside a proposal thread."],
  ["app_meeting", "Meeting proposals and the slot that was confirmed."],
  ["app_question", "Short questions to alumni or faculty, and their answers."],
  ["app_event_attendance", "Student and faculty declared attendance at events and hackathons."],
].map(
  ([name, comment]) => `CREATE TABLE IF NOT EXISTS ${SILVER}.${name} (
     id STRING COMMENT 'Entity id. The newest row per id is the current state.',
     owner_id STRING COMMENT 'Account that owns the entity.',
     ref_id STRING COMMENT 'The entity this one hangs off, where there is one.',
     status STRING COMMENT 'Lifecycle state at this revision.',
     payload STRING COMMENT 'The full entity as JSON.',
     updated_at TIMESTAMP COMMENT 'When this revision was written.'
   ) USING DELTA COMMENT '${comment} Append-only.'`,
);

/** Genie writes its SQL from these. Phrase them as a person would ask. */
const GOLD_COMMENTS: [string, string][] = [
  ["faculty_id", "Stable identifier like RVCE-CSE-012."],
  ["faculty_name", "The professor's name as printed in official college material."],
  ["designation", "Assistant Professor, Associate Professor, Professor, or Professor and Head."],
  ["department", "Computer Science and Engineering, or one of its streams such as Cyber Security."],
  ["is_head", "True for the Head of Department."],
  [
    "areas_of_interest",
    "Self-described interests, semicolon separated. Noisy and partly auto-derived - prefer top_topics or the faculty_topic table when answering what someone works on.",
  ],
  [
    "top_topics",
    "The six research topics this person publishes on most, each followed by the number of papers, semicolon separated. Example: Video Surveillance and Tracking Methods (33); Anomaly Detection (12).",
  ],
  ["n_publications", "How many publications are linked to this person in the index."],
  ["n_recent", "How many of those were published in 2023 or later."],
  ["first_year", "Year of their earliest indexed publication."],
  ["latest_year", "Year of their most recent indexed publication."],
  ["total_citations", "Citations summed across their indexed publications, as of the snapshot."],
  ["openalex_h_index_max", "Their h-index, where a matched OpenAlex profile reported one."],
  ["is_research_active", "True when they have published in 2023 or later."],
  [
    "profile_status",
    "complete, or incomplete when no publication could be anchored to them. Say so rather than omitting the person.",
  ],
  [
    "collaboration_status",
    "Whether they have opted in to being shown as open to collaboration. Always not_set unless they set it themselves - never infer availability from publication activity.",
  ],
  ["official_email", "Published college email, where one exists. Most rows are empty."],
  ["google_scholar_id", "Google Scholar profile slug, where known."],
  ["vidwan_id", "IRINS/Vidwan profile id. The profile lives at rvce.irins.org/profile/{id}."],
];

async function main() {
  if (!hasWarehouse()) {
    console.error(
      "No warehouse configured. Set DATABRICKS_HOST, DATABRICKS_TOKEN and DATABRICKS_WAREHOUSE_ID first.",
    );
    process.exit(1);
  }

  for (const statement of [...STRUCTURE, ...REFERENCE_TABLES, ...APP_TABLES]) {
    const label = statement.split("\n")[0]!.trim();
    process.stdout.write(`${label.slice(0, 78)}\n`);
    await execute(statement);
  }

  process.stdout.write(`\nCommenting ${GOLD}.faculty_expertise columns\n`);
  for (const [column, comment] of GOLD_COMMENTS) {
    await execute(
      `ALTER TABLE ${GOLD}.faculty_expertise ALTER COLUMN ${column} COMMENT '${comment.replace(/'/g, "''")}'`,
    );
  }

  process.stdout.write(
    `\nDone. Point a Genie space at ${GOLD} only, then run: npm run db:load\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
