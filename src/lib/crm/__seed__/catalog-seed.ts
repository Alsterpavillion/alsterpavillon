/**
 * Single source of truth for the M2 catalog seed (~30 Alsterpavillon items).
 *
 * The committed file `supabase/migrations/0007_catalog_seed.sql` is the
 * `renderCatalogSeedSql()` output. Tests verify byte-for-byte sync — if the
 * data below changes, the migration must be regenerated and committed
 * together with this file.
 *
 * Convention: `dispatch_roles[0]` is the primary role for the item.
 */

import type { CatalogUnit, DispatchRole, VatRate } from "../catalog";

export type CatalogSeedItem = {
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly default_price_net_cents: number;
  readonly vat_rate: VatRate;
  readonly cost_default_net_cents: number | null;
  readonly unit: CatalogUnit;
  readonly dispatch_roles: readonly DispatchRole[];
};

export const CATALOG_SEED_ITEMS: readonly CatalogSeedItem[] = [
  // ── Räume ──
  {
    sku: "AP-RM-ALSTER-D",
    name: "Raummiete Alsterzimmer Ganztag",
    category: "Raum",
    subcategory: "Vermietung",
    default_price_net_cents: 120_000,
    vat_rate: 19,
    cost_default_net_cents: 30_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-RM-ALSTER-H",
    name: "Raummiete Alsterzimmer Halbtag",
    category: "Raum",
    subcategory: "Vermietung",
    default_price_net_cents: 70_000,
    vat_rate: 19,
    cost_default_net_cents: 20_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-RM-PAVILLON-D",
    name: "Raummiete Pavillon Ganztag",
    category: "Raum",
    subcategory: "Vermietung",
    default_price_net_cents: 180_000,
    vat_rate: 19,
    cost_default_net_cents: 50_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-RM-PAVILLON-H",
    name: "Raummiete Pavillon Halbtag",
    category: "Raum",
    subcategory: "Vermietung",
    default_price_net_cents: 100_000,
    vat_rate: 19,
    cost_default_net_cents: 30_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-RM-TERRASSE-D",
    name: "Raummiete Terrasse Ganztag (saisonal)",
    category: "Raum",
    subcategory: "Vermietung",
    default_price_net_cents: 80_000,
    vat_rate: 19,
    cost_default_net_cents: 15_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },

  // ── Standardtechnik ──
  {
    sku: "AP-TECH-BEAMER",
    name: "Beamer Standard",
    category: "Technik",
    subcategory: "AV",
    default_price_net_cents: 15_000,
    vat_rate: 19,
    cost_default_net_cents: 3_000,
    unit: "flat",
    dispatch_roles: ["tech"],
  },
  {
    sku: "AP-TECH-LEINWAND",
    name: "Leinwand 2x2m",
    category: "Technik",
    subcategory: "AV",
    default_price_net_cents: 8_000,
    vat_rate: 19,
    cost_default_net_cents: 1_000,
    unit: "flat",
    dispatch_roles: ["tech"],
  },
  {
    sku: "AP-TECH-MIC-HAND",
    name: "Funkmikrofon Handheld",
    category: "Technik",
    subcategory: "Audio",
    default_price_net_cents: 5_000,
    vat_rate: 19,
    cost_default_net_cents: 800,
    unit: "flat",
    dispatch_roles: ["tech"],
  },
  {
    sku: "AP-TECH-MIC-HEADSET",
    name: "Funkmikrofon Headset",
    category: "Technik",
    subcategory: "Audio",
    default_price_net_cents: 6_000,
    vat_rate: 19,
    cost_default_net_cents: 1_000,
    unit: "flat",
    dispatch_roles: ["tech"],
  },
  {
    sku: "AP-TECH-PA-S",
    name: "PA-Anlage klein",
    category: "Technik",
    subcategory: "Audio",
    default_price_net_cents: 12_000,
    vat_rate: 19,
    cost_default_net_cents: 2_500,
    unit: "flat",
    dispatch_roles: ["tech"],
  },
  {
    sku: "AP-TECH-BUEHNE-2",
    name: "Bühnenelement 2x1m",
    category: "Technik",
    subcategory: "Stage",
    default_price_net_cents: 7_500,
    vat_rate: 19,
    cost_default_net_cents: 1_200,
    unit: "piece",
    dispatch_roles: ["tech", "operations"],
  },

  // ── Service & Operations ──
  {
    sku: "AP-SVC-WAITER-H",
    name: "Servicepersonal Stunde",
    category: "Service",
    subcategory: "Personal",
    default_price_net_cents: 4_500,
    vat_rate: 19,
    cost_default_net_cents: 2_800,
    unit: "hour",
    dispatch_roles: ["service"],
  },
  {
    sku: "AP-SVC-BAR-H",
    name: "Bar-Personal Stunde",
    category: "Service",
    subcategory: "Personal",
    default_price_net_cents: 4_800,
    vat_rate: 19,
    cost_default_net_cents: 3_000,
    unit: "hour",
    dispatch_roles: ["service"],
  },
  {
    sku: "AP-OPS-EVENTLEAD",
    name: "Eventleitung pauschal",
    category: "Operations",
    subcategory: "Personal",
    default_price_net_cents: 35_000,
    vat_rate: 19,
    cost_default_net_cents: 18_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-SVC-GARDEROBE",
    name: "Garderobenservice mit Personal",
    category: "Service",
    subcategory: "Personal",
    default_price_net_cents: 25_000,
    vat_rate: 19,
    cost_default_net_cents: 12_000,
    unit: "flat",
    dispatch_roles: ["service"],
  },
  {
    sku: "AP-OPS-AUFBAU",
    name: "Aufbau / Abbau pauschal",
    category: "Operations",
    subcategory: "Logistik",
    default_price_net_cents: 30_000,
    vat_rate: 19,
    cost_default_net_cents: 15_000,
    unit: "flat",
    dispatch_roles: ["operations", "service"],
  },

  // ── Catering ──
  {
    sku: "AP-CAT-KAFFEE-S",
    name: "Kaffeepause klein",
    category: "Catering",
    subcategory: "Pause",
    default_price_net_cents: 850,
    vat_rate: 19,
    cost_default_net_cents: 350,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-KAFFEE-L",
    name: "Kaffeepause groß",
    category: "Catering",
    subcategory: "Pause",
    default_price_net_cents: 1_500,
    vat_rate: 19,
    cost_default_net_cents: 600,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-MITTAG-STD",
    name: "Mittagsbuffet Standard",
    category: "Catering",
    subcategory: "Buffet",
    default_price_net_cents: 4_500,
    vat_rate: 19,
    cost_default_net_cents: 1_800,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-DRINK-PKG",
    name: "Tagungsgetränke-Paket",
    category: "Catering",
    subcategory: "Getränke",
    default_price_net_cents: 1_800,
    vat_rate: 19,
    cost_default_net_cents: 700,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-SEKT",
    name: "Sektempfang",
    category: "Catering",
    subcategory: "Empfang",
    default_price_net_cents: 1_200,
    vat_rate: 19,
    cost_default_net_cents: 500,
    unit: "person",
    dispatch_roles: ["service", "kitchen"],
  },
  {
    sku: "AP-CAT-FINGERFOOD",
    name: "Fingerfood-Auswahl",
    category: "Catering",
    subcategory: "Buffet",
    default_price_net_cents: 2_200,
    vat_rate: 19,
    cost_default_net_cents: 900,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-MENU-3G",
    name: "Abendmenü 3-Gänge",
    category: "Catering",
    subcategory: "Menu",
    default_price_net_cents: 5_800,
    vat_rate: 19,
    cost_default_net_cents: 2_300,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-KUCHEN",
    name: "Kuchenbuffet",
    category: "Catering",
    subcategory: "Pause",
    default_price_net_cents: 1_400,
    vat_rate: 19,
    cost_default_net_cents: 550,
    unit: "person",
    dispatch_roles: ["kitchen", "service"],
  },
  {
    sku: "AP-CAT-SNACKBOX",
    name: "Snackbox to-go",
    category: "Catering",
    subcategory: "Take-Away",
    default_price_net_cents: 1_100,
    vat_rate: 7,
    cost_default_net_cents: 450,
    unit: "person",
    dispatch_roles: ["kitchen", "purchase"],
  },

  // ── Reinigung & Setup ──
  {
    sku: "AP-OPS-REINIGUNG",
    name: "Endreinigung Pauschal",
    category: "Reinigung",
    subcategory: null,
    default_price_net_cents: 18_000,
    vat_rate: 19,
    cost_default_net_cents: 8_000,
    unit: "flat",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-OPS-CHAIR-BANK",
    name: "Bestuhlung Bankett (pro Stuhl)",
    category: "Setup",
    subcategory: "Möbel",
    default_price_net_cents: 250,
    vat_rate: 19,
    cost_default_net_cents: 50,
    unit: "piece",
    dispatch_roles: ["operations", "service"],
  },
  {
    sku: "AP-OPS-CHAIR-REIHE",
    name: "Bestuhlung Reihe (pro Stuhl)",
    category: "Setup",
    subcategory: "Möbel",
    default_price_net_cents: 200,
    vat_rate: 19,
    cost_default_net_cents: 50,
    unit: "piece",
    dispatch_roles: ["operations", "service"],
  },
  {
    sku: "AP-OPS-STEHTISCH",
    name: "Stehtisch",
    category: "Setup",
    subcategory: "Möbel",
    default_price_net_cents: 1_200,
    vat_rate: 19,
    cost_default_net_cents: 200,
    unit: "piece",
    dispatch_roles: ["operations"],
  },
  {
    sku: "AP-OPS-MUELL",
    name: "Müllentsorgung pauschal",
    category: "Reinigung",
    subcategory: null,
    default_price_net_cents: 4_500,
    vat_rate: 19,
    cost_default_net_cents: 1_500,
    unit: "flat",
    dispatch_roles: ["operations", "purchase"],
  },
  {
    sku: "AP-PRINT-MAPPE",
    name: "Tagungsmappe gedruckt",
    category: "Drucksachen",
    subcategory: "Materialien",
    default_price_net_cents: 350,
    vat_rate: 7,
    cost_default_net_cents: 120,
    unit: "piece",
    dispatch_roles: ["purchase", "operations"],
  },
];

