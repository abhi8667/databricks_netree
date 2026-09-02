import "server-only";
import { readFileSync } from "node:fs";

/** RFC4180 parser — the campus CSVs contain quoted abstracts with newlines. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => (obj[h.trim()] = r[i] ?? ""));
      return obj;
    });
}

export function readCsv(path: string) {
  return parseCsv(readFileSync(path, "utf8"));
}

export const num = (v: string | null | undefined, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const maybeNum = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const bool = (v: string | null | undefined) =>
  String(v).toLowerCase() === "true" || v === "1";
