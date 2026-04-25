/**
 * Pure server-env schema + parse function.
 * No `server-only` guard here — the schema must be importable from CI scripts
 * (e.g. `scripts/check-env.ts`) and unit tests. The runtime guard lives in
 * `./server.ts`, which imports from this file and adds the bundling barrier.
 */
import { z } from "zod";
import { type PublicEnv, type RawEnvSource } from "./public";

export const serverOnlySchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerOnlyEnv = z.infer<typeof serverOnlySchema>;
export type ServerEnv = ServerOnlyEnv & PublicEnv;

export function parseServerEnv(source: RawEnvSource, publicValues: PublicEnv): ServerEnv {
  const result = serverOnlySchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables (fail-closed):\n${issues}`);
  }

  return { ...publicValues, ...result.data };
}