// ────────────────────────────────────────────────────────────
// SQL renderer
// ────────────────────────────────────────────────────────────

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBoolean(value: boolean): string {
  return value ? "true" : "false";
}

function sqlNullableInt(value: number | null): string {
  return value === null ? "NULL" : value.toString();
}

function sqlNullableString(value: string | null): string {
  return value === null ? "NULL" : escapeSqlString(value);
}

export function renderCatalogSeedSql(): string {
  const itemRows = CATALOG_SEED_ITEMS.map(
    (item) =>
      `  (${escapeSqlString(item.sku)}, ${escapeSqlString(item.name)}, ${escapeSqlString(item.category)}, ${sqlNullableString(
        item.subcategory,
      )}, ${item.default_price_net_cents}, ${item.vat_rate}, ${sqlNullableInt(
        item.cost_default_net_cents,
      )}, ${escapeSqlString(item.unit)}, true)`,
  ).join(",\n");

  const dispatchRows = CATALOG_SEED_ITEMS.flatMap((item) =>
    item.dispatch_roles.map(
      (role, idx) =>
        `  (${escapeSqlString(item.sku)}, ${escapeSqlString(role)}, ${sqlBoolean(idx === 0)})`,
    ),
  ).join(",\n");

  const skuList = CATALOG_SEED_ITEMS.map((item) => `      ${escapeSqlString(item.sku)}`).join(
    ",\n",
  );

  const lines = [
    "-- M2 Catalog & Mapping seed: idempotent insertion of ~30 Alsterpavillon catalog items.",
    "-- Generated by src/lib/crm/__seed__/catalog-seed.ts via renderCatalogSeedSql();",
    "-- re-runnable: items + dispatch use ON CONFLICT, classifications guarded by status filter.",
    "",
    "do $$",
    "begin",
    "  if to_regclass('public.catalog_items') is null then",
    "    raise exception 'M2 seed precondition failed: public.catalog_items missing';",
    "  end if;",
    "  if to_regclass('public.catalog_dispatch') is null then",
    "    raise exception 'M2 seed precondition failed: public.catalog_dispatch missing';",
    "  end if;",
    "  if to_regclass('public.catalog_classifications') is null then",
    "    raise exception 'M2 seed precondition failed: public.catalog_classifications missing';",
    "  end if;",
    "end $$;",
    "",
    "-- ────────────────────────────────────────────────────────────",
    "-- Step 1: insert items idempotently (existing rows untouched)",
    "-- ────────────────────────────────────────────────────────────",
    "",
    "insert into public.catalog_items",
    "  (sku, name, category, subcategory, default_price_net_cents, vat_rate, cost_default_net_cents, unit, is_active)",
    "values",
    itemRows,
    "on conflict (sku) do nothing;",
    "",
    "-- ────────────────────────────────────────────────────────────",
    "-- Step 2: upsert dispatch mappings (rebases is_primary on every run)",
    "-- ────────────────────────────────────────────────────────────",
    "",
    "insert into public.catalog_dispatch (catalog_item_id, dispatch_role, is_primary)",
    "select ci.id, d.dispatch_role, d.is_primary",
    "from (values",
    dispatchRows,
    ") as d(sku, dispatch_role, is_primary)",
    "join public.catalog_items ci on ci.sku = d.sku",
    "on conflict (catalog_item_id, dispatch_role) do update",
    "  set is_primary = excluded.is_primary;",
    "",
    "-- ────────────────────────────────────────────────────────────",
    "-- Step 3: flip classifications to 'classified' for all seed items",
    "-- (only when not already classified — preserves classified_at on re-run)",
    "-- ────────────────────────────────────────────────────────────",
    "",
    "update public.catalog_classifications cc",
    "set classification_status = 'classified',",
    "    classified_at = now()",
    "where cc.classification_status <> 'classified'",
    "  and cc.catalog_item_id in (",
    "    select id from public.catalog_items where sku in (",
    skuList,
    "    )",
    "  );",
    "",
  ];

  return lines.join("\n");
}
