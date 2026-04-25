import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/crm/actions";

export default async function CompaniesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id,name,vat_id,updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Companies</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage CRM company records.</p>
        </div>
        <Link
          href="/app/companies/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New company
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">VAT ID</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {(companies as Pick<Company, "id" | "name" | "vat_id" | "updated_at">[] | null)?.map(
              (company) => (
                <tr key={company.id}>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-zinc-900 hover:underline" href={`/app/companies/${company.id}`}>
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{company.vat_id ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {new Date(company.updated_at).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {companies?.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">No companies yet.</p>
        ) : null}
      </div>
    </section>
  );
}
