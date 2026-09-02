# Netree campus data — schema and provenance

**Generated:** 2 September 2026
**Scope:** RVCE Bengaluru, Computer Science and Engineering (incl. CSE–Cyber Security, CSE–Data Science)
**Grain:** 38 faculty · 650 unique publications · 707 faculty↔publication links

All tables live in `Data/delta/` as UTF-8 CSV, ready to load into Databricks Delta.

---

## 1. Where the data came from

Three sources, layered. Nothing here required a login, a licence, or a paywall bypass.

| Source | What it gave us | Access method |
|---|---|---|
| **RVCE official material** | Faculty roster, designations, department, areas of interest, some emails and identifiers | Hand-collected from the NAAC/BoS CSE PDF (2022–23), the 2025 handbook, and RVCE IRINS profiles. Every row keeps `primary_profile_or_roster_source` and `all_source_urls`. |
| **OpenAlex** | Publication records for 24 faculty; then abstracts, topics, keywords, concepts, venues, author affiliations for 606 works | Public REST API, no key. `GET /works/{id}` per work. |
| **Crossref** | Publications for 11 faculty OpenAlex failed to match | Public REST API, no key. `GET /works?query.author=…&query.affiliation=…` |
| **OpenAlex (DOI backfill)** | Topics, keywords, abstracts and affiliations for those 55 recovered works | `GET /works/doi:{doi}` — 44 lookups, 44/44 resolved |

### Why two publication sources

The original OpenAlex pass matched authors **by name string only**. That left 14 of 38 faculty with zero publications — including the Head of Department — and simultaneously produced false positives: a 1982 paper on *catabolism of isophthalic acid by a soil bacterium* was credited to a CSE professor.

Crossref was used for recovery specifically because it returns **per-author affiliation strings**, so each recovered paper could be anchored to an author who actually lists RVCE. All 55 recovered records are affiliation-anchored, not name-matched.

### Why a DOI backfill was needed

Crossref is a DOI registry: it carries bibliographic facts but does no subject classification. The 55 recovered works therefore arrived with no topics and no keywords, which meant the 11 recovered faculty — Sowmyarani C N with 20 publications, and the Head of Department among them — had publications but **no rows in `faculty_topic`**, the table the "who works on X" query path depends on. They were effectively invisible.

`04_backfill_dois.py` closes that: OpenAlex describes the same papers, and the DOI is the shared key. 44 lookups via `GET /works/doi:{doi}` resolved 44/44, adding topics, keywords, abstracts and author institutions. 16 of them returned an RVCE institution string, promoting those works to `attribution_confidence = 'high'`.

`faculty_topic` went from 24 faculty to **35** — every faculty member who has publications now has topics.

### Rate limiting encountered

OpenAlex's list/filter endpoints (`/works?filter=…`, `/authors?search=…`) returned HTTP 429 from this network regardless of the `mailto` polite-pool parameter. Single-entity `GET /works/{id}` calls worked reliably. The fetcher therefore runs one work at a time at ~1.1 s/request and caches every response to `works_cache.jsonl`, so an interrupted run resumes for free. Crossref applied no such limit.

### Reproduction

```bash
python scripts/01_enrich_works.py    # OpenAlex enrichment (resumable)
python scripts/02_recover_faculty.py # Crossref recovery for unmatched faculty
python scripts/04_backfill_dois.py   # OpenAlex topics/abstracts for recovered works
python scripts/01_enrich_works.py    # re-run: folds backfilled works into the CSV
python scripts/03_build_tables.py    # assemble Data/delta/*.csv
```

All network steps write through `Data/works_cache.jsonl`, so re-runs are free and interruptions cost nothing.

`OPENALEX_LIMIT=250` bounds a single enrichment run; `OPENALEX_MAILTO` sets the polite-pool contact.

---

## 2. Table map

```
dim_faculty ──┬── bridge_faculty_publication ──── dim_publication ──── publication_embedding_input
              └── faculty_topic                                              (1:1 on publication_id)
gold_faculty_expertise   = dim_faculty + faculty_topic, pre-joined for Genie
qa_attribution_flags     = dim_publication filtered to attribution_confidence='low'
```

