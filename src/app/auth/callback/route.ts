import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/app";

  if (!code) {
    return new NextResponse(
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Completing sign-in</title>
  </head>
  <body>
    <script>
      (async () => {
        const nextPath = ${JSON.stringify(next)};
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");

        if (!accessToken || !refreshToken) {
          window.location.replace(${JSON.stringify(`${origin}/login?error=missing_code`)});
          return;
        }

        const response = await fetch("/auth/callback/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
        });

        window.location.replace(response.ok ? nextPath : ${JSON.stringify(`${origin}/login?error=exchange_failed`)});
      })();
    </script>
  </body>
</html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "referrer-policy": "no-referrer",
        },
      },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      codeParamPresent: !!code,
      origin,
    });

    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
