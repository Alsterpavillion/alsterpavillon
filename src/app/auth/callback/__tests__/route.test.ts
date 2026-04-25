import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockExchangeCodeForSession = vi.fn();
const mockSetSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      setSession: mockSetSession,
    },
  })),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
  });

  it("exchanges a PKCE code and preserves next", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import("../route");

    const response = await GET(
      new NextRequest("https://alsterpavillon.vercel.app/auth/callback?code=abc&next=/app"),
    );

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://alsterpavillon.vercel.app/app");
  });

  it("renders a hash-token bridge instead of redirecting missing_code", async () => {
    const { GET } = await import("../route");

    const response = await GET(
      new NextRequest("https://alsterpavillon.vercel.app/auth/callback?next=/app"),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("location")).toBeNull();
    expect(html).toContain('fragment.get("access_token")');
    expect(html).toContain('fragment.get("refresh_token")');
    expect(html).toContain("/auth/callback/session");
    expect(html).toContain("/login?error=missing_code");
    expect(html).toContain('const nextPath = "/app"');
  });

  it("sets a session from hash-token callback tokens", async () => {
    mockSetSession.mockResolvedValue({ error: null });
    const { POST } = await import("../session/route");

    const response = await POST(
      new NextRequest("https://alsterpavillon.vercel.app/auth/callback/session", {
        method: "POST",
        body: JSON.stringify({
          access_token: "access-token",
          refresh_token: "refresh-token",
        }),
      }),
    );

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