`dim_publication` is one row per *work*. A paper co-authored by two RVCE faculty appears **once** there and **twice** in the bridge — so per-faculty counts stay correct without inflating corpus size.

---

## 3. `dim_faculty.csv` — 38 rows, 33 columns

One row per faculty member. Grain: `faculty_id`.

### Identity and roster (from RVCE official material)

| Column | Type | Filled | Meaning |
|---|---|---|---|
| `faculty_id` | string | 38/38 | Primary key, `RVCE-CSE-NNN`. Locally assigned, stable. |
| `faculty_name` | string | 38/38 | Name as printed in official material. |
| `designation` | string | 38/38 | Assistant Professor, Associate Professor, Professor, Professor and Head, etc. |
| `department` | string | 38/38 | CSE (34), CSE–Cyber Security (3), CSE/AI&ML (1). |
| `qualification` | string | 9/38 | Degrees, where the profile stated them. |
| `experience` | string | 8/38 | Free text from profile pages. |
| `areas_of_interest` | string | 28/38 | Semicolon-separated. **Partly auto-derived from OpenAlex topics and carries noise** — one cyber-security professor is tagged "Corporate Governance and Management". Treat as a hint, not ground truth; prefer `faculty_topic`. |
| `official_email` | string | **6/38** | Only where publicly printed. See limitations. |
| `date_joined_rvce` | date | 2/38 | Rarely published. |
| `roster_status` | string | 38/38 | Which official document establishes this person as CSE faculty. |
| `primary_profile_or_roster_source` | url | 38/38 | Single best source URL. |
| `all_source_urls` | string | 38/38 | All URLs consulted, semicolon-separated. |
| `retrieved_at` | date | 38/38 | Roster snapshot date (2026-09-01). |
| `notes` | string | 26/38 | Collection caveats, e.g. "OpenAlex profile not confidently matched". |

### External identifiers

| Column | Type | Filled | Meaning |
|---|---|---|---|
| `orcid_id` | string | 7/38 | ORCID iD. |
| `scopus_id` | float | 6/38 | Scopus Author ID. Float only because of CSV null handling — **cast to string/bigint on load**. |
| `researcher_id` | string | 5/38 | Web of Science ResearcherID. |
| `google_scholar_id` | string | 3/38 | Scholar profile slug. |
| `vidwan_id` | float | 7/38 | IRINS/Vidwan profile id; profile lives at `rvce.irins.org/profile/{id}`. Cast to string/bigint. |
| `openalex_author_ids` | string | 24/38 | One or more OpenAlex author URLs. Null = the original name match failed. |
| `openalex_match_score` | float | 24/38 | **Name-string similarity only. Not a measure of attribution correctness** — the false positives scored 1.00. |

### Metrics carried from the source sheet

| Column | Type | Meaning |
|---|---|---|
| `openalex_works_count_sum` | int | OpenAlex-reported works, summed across matched author profiles. 0 where unmatched. |
| `openalex_cited_by_count_sum` | int | Same, for citations. |
| `openalex_h_index_max` | int | Max h-index across matched profiles. |

### Derived by `03_build_tables.py`

| Column | Type | Meaning |
|---|---|---|
| `n_publications` | int | Distinct publications linked in the bridge. |
| `n_recent` | int | Publications from 2023 onward (`CURRENT_YEAR - 3`). |
| `first_year` / `latest_year` | float | Span of linked publications. Null for the 3 faculty with none. |
| `total_citations` | float | Sum of `cited_by_count` over linked publications. |
| `is_head` | bool | Designation contains "Head". |
| `profile_status` | string | `complete` (35) or `incomplete` (3 — Chaitra B H, Manjunath A E, Vasanth M L). **Surface this in the UI rather than silently omitting them.** |
| `is_research_active` | bool | `latest_year >= 2023`. True for 32. |
| `collaboration_status` | string | Always `not_set`. **Opt-in only — never infer availability from publication activity.** |

