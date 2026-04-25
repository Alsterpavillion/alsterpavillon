import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = sessionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (error) {
    console.error("[auth/callback] setSession failed", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
    });

    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
