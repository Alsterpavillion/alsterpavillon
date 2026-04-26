import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG_UNITS, DISPATCH_ROLES, VAT_RATES } from "../catalog";
import { CATALOG_SEED_ITEMS, renderCatalogSeedSql } from "../__seed__/catalog-seed";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/0007_catalog_seed.sql");

describe("CATALOG_SEED_ITEMS — count & uniqueness", () => {
  it("contains approximately 30 items (between 25 and 40)", () => {
    expect(CATALOG_SEED_ITEMS.length).toBeGreaterThanOrEqual(25);
    expect(CATALOG_SEED_ITEMS.length).toBeLessThanOrEqual(40);
  });

  it("all SKUs are unique", () => {
    const skus = CATALOG_SEED_ITEMS.map((i) => i.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("all SKUs are non-empty trimmed strings", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      expect(item.sku.trim().length).toBeGreaterThan(0);
    }
  });

  it("all names are non-empty trimmed strings", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      expect(item.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("all categories are non-empty trimmed strings", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      expect(item.category.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("CATALOG_SEED_ITEMS — schema-shape invariants", () => {
  it("every item has unit from valid set", () => {
    const valid = new Set<string>(CATALOG_UNITS);
    for (const item of CATALOG_SEED_ITEMS) {
      expect(valid.has(item.unit), `${item.sku}: invalid unit "${item.unit}"`).toBe(true);
    }
  });

  it("every item has VAT in {7, 19}", () => {
    const valid = new Set<number>(VAT_RATES);
    for (const item of CATALOG_SEED_ITEMS) {
      expect(valid.has(item.vat_rate), `${item.sku}: vat_rate=${item.vat_rate}`).toBe(true);
    }
  });

  it("every item has integer default_price_net_cents >= 0", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      expect(
        Number.isInteger(item.default_price_net_cents),
        `${item.sku}: price must be integer`,
      ).toBe(true);
      expect(item.default_price_net_cents).toBeGreaterThanOrEqual(0);
    }
  });

  it("every item has integer cost_default_net_cents >= 0 if not null", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      if (item.cost_default_net_cents !== null) {
        expect(
          Number.isInteger(item.cost_default_net_cents),
          `${item.sku}: cost must be integer`,
        ).toBe(true);
        expect(item.cost_default_net_cents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("CATALOG_SEED_ITEMS — dispatch & primary invariants", () => {
  it("every item has at least 1 dispatch role", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      expect(
        item.dispatch_roles.length,
        `${item.sku}: dispatch_roles must be non-empty`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every item has only valid dispatch roles", () => {
    const valid = new Set<string>(DISPATCH_ROLES);
    for (const item of CATALOG_SEED_ITEMS) {
      for (const role of item.dispatch_roles) {
        expect(valid.has(role), `${item.sku}: invalid role "${role}"`).toBe(true);
      }
    }
  });

  it("every item has unique dispatch roles (no duplicates within an item)", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      const set = new Set(item.dispatch_roles);
      expect(set.size, `${item.sku}: dispatch_roles has duplicates`).toBe(
        item.dispatch_roles.length,
      );
    }
  });

  it("every item has exactly one primary role (dispatch_roles[0] convention)", () => {
    for (const item of CATALOG_SEED_ITEMS) {
      const primary = item.dispatch_roles[0];
      expect(primary, `${item.sku}: must have a primary role at index 0`).toBeDefined();
    }
  });
});

describe("renderCatalogSeedSql — migration sync", () => {
  it("rendered SQL matches the committed migration file byte-for-byte", () => {
    const committed = readFileSync(MIGRATION_PATH, "utf-8");
    const rendered = renderCatalogSeedSql();
    if (committed !== rendered) {
      throw new Error(
        `0007_catalog_seed.sql is out of sync with catalog-seed.ts. ` +
          `Run: pnpm tsx scripts/render-catalog-seed.ts`,
      );
    }
    expect(committed).toBe(rendered);
  });

  it("rendered SQL contains no destructive operations", () => {
    const sql = renderCatalogSeedSql();
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
  });

  it("uses on conflict do nothing for catalog_items idempotency", () => {
    const sql = renderCatalogSeedSql();
    expect(sql).toMatch(/insert into public\.catalog_items[\s\S]+?on conflict \(sku\) do nothing/);
  });

  it("uses on conflict do update for catalog_dispatch idempotency", () => {
    const sql = renderCatalogSeedSql();
    expect(sql).toMatch(
      /insert into public\.catalog_dispatch[\s\S]+?on conflict \(catalog_item_id, dispatch_role\) do update[\s\S]+?set is_primary = excluded\.is_primary/,
    );
  });

  it("classifications update is guarded by status filter", () => {
    const sql = renderCatalogSeedSql();
    expect(sql).toMatch(
      /update public\.catalog_classifications[\s\S]+?where cc\.classification_status <> 'classified'/,
    );
  });

  it("rendered SQL contains exactly CATALOG_SEED_ITEMS.length item rows", () => {
    const sql = renderCatalogSeedSql();
    const itemSection =
      sql.match(/insert into public\.catalog_items[\s\S]+?on conflict/)?.[0] ?? "";
    const valueRowCount = itemSection.split("\n").filter((line) => /^ {2}\('/.test(line)).length;
    expect(valueRowCount).toBe(CATALOG_SEED_ITEMS.length);
  });

  it("rendered SQL contains a dispatch row for every (item, role) pair", () => {
    const sql = renderCatalogSeedSql();
    const expected = CATALOG_SEED_ITEMS.reduce((sum, item) => sum + item.dispatch_roles.length, 0);
    const dispatchSection =
      sql.match(
        /insert into public\.catalog_dispatch[\s\S]+?on conflict \(catalog_item_id, dispatch_role\)/,
      )?.[0] ?? "";
    const dispatchRowCount = dispatchSection
      .split("\n")
      .filter((line) => /^ {2}\('/.test(line)).length;
    expect(dispatchRowCount).toBe(expected);
  });

  it("rendered SQL exposes exactly one is_primary=true per item", () => {
    const sql = renderCatalogSeedSql();
    for (const item of CATALOG_SEED_ITEMS) {
      const sku = item.sku;
      const escaped = sku.replace(/-/g, "\\-");
      const matches = sql.match(new RegExp(`\\(\\s*'${escaped}',\\s*'[a-z]+',\\s*true\\)`, "g"));
      expect(matches?.length ?? 0, `${sku}: must have exactly one is_primary=true`).toBe(1);
    }
  });
});
