/**
 * Next signals control flow with thrown errors: `redirect()`, `notFound()`, and
 * the request-time APIs that mark a route dynamic all throw something the
 * framework expects to catch itself. A `try/catch` around application code
 * swallows those too, which is how a redirect turns into a blank render or a
 * dynamic route quietly prerenders the wrong thing.
 *
 * `unstable_rethrow` from `next/navigation` does this job, but importing it
 * drags the client navigation module — and React context with it — into the
 * maintenance scripts, which run outside a Next server and crash on it. This is
 * the same check against the digests Next stamps on those errors.
 */

const CONTROL_FLOW_DIGESTS = new Set([
  "DYNAMIC_SERVER_USAGE",
  "BAILOUT_TO_CLIENT_SIDE_RENDERING",
  "NEXT_PRERENDER_INTERRUPTED",
  "HANGING_PROMISE_REJECTION",
  "CLIENT_HOOK_DYNAMIC",
]);

/** `redirect()` and the HTTP fallbacks carry arguments after a semicolon. */
const CONTROL_FLOW_PREFIXES = ["NEXT_REDIRECT", "NEXT_HTTP_ERROR_FALLBACK", "NEXT_NOT_FOUND"];

const REACT_POSTPONE = Symbol.for("react.postpone");

/** Rethrows anything Next threw to steer rendering; returns for real errors. */
export function rethrowFrameworkError(err: unknown): void {
  if (typeof err !== "object" || err === null) return;

  if ((err as { $$typeof?: symbol }).$$typeof === REACT_POSTPONE) throw err;

  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest === "string") {
    const code = digest.split(";")[0]!;
    if (CONTROL_FLOW_DIGESTS.has(code) || CONTROL_FLOW_PREFIXES.includes(code)) throw err;
  }

  const message = (err as { message?: unknown }).message;
  if (
    typeof message === "string" &&
    message.includes("needs to bail out of prerendering at this point because it used")
  ) {
    throw err;
  }

  if (err instanceof Error && err.cause) rethrowFrameworkError(err.cause);
}
