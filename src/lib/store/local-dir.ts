import "server-only";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where on-disk mirrors and snapshots live.
 *
 * The project directory during development; the OS temp directory on a
 * read-only host such as Vercel, where `process.cwd()` is `/var/task` and
 * every write fails. Resolved once per process and remembered.
 */
let resolved: string | null = null;

export function mirrorDir() {
  if (resolved) return resolved;
  const preferred = path.join(/*turbopackIgnore: true*/ process.cwd(), ".netree-local");
  try {
    mkdirSync(preferred, { recursive: true });
    resolved = preferred;
  } catch {
    resolved = path.join(os.tmpdir(), "netree-local");
    mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

export function mirrorPath(file: string) {
  // turbopackIgnore keeps the build from tracing the whole project into the
  // deployment bundle just because this path is assembled at runtime.
  return path.join(/*turbopackIgnore: true*/ mirrorDir(), file);
}
