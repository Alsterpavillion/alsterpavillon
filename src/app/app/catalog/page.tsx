import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listCatalogItemsRecord,
  type ClassificationStatus,
  type DispatchRole,
} from "@/lib/crm/catalog";

type ClassificationRow = {
  catalog_item_id: string;
  classification_status: ClassificationStatus;
};

type PrimaryDispatchRow = {
  catalog_item_id: string;
  dispatch_role: DispatchRole;
};

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function CatalogPage() {
  const supabase = await createSupabaseServerClient();

  const [items, classificationsResult, primaryDispatchResult] = await Promise.all([
    listCatalogItemsRecord(supabase),
    supabase.from("catalog_classifications").select("catalog_item_id, classification_status"),
    supabase
      .from("catalog_dispatch")
      .select("catalog_item_id, dispatch_role")
      .eq("is_primary", true),
  ]);

  if (classificationsResult.error) {
    throw new Error(classificationsResult.error.message);
  }
  if (primaryDispatchResult.error) {
    throw new Error(primaryDispatchResult.error.message);
  }

  const classifications = new Map<string, ClassificationStatus>(
    ((classificationsResult.data ?? []) as ClassificationRow[]).map((row) => [
      row.catalog_item_id,
      row.classification_status,
    ]),
  );
  const primaryDispatch = new Map<string, DispatchRole>(
    ((primaryDispatchResult.data ?? []) as PrimaryDispatchRow[]).map((row) => [
      row.catalog_item_id,
      row.dispatch_role,
    ]),
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Catalog</h1>
          <p className="mt-1 text-sm text-zinc-600">Active catalog items (M2).</p>
        </div>
        <Link
          href="/app/catalog/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New catalog item
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Price net</th>
              <th className="px-4 py-3 font-medium">VAT</th>
              <th className="px-4 py-3 font-medium">Classification</th>
              <th className="px-4 py-3 font-medium">Primary role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.map((item) => {
              const status = classifications.get(item.id) ?? "pending";
              const primary = primaryDispatch.get(item.id);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    <Link
                      className="font-medium text-zinc-900 hover:underline"
                      href={`/app/catalog/${item.id}`}
                    >
                      {item.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-900">{item.name}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {item.category}
                    {item.subcategory ? ` / ${item.subcategory}` : ""}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.unit}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatEuro(item.default_price_net_cents)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.vat_rate}%</td>
                  <td className="px-4 py-3 text-zinc-600">{status}</td>
                  <td className="px-4 py-3 text-zinc-600">{primary ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">No catalog items yet.</p>
        ) : null}
      </div>
    </section>
  );
}
