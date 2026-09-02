import { loadEnvConfig } from "@next/env";

// The Next.js server loads .env.local automatically. Loading it here as well
// keeps direct maintenance scripts on the same server-only configuration.
loadEnvConfig(process.cwd());

/**
 * Server-only configuration. The PAT is read here and nowhere else that could
 * be bundled for the browser — every Databricks call goes through an API route.
 */
export const dbx = {
  host: (process.env.DATABRICKS_HOST ?? "").replace(/\/+$/, ""),
  token: process.env.DATABRICKS_TOKEN ?? "",
  warehouseId: process.env.DATABRICKS_WAREHOUSE_ID ?? "",
  catalog: process.env.DATABRICKS_CATALOG ?? "netree",
  schemaRaw: process.env.DATABRICKS_SCHEMA_RAW ?? "raw",
  schemaSilver: process.env.DATABRICKS_SCHEMA_SILVER ?? "silver",
  schemaGold: process.env.DATABRICKS_SCHEMA_GOLD ?? "gold",
  genieSpaceId: process.env.DATABRICKS_GENIE_SPACE_ID ?? "",
  chatEndpoint: process.env.DATABRICKS_CHAT_ENDPOINT ?? "databricks-claude-sonnet-4",
  embeddingEndpoint: process.env.DATABRICKS_EMBEDDING_ENDPOINT ?? "databricks-gte-large-en",
};

/** Gemini is used only for conversational generation, never as a data store. */
export const gemini = {
  apiKey: process.env.GEMINI_API_KEY ?? "",
  model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
};

const forcedLocal = process.env.NETREE_FORCE_LOCAL === "1";

/** True when we can run SQL against a warehouse. */
export const hasWarehouse = () =>
  !forcedLocal && Boolean(dbx.host && dbx.token && dbx.warehouseId);

/** True when a Genie space is wired up. */
export const hasGenie = () => !forcedLocal && Boolean(dbx.host && dbx.token && dbx.genieSpaceId);

/** True when Model Serving can be reached. */
export const hasServing = () => !forcedLocal && Boolean(dbx.host && dbx.token);

/** True when server-side Gemini calls are available. */
export const hasGemini = () => !forcedLocal && Boolean(gemini.apiKey);

export type RuntimeMode = "databricks" | "local";
export const runtimeMode = (): RuntimeMode => (hasWarehouse() ? "databricks" : "local");

export const silver = (table: string) => `${dbx.catalog}.${dbx.schemaSilver}.${table}`;
export const gold = (table: string) => `${dbx.catalog}.${dbx.schemaGold}.${table}`;
export const raw = (table: string) => `${dbx.catalog}.${dbx.schemaRaw}.${table}`;
