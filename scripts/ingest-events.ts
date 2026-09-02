/**
 * Standalone Event Ingestion CLI
 *
 *   npm run db:events:ingest
 *
 * Fetches Bengaluru Tech Week events and HackCulture hackathons,
 * validates schemas, hashes payloads, upserts into Databricks Delta tables
 * (if configured), and writes the local fallback snapshot.
 */
import { runEventsIngest } from "../src/lib/events/ingest";

async function main() {
  process.stdout.write("Starting live events and hackathons ingest...\n");
  const result = await runEventsIngest({ syncToLakehouse: true });
  process.stdout.write(
    `\nIngest completed successfully:\n` +
      `  Total Conformed Events: ${result.count}\n` +
      `  Bengaluru Tech Week:    ${result.btwCount}\n` +
      `  HackCulture:            ${result.hackcultureCount}\n` +
      `  Degraded / Stale Fallback: ${result.isStale}\n`,
  );
}

main().catch((err) => {
  console.error("Events ingest failed:", err);
  process.exit(1);
});
