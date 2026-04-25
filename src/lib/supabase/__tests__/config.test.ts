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
      "https://test.supabase.co",
      "test-anon-key",
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

    expect(createBrowserClient).toHaveBeenCalledWith("https://test.supabase.co", "test-anon-key", {
      auth: {
        flowType: "pkce",
      },
    });
  });
});
