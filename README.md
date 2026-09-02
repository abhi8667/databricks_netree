# Netree

Netree connects students to the faculty and alumni whose published work actually
overlaps their idea.

A student arrives with a sentence. Netree interviews them until it can write a
brief a professor could judge in thirty seconds, searches the department's
entire publication record for genuine overlap, and shows the result with the
papers behind it. If nobody on campus works on the thing, it says so.

Built on Databricks: Unity Catalog holds every table, Genie answers *who
publishes on this*, Model Serving runs the conversation, and the Statement
Execution API is the only write path.

---

## What it does

**Students**

- Pitch an idea through a conversation. One clarifying question at a time,
  stopping the moment the brief is fillable — a student who already wrote three
  paragraphs is not asked the same five questions as one who wrote a line.
- Edit the brief. Their wording wins over the model's.
- Find faculty overlap, ranked and evidenced. Every match names the papers.
- Send a collaboration request, from an editable draft — nothing is sent
  unreviewed.
- Propose meetings as a set of times, online or in person.
- Apply to open positions, or ask a mentor a single question with no proposal
  attached.

**Faculty**

- An inbox of proposals, each showing why it reached them before the pitch.
- Four decisions: accept, request changes, pass to a colleague, decline. Each
  requires something the student can act on.
- A clarification thread per proposal, and meeting confirmation by picking a slot.
- Post open positions with hours and commitment stated, and decide on applicants.

**Alumni**

- An answer queue for short student questions.
- The department index, searchable by name or research topic.

---

## The matching, and why it is built this way

The dataset ships with its own validation (`Data/SCHEMA.md`, section 11). Two of
its findings shape the entire ranking:

**There is no similarity threshold that separates a real match from a bad one.**
An out-of-scope idea (protein folding) still scored 0.327 against this corpus —
higher than a legitimate third-place match on another query. What separates them
is *breadth*: every protein-folding candidate had exactly one paper above
threshold, where a drone-surveillance query gave one professor thirty-four.

So Netree gates on depth and breadth together, and reports a weak field rather
than a confident weak top-three. The **overlap field** on the match screen plots
both axes at once and shades the corner where a candidate looks close but has
nothing behind it.

**The corpus is skewed.** Three faculty hold roughly half of it. Left alone they
win every query. Depth and breadth are log-damped and weighted by how much of a
person's own corpus the overlap represents, so a focused researcher with four
dead-on papers can beat a prolific one with four incidental ones.

`npm run eval:match` replays the four ideas `SCHEMA.md` records expected results
for. All four come out as documented:

```
phishing extension          -> Minal Moharir           (depth 4, breadth 7)
drone crowd surveillance    -> Mohana                  (depth 26, breadth 24)
privacy anonymisation       -> Veena Gadad             (depth 8, breadth 6)
protein folding             -> weak field: true
```

Two bugs were caught by that harness and are worth naming, because both produced
plausible-looking output:

- Cosine alone favoured title-only records. A paper called *React Apps with
  Server-Side Rendering* was the top hit for a phishing query, on the shared
  word "browser". Scores are now scaled by how much of the query a document
  covers, and single-term coincidences are dropped.
- Breadth counted any topic whose *label* shared a word with the idea, inflating
  every candidate to a dozen topics. It now counts only the topics the matching
  papers actually sit in.

---

## Architecture

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 App Router, TypeScript, React 19 |
| UI | Tailwind, Radix primitives, Lucide |
| Backend | Server actions and API routes. The PAT is read server-side only and never reaches the browser |
| Storage | Delta tables in Unity Catalog — `netree.raw` / `silver` / `gold` |
| Writes | SQL Statement Execution API, append-only, newest revision per id wins |
| Retrieval | Genie Conversations API, async: start, then poll to `COMPLETED` |
| Conversation | Model Serving — the interview, pitch drafts, match rationales |
| Embeddings | `ARRAY<FLOAT>` in Delta, brute-force cosine in process |
| Hosting | Vercel |

**Append-only, everywhere.** Every write adds a revision; reads keep the newest
row per id (`QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) = 1`).
Nothing updates in place, so a proposal's full history stays queryable and two
concurrent writers cannot lose each other's work — they produce two revisions
and the later one wins.

