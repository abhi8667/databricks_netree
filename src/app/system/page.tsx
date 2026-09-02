import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { dbx, hasGenie, hasServing, hasWarehouse, runtimeMode } from "@/lib/env";
import { warehouseReachable } from "@/lib/databricks/sql";
import { referenceData } from "@/lib/store/reference";
import { spaceKind } from "@/lib/search/vectors";

export const dynamic = "force-dynamic";

/**
 * An honest status page. Netree degrades rather than breaks when a Databricks
 * component is missing, which is useful but easy to mistake for everything
 * working - so this says plainly which path each part of the product is
 * currently taking.
 */
export default async function SystemPage() {
  const [reference, vectors] = await Promise.all([referenceData(), spaceKind()]);
  const warehouse = hasWarehouse() ? await warehouseReachable() : false;

  const rows: { name: string; live: boolean; detail: string; note: string }[] = [
    {
      name: "SQL Statement Execution API",
      live: warehouse,
      detail: warehouse
        ? `Warehouse ${dbx.warehouseId.slice(0, 8)}… answering`
        : hasWarehouse()
          ? "Configured but not answering"
          : "Not configured",
      note: warehouse
        ? "Every read and write goes to Delta in Unity Catalog."
        : "Reading the Delta CSV export in Data/delta and appending writes to .netree-local.",
    },
    {
      name: "Genie Conversations API",
      live: hasGenie(),
      detail: hasGenie() ? `Space ${dbx.genieSpaceId}` : "No space configured",
      note: hasGenie()
        ? "Matching asks Genie who publishes on the idea's research areas and keeps the SQL it wrote."
        : "Matching runs on the embedding space alone. Add a space pointed at netree.gold to turn this on.",
    },
    {
      name: "Model Serving",
      live: hasServing(),
      detail: hasServing() ? dbx.chatEndpoint : "Not configured",
      note: hasServing()
        ? "Runs the idea interview, drafts pitches, and writes the one-line reason on each match."
        : "The interview follows a fixed five-question script and drafts come from templates.",
    },
    {
      name: "Vector space",
      live: vectors === "dense",
      detail: vectors === "dense" ? "Dense, from gold.publication_embedding" : "TF-IDF over embedding_text",
      note:
        vectors === "dense"
          ? "Brute-force cosine over 650 vectors held in process. No index, by design."
          : "Same corpus, same cosine. Run npm run db:embed to switch to dense vectors.",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Netree
      </Link>

      <header className="mt-5 border-b border-rule pb-6">
        <p className="eyebrow">System</p>
        <h1 className="mt-2 font-read text-4xl leading-tight text-ink">What is wired up</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          Netree degrades instead of breaking when a Databricks component is missing. That is
          convenient and easy to mistake for everything working, so this page says which path each
          part is taking right now.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge tone={runtimeMode() === "databricks" ? "solid" : "muted"}>
            {runtimeMode() === "databricks" ? "Databricks" : "Local fallback"}
          </Badge>
          <span className="font-mono text-[11px] text-faint">
            {dbx.catalog}.{"{"}
            {dbx.schemaRaw}, {dbx.schemaSilver}, {dbx.schemaGold}
            {"}"}
          </span>
        </div>
      </header>

      <ul className="divide-y divide-rule">
        {rows.map((row) => (
          <li key={row.name} className="grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 shrink-0 border border-ink ${row.live ? "bg-ink" : "bg-transparent"}`}
                />
                <h2 className="text-[16px] text-ink">{row.name}</h2>
              </div>
              <p className="mt-2 pl-[22px] text-[14px] leading-relaxed text-mute">{row.note}</p>
            </div>
            <p className="pl-[22px] font-mono text-[11px] text-faint sm:pl-0 sm:text-right">
              {row.detail}
            </p>
          </li>
        ))}
      </ul>

      <section className="border-t border-rule pt-8">
        <p className="eyebrow">Index loaded</p>
        <dl className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Figure value={reference.faculty.length} label="Faculty" />
          <Figure value={reference.publications.length} label="Publications" />
          <Figure value={reference.topics.length} label="Topic links" />
          <Figure value={reference.bridge.length} label="Authorships" />
        </dl>
        <p className="mt-6 text-[13px] leading-relaxed text-mute">
          The same figures are available as JSON at{" "}
          <code className="font-mono text-ink">/api/databricks/health</code>. The personal access
          token stays in this process and is never included in a response.
        </p>
      </section>
    </main>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-mono text-2xl tabular-nums text-ink">{value.toLocaleString()}</dt>
      <dd className="eyebrow mt-1">{label}</dd>
    </div>
  );
}