---

## 4. `dim_publication.csv` — 650 rows, 35 columns

One row per unique work. Grain: `publication_id`.

`publication_id` is the OpenAlex short id (`W4403124150`) when known; otherwise `DOI-<sha1[:12]>`; otherwise `T-<sha1[:12]>` of the title.

### Core bibliographic

| Column | Type | Filled | Meaning |
|---|---|---|---|
| `publication_id` | string | 650 | Primary key. |
| `title` | string | 650 | Work title. |
| `publication_year` | int | 650 | Range 1974–2026. |
| `publication_type` | string | 650 | conference-paper (majority), article, book-chapter, preprint, review, etc. |
| `venue` | string | 382 | Journal/conference. Merged: original sheet → `venue_name` → Crossref `container-title`. |
| `doi` | string | 595 | Bare DOI, no prefix. |
| `publication_url` | url | 650 | Resolvable link, usually `https://doi.org/…`. |
| `openalex_work_id` | url | 606 | Full OpenAlex URL. Populated for every work the DOI backfill resolved. |
| `cited_by_count` | int | 650 | Citations at retrieval time. Changes over time. |
| `source_name` | string | 650 | `OpenAlex` or `Crossref`. |

### Enrichment from OpenAlex — *the reason this table is useful*

| Column | Type | Filled | Meaning |
|---|---|---|---|
| `abstract` | string | **544/650 (84%)** | Reconstructed from OpenAlex `abstract_inverted_index`. Mean ≈1,146 chars. |
| `abstract_len` | float | 649 | Character length; 0 where absent. |
| `topic_1` … `topic_3` | string | 649 / 586 / 545 | Ranked OpenAlex topics — a **controlled vocabulary**. This is what makes Genie able to filter properly instead of `LIKE '%keyword%'` against titles. |
| `topic_1_score` | float | 649 | Confidence of the primary topic, 0–1. |
| `subfield` / `field` / `domain` | string | 649 | Topic hierarchy. `field` is mostly Computer Science (383), Engineering (89). |
| `topics_all` | string | 649 | All topics, semicolon-separated. Source for `faculty_topic`. |
| `keywords` | string | 650 | OpenAlex keywords. |
| `concepts` | string | 649 | Concepts scoring ≥ 0.3. |
| `venue_name` / `venue_type` | string | 355 | Venue from OpenAlex `primary_location.source`. |
| `language` | string | 618 | ISO code, overwhelmingly `en`. |
| `n_authors` | float | 649 | Author count. |
| `referenced_works_count` | float | 649 | Size of the reference list. |
| `is_open_access` / `oa_status` / `oa_url` | mixed | 649 / 649 / 176 | OA flag, status (closed/gold/green/bronze/hybrid/diamond), and full-text URL where free. ~25% are OA. **Cast `is_open_access` to boolean on load** — CSV round-tripping leaves it as object. |

### Attribution quality — read this before using the table

| Column | Type | Meaning |
|---|---|---|
| `author_institutions` | string | 436 filled. All institutions across all authorships, deduplicated. |
| `institution_countries` | string | 264 filled. ISO country codes. |
| `has_rvce_author` | bool | True (248) when any author's institution matches `r.v. college \| rv college \| rashtreeya vidyalaya \| rvce`. |
| `attribution_confidence` | string | `high` (248) — an RVCE-affiliated author is present. `medium` (368) — no affiliation data, published 2010+. `low` (34) — no RVCE author **and** pre-2010. |
| `is_recent` | bool | `publication_year >= 2023`. |

**Recommended default: filter `attribution_confidence != 'low'` in your gold views.** That removes both known false positives — the 1982 isophthalic-acid paper (resolves to *Indian Institute of Science Bangalore*) and a 1987 Indonesian soil-science paper — while keeping genuine older work. `medium` is not a warning; it usually means OpenAlex simply has no affiliation metadata for that record.

---

## 5. `bridge_faculty_publication.csv` — 707 rows, 6 columns

