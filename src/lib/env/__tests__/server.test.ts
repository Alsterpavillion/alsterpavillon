import { describe, it, expect } from "vitest";
import { parseServerEnv } from "../server.schema";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("accepts valid server env", () => {
    const env = parseServerEnv(
      {
        NODE_ENV: "test",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      },
      validPublic,
    );

    expect(env.NODE_ENV).toBe("test");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-key");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("fails closed when SERVICE_ROLE_KEY is missing", () => {
    expect(() => parseServerEnv({ NODE_ENV: "test" }, validPublic)).toThrow(
      /Invalid server environment variables/,
    );
  });

  it("fails closed when NODE_ENV is invalid", () => {
    expect(() =>
      parseServerEnv(
        {
          NODE_ENV: "staging",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        },
        validPublic,
      ),
    ).toThrow(/Invalid server environment variables/);
  });
});
