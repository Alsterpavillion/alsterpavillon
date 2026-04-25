"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  next: z.string().startsWith("/").optional(),
});

export type LoginResult = { ok: true; message: string } | { ok: false; error: string };

export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
  // PKCE requires the callback origin to match the login origin because the verifier cookie is domain-scoped.
  const callback = new URL("/auth/callback", origin);
  if (parsed.data.next) callback.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    console.error("[auth/login] signInWithOtp failed", {
      message: error.message,
      status: error.status,
      email: parsed.data.email,
    });

    return { ok: false, error: "Login fehlgeschlagen. Bitte erneut versuchen." };
  }

  return {
    ok: true,
    message: "Magic Link versendet. Bitte E-Mail-Postfach prüfen.",
  };
}
