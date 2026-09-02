import { NextResponse } from "next/server";
import { dbx, hasGenie, hasServing, hasWarehouse, runtimeMode } from "@/lib/env";
import { warehouseReachable } from "@/lib/databricks/sql";
import { referenceData } from "@/lib/store/reference";
import { spaceKind } from "@/lib/search/vectors";

export const dynamic = "force-dynamic";

/**
 * What is actually wired up. The PAT never leaves this process - the response
 * reports only whether each piece is configured and reachable, never the token
 * or the host it points at.
 */
export async function GET() {
  const [reference, vectors] = await Promise.all([referenceData(), spaceKind()]);

  const warehouseConfigured = hasWarehouse();
  const warehouse = warehouseConfigured ? await warehouseReachable() : false;

  return NextResponse.json({
    mode: runtimeMode(),
    catalog: `${dbx.catalog}.{${dbx.schemaRaw},${dbx.schemaSilver},${dbx.schemaGold}}`,
    components: {
      sql_statement_execution: {
        configured: warehouseConfigured,
        reachable: warehouse,
        detail: warehouseConfigured
          ? warehouse
            ? "Reads and writes go to Delta."
            : "Credentials are set but the warehouse did not answer. Writes are mirroring to disk."
          : "Not configured. Reading the Delta CSV export and writing to a local JSONL mirror.",
      },
      genie: {
        configured: hasGenie(),
        space_id: hasGenie() ? dbx.genieSpaceId : null,
        detail: hasGenie()
          ? "Matching asks Genie who publishes on the idea's research areas, and keeps its SQL."
          : "No space configured. Matching runs on embeddings alone.",
      },
      model_serving: {
        configured: hasServing(),
        chat_endpoint: hasServing() ? dbx.chatEndpoint : null,
        embedding_endpoint: hasServing() ? dbx.embeddingEndpoint : null,
        detail: hasServing()
          ? "Runs the idea interview, the pitch drafts and the match rationales."
          : "Not configured. The interview follows a fixed script and drafts come from templates.",
      },
      vector_space: {
        kind: vectors,
        detail:
          vectors === "dense"
            ? "Dense vectors from gold.publication_embedding, brute-force cosine in process."
            : "TF-IDF over the same embedding_text, brute-force cosine in process.",
      },
    },
    index: {
      faculty: reference.faculty.length,
      publications: reference.publications.length,
      topic_links: reference.topics.length,
      faculty_publication_links: reference.bridge.length,
    },
  });
}
