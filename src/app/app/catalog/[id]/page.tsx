import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CATALOG_UNITS,
  DISPATCH_ROLES,
  VAT_RATES,
  type CatalogClassification,
  type CatalogDispatch,
  type CatalogItem,
} from "@/lib/crm/catalog";
import { classifyCatalogItemForm, updateCatalogItemForm } from "../actions";

const UNIT_LABELS: Record<(typeof CATALOG_UNITS)[number], string> = {
  piece: "Piece",
  hour: "Hour",
  person: "Person",
  flat: "Flat",
};

export default async function CatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [itemResult, classResult, dispatchResult] = await Promise.all([
    supabase.from("catalog_items").select("*").eq("id", id).single(),
    supabase.from("catalog_classifications").select("*").eq("catalog_item_id", id).maybeSingle(),
    supabase.from("catalog_dispatch").select("*").eq("catalog_item_id", id),
  ]);

  if (itemResult.error || !itemResult.data) {
    notFound();
  }
  if (classResult.error) {
    throw new Error(classResult.error.message);
  }
  if (dispatchResult.error) {
    throw new Error(dispatchResult.error.message);
  }

  const item = itemResult.data as CatalogItem;
  const classification = (classResult.data ?? null) as CatalogClassification | null;
  const dispatchRows = (dispatchResult.data ?? []) as CatalogDispatch[];

  const checkedRoles = new Set(dispatchRows.map((d) => d.dispatch_role));
  const primaryRole = dispatchRows.find((d) => d.is_primary)?.dispatch_role;

  const updateAction = updateCatalogItemForm.bind(null, item.id);
  const classifyAction = classifyCatalogItemForm.bind(null, item.id);

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/catalog" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to catalog
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          <span className="font-mono text-base text-zinc-500">{item.sku}</span>{" "}
          <span>{item.name}</span>
        </h1>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs text-zinc-600">
          <div>
            <dt className="text-zinc-500">Classification</dt>
            <dd className="text-zinc-800">{classification?.classification_status ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Dispatch roles</dt>
            <dd className="text-zinc-800">
              {dispatchRows.length === 0
                ? "—"
                : dispatchRows.map((d) => d.dispatch_role).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Primary</dt>
            <dd className="text-zinc-800">{primaryRole ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <form action={updateAction} className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-medium text-zinc-900">Item details</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">SKU *</span>
          <input
            name="sku"
            required
            maxLength={100}
            defaultValue={item.sku}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Name *</span>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={item.name}
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
              defaultValue={item.category}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Subcategory</span>
            <input
              name="subcategory"
              maxLength={100}
              defaultValue={item.subcategory ?? ""}
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
              defaultValue={item.default_price_net_cents}
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
              defaultValue={item.cost_default_net_cents ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">VAT *</span>
            <select
              name="vat_rate"
              required
              defaultValue={String(item.vat_rate)}
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
            defaultValue={item.unit}
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

      <form
        action={classifyAction}
        className="space-y-4 rounded border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-base font-medium text-zinc-900">Mapping</h2>
        <p className="text-sm text-zinc-600">
          Pick the dispatch roles for this item. The primary role drives function-sheet ordering.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-1 block text-sm text-zinc-700">Dispatch roles</legend>
          {DISPATCH_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`role_${role}`}
                defaultChecked={checkedRoles.has(role)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="text-zinc-800">{role}</span>
            </label>
          ))}
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Primary role</span>
          <select
            name="primary_role"
            defaultValue={primaryRole ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            <option value="">— first selected —</option>
            {DISPATCH_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Apply mapping
          </button>
        </div>
      </form>
    </section>
  );
}
