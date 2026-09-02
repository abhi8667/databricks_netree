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
let ephemeral = false;

export function mirrorDir() {
  if (resolved) return resolved;
  const preferred = path.join(/*turbopackIgnore: true*/ process.cwd(), ".netree-local");
  try {
    mkdirSync(preferred, { recursive: true });
    resolved = preferred;
  } catch {
    resolved = path.join(os.tmpdir(), "netree-local");
    mkdirSync(resolved, { recursive: true });
    ephemeral = true;
  }
  return resolved;
}

/**
 * True when the mirror landed in the temp directory. There it is private to one
 * serverless instance and gone with it, so anything written there is invisible
 * to the very next request — a write that goes only here has not been saved.
 */
export function isEphemeralMirror() {
  mirrorDir();
  return ephemeral;
}

export function mirrorPath(file: string) {
  // turbopackIgnore keeps the build from tracing the whole project into the
  // deployment bundle just because this path is assembled at runtime.
  return path.join(/*turbopackIgnore: true*/ mirrorDir(), file);
}
