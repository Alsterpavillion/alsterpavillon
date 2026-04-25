import Link from "next/link";
import { createCompany } from "@/lib/crm/actions";

export default function NewCompanyPage() {
  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/companies" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to companies
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">New company</h1>
      </div>

      <form action={createCompany} className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Name</span>
          <input
            name="name"
            required
            maxLength={200}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">VAT ID</span>
          <input
            name="vat_id"
            maxLength={100}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Billing address</span>
          <textarea
            name="billing_address"
            rows={4}
            maxLength={2000}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Notes</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={5000}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create company
        </button>
      </form>
    </section>
  );
}
