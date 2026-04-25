import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section>
      <h1 className="text-2xl font-semibold text-zinc-900">Foundation läuft</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Eingeloggt als <span className="font-mono">{user?.email}</span>.
      </p>
      <p className="mt-6 text-xs text-zinc-400">
        M0 Foundation — keine fachlichen Module. CRM / Offers / Events / Tasks / Material-Listen
        folgen ab M1.
      </p>
    </section>
  );
}
