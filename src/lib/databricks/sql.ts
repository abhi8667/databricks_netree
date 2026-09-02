import "server-only";
import { dbx } from "@/lib/env";

/**
 * Thin client over the Databricks SQL Statement Execution API.
 *
 * Everything the app persists goes through here. Statements are parameterised
 * (`:name`) so user text never reaches the SQL string — Databricks binds the
 * values server-side.
 */

export type SqlParam = { name: string; value: string | null; type?: string };

type StatementResponse = {
  statement_id: string;
  status: { state: string; error?: { message?: string } };
  manifest?: { schema?: { columns?: { name: string; type_name: string }[] } };
  result?: { data_array?: (string | null)[][]; next_chunk_internal_link?: string };
};

const API = "/api/2.0/sql/statements";

function headers() {
  return {
    Authorization: `Bearer ${dbx.token}`,
    "Content-Type": "application/json",
  };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${dbx.host}${path}`, {
    ...init,
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Databricks SQL ${res.status}: ${body.slice(0, 500)}`);
  }
  return (await res.json()) as StatementResponse;
}

/** Runs a statement to completion and returns rows as objects. */
export async function query<T = Record<string, string | null>>(
  statement: string,
  params: SqlParam[] = [],
): Promise<T[]> {
  let payload: StatementResponse = await call(API, {
    method: "POST",
    body: JSON.stringify({
      statement,
      warehouse_id: dbx.warehouseId,
      wait_timeout: "30s",
      on_wait_timeout: "CONTINUE",
      format: "JSON_ARRAY",
      disposition: "INLINE",
      parameters: params.map((p) => ({
        name: p.name,
        value: p.value,
        ...(p.type ? { type: p.type } : {}),
      })),
    }),
  });

  // PENDING/RUNNING means the 30s wait elapsed; poll until it settles.
  const deadline = Date.now() + 120_000;
  while (["PENDING", "RUNNING"].includes(payload.status.state)) {
    if (Date.now() > deadline) throw new Error("Databricks SQL statement timed out");
    await new Promise((r) => setTimeout(r, 900));
    payload = await call(`${API}/${payload.statement_id}`);
  }

  if (payload.status.state !== "SUCCEEDED") {
    throw new Error(
      `Databricks SQL ${payload.status.state}: ${payload.status.error?.message ?? "unknown error"}`,
    );
  }

  const columns = payload.manifest?.schema?.columns ?? [];
  const rows = payload.result?.data_array ?? [];
  return rows.map((row) => {
    const obj: Record<string, string | null> = {};
    columns.forEach((col, i) => {
      obj[col.name] = row[i] ?? null;
    });
    return obj as T;
  });
}

/** Fire-and-check for DDL / INSERT statements. */
export async function execute(statement: string, params: SqlParam[] = []) {
  await query(statement, params);
}

export async function warehouseReachable() {
  try {
    await query("SELECT 1 AS ok");
    return true;
  } catch {
    return false;
  }
}
