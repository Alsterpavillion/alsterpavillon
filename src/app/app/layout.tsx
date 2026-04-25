import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-5">
            <Link href="/app" className="text-sm font-semibold text-zinc-900">
              Alsterpavillon
            </Link>
            <Link href="/app/companies" className="text-sm text-zinc-600 hover:text-zinc-900">
              Companies
            </Link>
            <Link href="/app/contacts" className="text-sm text-zinc-600 hover:text-zinc-900">
              Contacts
            </Link>
          </nav>
          <form action="/api/logout" method="post">
            <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900">
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
