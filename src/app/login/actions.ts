"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env/public";

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
  const callback = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_APP_URL);
  if (parsed.data.next) callback.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    return { ok: false, error: "Login fehlgeschlagen. Bitte erneut versuchen." };
  }

  return {
    ok: true,
    message: "Magic Link versendet. Bitte E-Mail-Postfach prüfen.",
  };
}
