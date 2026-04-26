import Link from "next/link";
import { CATALOG_UNITS, VAT_RATES } from "@/lib/crm/catalog";
import { createCatalogItemForm } from "../actions";

const UNIT_LABELS: Record<(typeof CATALOG_UNITS)[number], string> = {
  piece: "Piece",
  hour: "Hour",
  person: "Person",
  flat: "Flat",
};

export default function NewCatalogItemPage() {
  return (
    <section className="max-w-xl space-y-6">
      <div>
        <Link href="/app/catalog" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to catalog
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">New catalog item</h1>
      </div>

      <form
        action={createCatalogItemForm}
        className="space-y-4 rounded border border-zinc-200 bg-white p-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">SKU *</span>
          <input
            name="sku"
            required
            maxLength={100}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Name *</span>
          <input
            name="name"
            required
            maxLength={200}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Category *</span>
            <input
              name="category"
              required
              maxLength={100}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Subcategory</span>
            <input
              name="subcategory"
              maxLength={100}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Price net (cents) *</span>
            <input
              type="number"
              name="default_price_net_cents"
              required
              min={0}
              step={1}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Cost net (cents)</span>
            <input
              type="number"
              name="cost_default_net_cents"
              min={0}
              step={1}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">VAT *</span>
            <select
              name="vat_rate"
              required
              defaultValue="19"
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            >
              {VAT_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Unit *</span>
          <select
            name="unit"
            required
            defaultValue="piece"
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            {CATALOG_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save catalog item
          </button>
        </div>
      </form>
    </section>
  );
}