**No vector index.** 650 publications. Brute-force cosine over vectors held in
memory is the right answer at this scale, and it avoids the Free Edition vector
search quota entirely.

```
src/
  app/            routes: splash, login, onboarding, student, faculty, alumni, system
    actions/      server actions — the only callers of the Databricks clients
    api/          health endpoint
  components/     UI primitives, the app shell, the overlap field
  lib/
    databricks/   sql.ts (Statement Execution), genie.ts (Conversations), serving.ts
    store/        reference reader (gold), append-only record store, CSV parser
    search/       vectors.ts (cosine + TF-IDF), match.ts (the ranking)
    agent/        idea.ts (the interview), writer.ts (drafting)
scripts/          bootstrap, load, embed, eval
Data/delta/       the campus dataset as CSV — see Data/SCHEMA.md
```

---

## Running it

```bash
npm install
npm run dev
```

That works with no credentials at all. Netree reads `Data/delta/*.csv` in place
of the gold tables, appends writes to `.netree-local/`, and runs the interview
from a fixed script instead of Model Serving. Everything is usable; `/system`
says exactly which path each component is taking, because degrading quietly is
easy to mistake for working.

### With Databricks

```bash
cp .env.example .env.local   # fill in host, token, warehouse
npm run db:bootstrap         # catalog, schemas, tables, and the gold column comments
npm run db:load              # Data/delta -> Delta, via the Statement Execution API
npm run db:embed             # fills publication_embedding.vector (needs a serving endpoint)
```

Then create a Genie space pointed at **`netree.gold` only** and put its id in
`DATABRICKS_GENIE_SPACE_ID`.

`db:bootstrap` writes a comment on every `gold.faculty_expertise` column, phrased
the way a student would describe it out loud. Genie writes its SQL from those
comments, so they are the most load-bearing text in this repository — more so
than any prompt.

The load runs entirely through the Statement Execution API with bound
parameters: no volume, no file upload, no cluster filesystem. The same path the
running application uses.

### Deploying

Vercel. Set the same environment variables in the project settings.
`DATABRICKS_TOKEN` is server-side only — no `NEXT_PUBLIC_` prefix anywhere near it.

---

## The data

RVCE Bengaluru, Computer Science and Engineering: 38 faculty, 650 publications,
1,125 faculty-topic links, assembled from official college material, OpenAlex
and Crossref. `Data/SCHEMA.md` documents provenance, every column, and the
limitations. The ones that changed product decisions:

- **Attribution confidence.** 34 publications are known-suspect (a 1982 paper on
  soil bacteria among them). The `low` slice is dropped before anything can
  retrieve it.
- **Three faculty have no indexed publications.** They are shown with
  `profile_status: incomplete` and an explanation, not silently omitted.
- **`collaboration_status` is always `not_set`.** Publication metadata is public;
  an inferred "open to collaboration" label on a named professor is not. It is
  opt-in from the faculty profile and never inferred from publication activity.
  Matches are presented as *research overlap*, never as an availability claim.
- **Only 6 of 38 faculty have a published email.** Requests route to an in-app
  inbox rather than assuming email delivery, which is better for consent anyway.

---

## Design

Two inks: ink on paper. There is no accent hue anywhere — emphasis is carried by
inversion, a black block on white, and by hairlines. Archivo for interface,
Newsreader for anything meant to be read, JetBrains Mono for identifiers and
counts.

Numbers on screen are bound to real values from the dataset — papers on a topic,
publications matching, citations — never to a decorative percentage. The stage
markers on a project are numbered because a project genuinely is a sequence: you
cannot match against a brief that does not exist.

---

## Known limits

- Résumé text is read from plain-text files only. Other formats keep the
  filename, and the profile says so rather than pretending to have parsed it.
- Sign-in is by college ID with no password. Right for a campus tool with no
  public signup surface, wrong for anything beyond that — put SSO in front of it
  before it holds anything sensitive.
- The local JSONL mirror is a development convenience. On a read-only host it
  falls back to the temp directory, which means it does not survive a restart.
  Configure a warehouse for anything real.
- Citation counts, h-index and open-access status were true at the snapshot date
  and drift continuously.
