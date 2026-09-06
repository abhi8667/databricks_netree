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

/**
 * Genie reads gold only, so anything it must be able to cite has to exist
 * there. Without these two views it can count a professor's papers but cannot
 * name one - every answer stops at "14 publications" with no title behind it.
 * Views rather than copies: one source of truth in silver, and the attribution
 * quarantine is applied once, here, where Genie cannot skip it.
 */
const GOLD_VIEWS = [
  `CREATE OR REPLACE VIEW ${GOLD}.publication (
     publication_id COMMENT 'Stable identifier for the paper.',
     title COMMENT 'Title of the paper.',
     publication_year COMMENT 'Year it was published.',
     publication_type COMMENT 'conference-paper, article, book-chapter, preprint or review.',
     venue COMMENT 'Journal or conference it appeared in. Often empty.',
     doi COMMENT 'DOI, without the https://doi.org/ prefix.',
     publication_url COMMENT 'Link to the paper.',
     cited_by_count COMMENT 'Citations at the snapshot date. Drifts over time.',
     topics_all COMMENT 'Every research topic this paper belongs to, semicolon separated. Uses the same vocabulary as faculty_topic.topic.',
     keywords COMMENT 'Author and index keywords, semicolon separated.',
     abstract COMMENT 'Abstract where one is available. Empty for roughly one paper in six.',
     is_recent COMMENT 'True when published in 2023 or later.'
   )
   COMMENT 'One row per publication that is safe to show. Known misattributions are already removed. Join through faculty_publication to answer which paper a professor wrote.'
   AS SELECT publication_id, title, publication_year, publication_type,
             coalesce(venue, venue_name) AS venue, doi, publication_url, cited_by_count,
             topics_all, keywords, abstract, is_recent
        FROM ${SILVER}.dim_publication
       WHERE attribution_confidence <> 'low'`,

  `CREATE OR REPLACE VIEW ${GOLD}.faculty_publication (
     faculty_id COMMENT 'The professor, as in faculty_expertise.',
     faculty_name COMMENT 'Their name, repeated so no join is needed to read a result.',
     publication_id COMMENT 'The paper, as in publication.',
     match_method COMMENT 'How the paper was attributed: openalex_name_match or crossref_affiliation_anchored.'
   )
   COMMENT 'Which professor wrote which paper. A paper co-authored inside the department appears once per author, so counting rows here counts authorships, not distinct papers.'
   AS SELECT b.faculty_id, b.faculty_name, b.publication_id, b.match_method
        FROM ${SILVER}.bridge_faculty_publication b
        JOIN ${SILVER}.dim_publication p ON p.publication_id = b.publication_id
       WHERE p.attribution_confidence <> 'low'`,
];

/**
 * faculty_topic answers "who has the experience for this idea": matching
 * grounds a student's brief in these topic labels, then asks Genie who
 * publishes in them. Its comments matter as much as faculty_expertise's.
 */
const TOPIC_COMMENTS: [string, string][] = [
  ["faculty_id", "Stable identifier like RVCE-CSE-012. Join to faculty_expertise for the name."],
  [
    "topic",
    "The research topic, from a fixed vocabulary of 449 labels shared with publication.topics_all. Match on this exactly rather than searching titles for keywords.",
  ],
  ["n_papers", "How many of this person's papers are on this topic. The measure of depth in an area."],
  ["first_year", "Year they first published on this topic."],
  ["latest_year", "Year they most recently published on this topic."],
  ["citations", "Citations summed across their papers on this topic."],
  ["field", "Broad field the topic sits in. Unreliable for a few rows - filter on topic, not field."],
  ["domain", "Broadest grouping above field."],
  ["is_active_topic", "True when they have published on this topic in 2023 or later."],
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

  process.stdout.write(`Commenting ${GOLD}.faculty_topic columns\n`);
  for (const [column, comment] of TOPIC_COMMENTS) {
    await execute(
      `ALTER TABLE ${GOLD}.faculty_topic ALTER COLUMN ${column} COMMENT '${comment.replace(/'/g, "''")}'`,
    );
  }

  // Last: these read from silver tables that must already exist.
  process.stdout.write(`Creating ${GOLD} publication views\n`);
  for (const statement of GOLD_VIEWS) await execute(statement);

  process.stdout.write(
    `\nDone. Point a Genie space at ${GOLD} only, then run: npm run db:load\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