Many-to-many between faculty and publications. Grain: `(faculty_id, publication_id)`.

| Column | Meaning |
|---|---|
| `faculty_id`, `publication_id` | Composite key. |
| `faculty_name` | Denormalised for convenience. |
| `match_method` | `openalex_name_match` (652) or `crossref_affiliation_anchored` (55). |
| `verification_status` | Human-readable evidence, e.g. `crossref; author affiliation RVCE; name score 0.92`. |
| `source_name` | `OpenAlex` or `Crossref`. |

707 links over 650 publications: the difference is internal co-authorship, where one paper legitimately links to several RVCE faculty.

---

## 6. `faculty_topic.csv` — 1,125 rows, 9 columns

**The table Genie should query for "who works on X".** Grain: `(faculty_id, topic)`.

| Column | Type | Meaning |
|---|---|---|
| `faculty_id` | string | FK to `dim_faculty`. |
| `topic` | string | OpenAlex topic label — controlled vocabulary, not free text. |
| `n_papers` | int | Distinct publications by this person on this topic. |
| `first_year` / `latest_year` | int | Activity window for this topic. |
| `citations` | int | Citations summed over those papers. |
| `field` / `domain` | string | Topic hierarchy. |
| `is_active_topic` | bool | `latest_year >= 2023`. |

Covers **all 35 faculty who have publications**. Department-wide leaders: Cloud Computing and Resource Management (33), Internet Traffic Analysis and Secure E-voting (28), Advanced Neural Network Applications (27), Anomaly Detection (25), Spam and Phishing Detection (23).

---

## 7. `gold_faculty_expertise.csv` — 38 rows, 19 columns

`dim_faculty` + aggregated topics, pre-joined. One row per faculty, designed as the primary surface for the Genie space.

Columns: `faculty_id`, `faculty_name`, `designation`, `department`, `is_head`, `areas_of_interest`, `top_topics`, `n_publications`, `n_recent`, `first_year`, `latest_year`, `total_citations`, `openalex_h_index_max`, `is_research_active`, `profile_status`, `collaboration_status`, `official_email`, `google_scholar_id`, `vidwan_id`.

`top_topics` renders the six strongest topics with counts, e.g.
`Video Surveillance and Tracking Methods (33); Advanced Neural Network Applications (18); Network Security and Intrusion Detection (14)`.

**Write thorough column comments on this table in Unity Catalog.** Genie's SQL accuracy depends more on those comments than on anything else.

---

## 8. `publication_embedding_input.csv` — 650 rows, 4 columns

Pre-assembled text for the embedding pass. Grain: `publication_id`.

| Column | Meaning |
|---|---|
| `publication_id` | FK to `dim_publication`. |
| `embedding_text` | `title \n abstract \n topics_all \n keywords \n concepts`, newline-joined, nulls skipped. |
| `text_len` | Character count. Mean 1,538. |
| `has_abstract` | True when an abstract over 40 chars exists (542 rows). |

At 650 rows, compute embeddings once, store them in Delta as `ARRAY<FLOAT>`, and brute-force cosine in the application. Mosaic AI Vector Search is unnecessary at this scale and its Free Edition quota (one endpoint, one search unit, Delta Sync index only) is a limit you can trip.

---

## 9. `qa_attribution_flags.csv` — 34 rows, 5 columns

The `attribution_confidence = 'low'` slice, for manual review: `publication_id`, `title`, `publication_year`, `venue`, `author_institutions`.

Not all 34 are errors. Several are plausibly genuine pre-2010 work by long-serving faculty (cognitive-agent authentication papers, 2007–09) that simply lack affiliation metadata in OpenAlex. Confirmed errors so far: the 1982 isophthalic-acid paper and the 1987 pedogenesis paper.

---

## 10. Known limitations

**Not an HR roster.** This is publicly identifiable CSE faculty from official material circa 2022–2025, snapshotted 2026-09-01. People join, leave, and move between CSE, CSE–DS and CSE–CY while old PDFs stay online.

