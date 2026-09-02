import "server-only";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { rethrowFrameworkError } from "@/lib/framework-error";
import { hasWarehouse, silver } from "@/lib/env";
import { execute, query } from "@/lib/databricks/sql";
import { isEphemeralMirror, mirrorPath } from "@/lib/store/local-dir";

/**
 * Append-only record store.
 *
 * Every write appends a new row; reads keep the newest row per id. Nothing is
 * ever updated in place, so a project's whole history stays queryable and two
 * concurrent writers can never lose each other's work — they just produce two
 * revisions, and the later one wins.
 *
 * Delta tables when a warehouse is configured, newline-delimited JSON on disk
 * when it is not. Same semantics either way.
 */

export const TABLES = [
  "app_user",
  "app_project",
  "app_opportunity",
  "app_invitation",
  "app_interest",
  "app_message",
  "app_meeting",
  "app_question",
  "app_event_attendance",
] as const;

export type TableName = (typeof TABLES)[number];

export type RecordRow = {
  id: string;
  owner_id: string;
  ref_id: string;
  status: string;
  payload: string;
  updated_at: string;
};

/**
 * The mirror only ever holds what one instance wrote before a warehouse was
 * attached; see `mirrorDir` for where it lands on a read-only host.
 */
function localPath(table: TableName) {
  return mirrorPath(`${table}.jsonl`);
}

function readLocal(table: TableName): RecordRow[] {
  const file = localPath(table);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RecordRow);
}

function latestPerId(rows: RecordRow[]) {
  const newest = new Map<string, RecordRow>();
  for (const row of rows) {
    const seen = newest.get(row.id);
    if (!seen || row.updated_at >= seen.updated_at) newest.set(row.id, row);
  }
  return [...newest.values()];
}

export type Filter = { owner_id?: string; ref_id?: string; status?: string };

function matches(row: RecordRow, filter: Filter) {
  if (filter.owner_id && row.owner_id !== filter.owner_id) return false;
  if (filter.ref_id && row.ref_id !== filter.ref_id) return false;
  if (filter.status && row.status !== filter.status) return false;
  return true;
}

/** Writes one revision. `payload` carries the full entity as JSON. */
export async function putRecord<T extends { [k: string]: unknown }>(
  table: TableName,
  entity: { id: string; owner_id?: string; ref_id?: string; status?: string; payload: T },
) {
  const row: RecordRow = {
    id: entity.id,
    owner_id: entity.owner_id ?? "",
    ref_id: entity.ref_id ?? "",
    status: entity.status ?? "",
    payload: JSON.stringify(entity.payload),
    updated_at: new Date().toISOString(),
  };

  if (hasWarehouse()) {
    try {
      await execute(
        `INSERT INTO ${silver(table)} (id, owner_id, ref_id, status, payload, updated_at)
         VALUES (:id, :owner_id, :ref_id, :status, :payload, CAST(:updated_at AS TIMESTAMP))`,
        [
          { name: "id", value: row.id },
          { name: "owner_id", value: row.owner_id },
          { name: "ref_id", value: row.ref_id },
          { name: "status", value: row.status },
          { name: "payload", value: row.payload },
          { name: "updated_at", value: row.updated_at },
        ],
      );
      return row;
    } catch (err) {
      rethrowFrameworkError(err);
      // On a serverless host the mirror is not a fallback - it is a hole. Fail
      // loudly so the caller can tell the person their change was not saved.
      if (isEphemeralMirror()) {
        throw new Error(
          `Could not save to ${table}: the warehouse did not answer and this host has no durable local mirror.`,
          { cause: err },
        );
      }
      console.warn(`[netree] write to ${table} failed, mirroring locally:`, err);
    }
  }
  appendFileSync(localPath(table), `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

async function allRows(table: TableName): Promise<RecordRow[]> {
  if (hasWarehouse()) {
    try {
      const rows = await query<RecordRow>(
        `SELECT id, owner_id, ref_id, status, payload, CAST(updated_at AS STRING) AS updated_at
           FROM ${silver(table)}
         QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) = 1`,
      );
      return rows;
    } catch (err) {
      rethrowFrameworkError(err);
      // Same reasoning as the write path: an empty ephemeral mirror is not a
      // degraded read, it is a wrong answer - "no rows" reads as signed out.
      if (isEphemeralMirror()) {
        throw new Error(
          `Could not read ${table}: the warehouse did not answer and this host has no local mirror to fall back to.`,
          { cause: err },
        );
      }
      console.warn(`[netree] read from ${table} failed, using local mirror:`, err);
    }
  }
  return latestPerId(readLocal(table));
}

export async function listRecords<T>(table: TableName, filter: Filter = {}): Promise<T[]> {
  const rows = (await allRows(table)).filter((r) => matches(r, filter));
  rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return rows.map((r) => JSON.parse(r.payload) as T);
}

export async function getRecord<T>(table: TableName, id: string): Promise<T | null> {
  const rows = await allRows(table);
  const hit = rows.find((r) => r.id === id);
  return hit ? (JSON.parse(hit.payload) as T) : null;
}

export async function findRecord<T>(
  table: TableName,
  predicate: (value: T) => boolean,
): Promise<T | null> {
  const all = await listRecords<T>(table);
  return all.find(predicate) ?? null;
}
