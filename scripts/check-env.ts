/**
 * Standalone ENV smoke check — used in CI before build.
 * Loads `.env.local` if present (dev) and validates both public + server schemas.
 * Exits with non-zero on any validation failure.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const root = resolve(process.cwd());
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

async function main(): Promise<void> {
  try {
    const { parsePublicEnv } = await import("../src/lib/env/public");
    const { parseServerEnv } = await import("../src/lib/env/server.schema");
    const publicValues = parsePublicEnv(process.env);
    const serverValues = parseServerEnv(process.env, publicValues);
    console.log("✔ ENV validation passed");
    console.log(`  NODE_ENV=${serverValues.NODE_ENV}`);
    console.log(`  Supabase URL=${publicValues.NEXT_PUBLIC_SUPABASE_URL}`);
  } catch (err) {
    console.error("✘ ENV validation FAILED");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
