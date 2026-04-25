import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteCompany, updateCompany, type Company } from "@/lib/crm/actions";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: company, error } = await supabase.from("companies").select("*").eq("id", id).single();

  if (error || !company) {
    notFound();
  }

  const typedCompany = company as Company;
  const updateAction = updateCompany.bind(null, typedCompany.id);
  const deleteAction = deleteCompany.bind(null, typedCompany.id);

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/companies" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to companies
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">{typedCompany.name}</h1>
      </div>

      <form action={updateAction} className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Name</span>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={typedCompany.name}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">VAT ID</span>
          <input
            name="vat_id"
            maxLength={100}
            defaultValue={typedCompany.vat_id ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Billing address</span>
          <textarea
            name="billing_address"
            rows={4}
            maxLength={2000}
            defaultValue={typedCompany.billing_address ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Notes</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={5000}
            defaultValue={typedCompany.notes ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save company
          </button>
          <span className="text-xs text-zinc-500">
            Created {new Date(typedCompany.created_at).toLocaleDateString("de-DE")}
          </span>
        </div>
      </form>

      <form action={deleteAction}>
        <button type="submit" className="text-sm font-medium text-red-700 hover:text-red-900">
          Delete company
        </button>
      </form>
    </section>
  );
}