**Not an exhaustive bibliography.** Institutional lists omit older work, work published before joining RVCE, online-first papers, non-indexed regional venues, and records never synced to an academic identity.

**3 faculty still have no publications** — Chaitra B H, Manjunath A E, Vasanth M L. Neither OpenAlex nor Crossref returned an affiliation-anchored match. They carry `profile_status = 'incomplete'`.

**Heavy skew.** Mohana (121), Nagaraja G S (115) and Minal Moharir (93) hold roughly half the corpus; the median faculty member has 12 publications. Any breadth-weighted ranking will surface these three for almost any query — damp breadth and lean on match closeness, then test with three unrelated ideas.

**Narrow topic distribution.** The department clusters around cloud computing, network security, neural networks and anomaly detection. A student idea outside that space genuinely has no strong match, and the product should be able to say so rather than returning a confident weak top-3.

**Topic labels are reliable; `field` labels are not always.** OpenAlex filed Shanta Rangaswamy's route-guidance paper under `field: Social Sciences` while assigning correct topics (Transportation Planning and Optimization). Filter and match on `topic_1`/`topics_all`, not on `field`.

**Contact channel is thin.** Only 6 of 38 have a published email. Route collaboration requests to an in-app inbox rather than assuming email delivery — which is better for consent anyway.

**Citation counts drift.** `cited_by_count`, h-index and OA status were true at `retrieved_at` and change continuously.

**Consent.** Publication metadata is public. An inferred "open to collaboration" label on a named professor is not — hence `collaboration_status = 'not_set'` everywhere. Present matches as *research overlap*, never as an availability claim, until a faculty member opts in.

---

## 11. Quality validation

Retrieval was tested directly, using TF-IDF as a stand-in for embeddings over the 626 publications remaining after dropping `attribution_confidence = 'low'`.

**Self-retrieval** — query with each faculty member's own strongest topic, do they surface?

| | Before backfill (24 faculty) | After backfill (35 faculty) |
|---|---|---|
| top-1 | 38% | **40%** |
| top-3 | 67% | **66%** |
| top-10 | 100% | **97%** |

Accuracy held while the pool grew by 11 harder-to-match faculty. TF-IDF is the weakest possible matcher; real embeddings should improve on this.

**Sample idea queries** behaved sensibly: *drone crowd surveillance* → Mohana (34 matching papers, cleanly separated from second place); *phishing extension* → Minal Moharir; *privacy-preserving anonymisation* → Veena Gadad, Sowmyarani C N; *traffic route guidance* → Nagaraja G S, Chethana Murthy.

**Two findings that should shape the application:**

*No absolute "no match" threshold exists.* An out-of-scope idea (protein folding) still scored 0.327 — higher than a legitimate third-place match on another query. The usable signal is **breadth, not the composite score**: every protein-folding candidate had exactly 1 paper above threshold, where the drone query gave Mohana 34. Gate on depth and breadth together and be willing to say "no strong match on campus".

*The corpus is skewed.* Mohana (121 publications), Nagaraja G S (115) and Minal Moharir (93) hold roughly half of it, and Mohana surfaced in the top 3 for three of four test ideas. Sometimes deservedly — but log-damp breadth and re-test whenever the ranking changes.

---

## 12. Loading into Databricks

Suggested layout in Unity Catalog:

```
netree.silver.dim_faculty
netree.silver.dim_publication
netree.silver.bridge_faculty_publication
netree.gold.faculty_topic
netree.gold.faculty_expertise          -- Genie space reads gold only
netree.gold.publication_embedding      -- embedding_text + ARRAY<FLOAT> vector
```

Casts to apply on load: `scopus_id` and `vidwan_id` → `BIGINT` or `STRING`; `is_open_access` → `BOOLEAN`; `first_year`, `latest_year`, `abstract_len`, `n_authors`, `referenced_works_count` → `INT` (they are float only because of CSV nulls).

Point the Genie space at the **gold** schema only, and give every column a comment written the way a student would describe it.
