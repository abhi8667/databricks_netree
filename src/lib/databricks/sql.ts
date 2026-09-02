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

/**
 * How long a statement may take before we give up on it.
 *
 * A serverless host kills the whole function after a fixed budget, so waiting
 * out a cold warehouse there means the request dies mid-flight and the caller
 * sees nothing at all — a form that spins forever. We stop first and throw,
 * which lets callers fall back or report the failure. Maintenance scripts run
 * without a function budget, so they keep the long deadline.
 */
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DEFAULT_DEADLINE_MS = Number(
  process.env.NETREE_SQL_DEADLINE_MS ?? (SERVERLESS ? 25_000 : 150_000),
);

/** Slack on top of a statement's own wait, to catch a connection that stalls. */
const REQUEST_OVERHEAD_MS = 10_000;

export type SqlOptions = { deadlineMs?: number };

function headers() {
  return {
    Authorization: `Bearer ${dbx.token}`,
    "Content-Type": "application/json",
  };
}

async function call(path: string, init?: RequestInit, timeoutMs = REQUEST_OVERHEAD_MS) {
  let res: Response;
  try {
    res = await fetch(`${dbx.host}${path}`, {
      ...init,
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`Databricks SQL request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
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
  options: SqlOptions = {},
): Promise<T[]> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const deadline = Date.now() + deadlineMs;

  // The API takes an inline wait of 5-50s. Spending most of the budget there
  // means a warehouse that is already awake answers in a single round trip.
  const waitSeconds = Math.min(50, Math.max(5, Math.round(deadlineMs / 1000) - 5));

  let payload: StatementResponse = await call(
    API,
    {
      method: "POST",
      body: JSON.stringify({
        statement,
        warehouse_id: dbx.warehouseId,
        wait_timeout: `${waitSeconds}s`,
        on_wait_timeout: "CONTINUE",
        format: "JSON_ARRAY",
        disposition: "INLINE",
        parameters: params.map((p) => ({
          name: p.name,
          value: p.value,
          ...(p.type ? { type: p.type } : {}),
        })),
      }),
    },
    waitSeconds * 1000 + REQUEST_OVERHEAD_MS,
  );

  // PENDING/RUNNING means the inline wait elapsed; poll until it settles.
  while (["PENDING", "RUNNING"].includes(payload.status.state)) {
    if (Date.now() > deadline) {
      throw new Error(
        `Databricks SQL statement timed out after ${deadlineMs}ms (state ${payload.status.state}) — the warehouse is probably still starting up.`,
      );
    }
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
export async function execute(statement: string, params: SqlParam[] = [], options: SqlOptions = {}) {
  await query(statement, params, options);
}

export async function warehouseReachable() {
  try {
    await query("SELECT 1 AS ok");
    return true;
  } catch {
    return false;
  }
}
