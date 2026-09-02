/**
 * Fills netree.gold.publication_embedding.vector using a Model Serving
 * embedding endpoint.
 *
 *   npm run db:embed
 *
 * 650 rows. Once these exist the application switches from the TF-IDF space to
 * dense cosine automatically - nothing else changes, because both are compared
 * the same way and only ever within themselves.
 */
import { embed } from "../src/lib/databricks/serving";
import { execute, query } from "../src/lib/databricks/sql";
import { dbx, hasWarehouse, hasServing } from "../src/lib/env";

const TABLE = `${dbx.catalog}.${dbx.schemaGold}.publication_embedding`;
const BATCH = 16;

async function main() {
  if (!hasWarehouse() || !hasServing()) {
    console.error("Needs DATABRICKS_HOST, DATABRICKS_TOKEN and DATABRICKS_WAREHOUSE_ID.");
    process.exit(1);
  }

  const pending = await query<{ publication_id: string; embedding_text: string }>(
    `SELECT publication_id, embedding_text
       FROM ${TABLE}
      WHERE vector IS NULL AND embedding_text IS NOT NULL`,
  );

  if (!pending.length) {
    process.stdout.write("Every publication already has a vector.\n");
    return;
  }

  process.stdout.write(
    `${pending.length} publications to embed via ${dbx.embeddingEndpoint}\n`,
  );

  let done = 0;
  for (let start = 0; start < pending.length; start += BATCH) {
    const slice = pending.slice(start, start + BATCH);
    // Endpoints reject very long inputs; the tail of an abstract carries the
    // least signal, so truncating there is the cheapest safe cut.
    const vectors = await embed(slice.map((row) => row.embedding_text.slice(0, 6000)));

    for (const [index, row] of slice.entries()) {
      const vector = vectors[index];
      if (!vector) continue;
      const literal = `array(${vector.map((v) => `CAST(${v} AS FLOAT)`).join(",")})`;
      await execute(
        `UPDATE ${TABLE} SET vector = ${literal} WHERE publication_id = :id`,
        [{ name: "id", value: row.publication_id }],
      );
      done++;
    }
    process.stdout.write(`  ${done}/${pending.length}\n`);
  }

  const [check] = await query<{ n: string; dim: string }>(
    `SELECT count(*) AS n, max(size(vector)) AS dim FROM ${TABLE} WHERE vector IS NOT NULL`,
  );
  process.stdout.write(`\n${check?.n} vectors stored, ${check?.dim} dimensions each.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
