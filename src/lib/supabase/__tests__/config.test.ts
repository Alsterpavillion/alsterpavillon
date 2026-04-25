import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Supabase auth flow config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates the server client with explicit PKCE auth settings", async () => {
    const createServerClient = vi.fn(() => ({}));
    vi.doMock("@supabase/ssr", () => ({ createServerClient }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(async () => ({
        getAll: vi.fn(() => []),
        set: vi.fn(),
      })),
    }));

    const { createSupabaseServerClient } = await import("../server");
    await createSupabaseServerClient();

    expect(createServerClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      expect.objectContaining({
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
        },
      }),
    );
  });

  it("creates the browser client with explicit PKCE auth settings", async () => {
    const createBrowserClient = vi.fn(() => ({}));
    vi.doMock("@supabase/ssr", () => ({ createBrowserClient }));

    const { createSupabaseBrowserClient } = await import("../client");
    createSupabaseBrowserClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          flowType: "pkce",
        },
      },
    );
  });
});
