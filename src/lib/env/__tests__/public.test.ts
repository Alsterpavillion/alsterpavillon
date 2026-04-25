import { describe, it, expect } from "vitest";
import { parsePublicEnv, publicSchema } from "../public";

describe("parsePublicEnv", () => {
  it("accepts valid public env", () => {
    const result = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
    expect(result.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("fails closed when SUPABASE URL is missing", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toThrow(/Invalid public environment variables/);
  });

  it("fails closed when SUPABASE URL is not a URL", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toThrow(/Invalid public environment variables/);
  });

  it("fails closed when ANON_KEY is empty", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toThrow(/Invalid public environment variables/);
  });

  it("schema rejects unknown fields shape (sanity)", () => {
    expect(publicSchema.safeParse({}).success).toBe(false);
  });
});
