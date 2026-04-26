/**
 * Regenerate `supabase/migrations/0007_catalog_seed.sql` from the typed
 * `CATALOG_SEED_ITEMS` source-of-truth.
 *
 * Run after editing `src/lib/crm/__seed__/catalog-seed.ts`:
 *   pnpm tsx scripts/render-catalog-seed.ts
 *
 * The seed-sync test fails when the rendered output and the committed file
 * diverge — re-running this script restores parity.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCatalogSeedSql } from "../src/lib/crm/__seed__/catalog-seed";

const target = resolve(process.cwd(), "supabase/migrations/0007_catalog_seed.sql");
writeFileSync(target, renderCatalogSeedSql(), "utf-8");

console.log(`✔ Wrote ${target}`);
