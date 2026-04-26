import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateSupabaseServerClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => mockedCreateSupabaseServerClient(),
}));

import {
  catalogItemCreateSchema,
  catalogItemPatchSchema,
  classifyCatalogItemRecord,
  createCatalogItemRecord,
  listCatalogItemsRecord,
  updateCatalogItemRecord,
  type CatalogClassification,
  type CatalogDispatch,
  type CatalogItem,
} from "../catalog";

type CatalogClient = Parameters<typeof createCatalogItemRecord>[0];
type DbResult = { data: unknown; error: { message: string } | null };

type QueryBuilder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeQuery(result: DbResult): QueryBuilder {
  const builder = {} as QueryBuilder;
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  Object.defineProperty(builder, "then", {
    value: (onFulfilled: (value: DbResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    writable: true,
    configurable: true,
  });
  return builder;
}

function makeSupabase(opts: {
  chains: QueryBuilder[];
  rpc?: (name: string, args?: unknown) => Promise<DbResult>;
  user?: { id: string } | null;
}) {
  let index = 0;
  const rpc = vi.fn(async (name: string, args?: unknown) => {
    if (opts.rpc) return opts.rpc(name, args);
    return { data: null, error: null };
  });
  const from = vi.fn(() => {
    const chain = opts.chains[index];
    index += 1;
    if (!chain) {
      throw new Error(`Unexpected from() call at index ${index - 1}`);
    }
    return chain;
  });
  const userValue = opts.user === undefined ? { id: "user-1" } : opts.user;
  const getUser = vi.fn(async () => ({
    data: { user: userValue },
    error: null,
  }));
  return {
    client: { from, rpc, auth: { getUser } } as unknown as CatalogClient,
    from,
    rpc,
  };
}

const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "99999999-9999-4999-8999-999999999999";

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: ITEM_ID,
    sku: "CAT-001",
    name: "Tagungspauschale",
    category: "Catering",
    subcategory: null,
    default_price_net_cents: 4500,
    vat_rate: 19,
    cost_default_net_cents: null,
    unit: "person",
    is_active: true,
    created_at: "2026-04-26T10:00:00.000Z",
    updated_at: "2026-04-26T10:00:00.000Z",
    created_by: USER_ID,
    ...overrides,
  };
}

function makeDispatchRow(
  overrides: Partial<CatalogDispatch> & { dispatch_role: CatalogDispatch["dispatch_role"] },
): CatalogDispatch {
  return {
    id: "dispatch-row-id",
    catalog_item_id: ITEM_ID,
    is_primary: false,
    created_at: "2026-04-26T10:00:00.000Z",
    ...overrides,
  };
}

function makeClassification(overrides: Partial<CatalogClassification> = {}): CatalogClassification {
  return {
    catalog_item_id: ITEM_ID,
    classification_status: "classified",
    classified_at: "2026-04-26T10:00:00.000Z",
    classified_by: USER_ID,
    created_at: "2026-04-26T10:00:00.000Z",
    updated_at: "2026-04-26T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedCreateSupabaseServerClient.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────
// Validation: createCatalogItem
// ────────────────────────────────────────────────────────────

describe("catalogItemCreateSchema — validation", () => {
  const validInput = {
    sku: "CAT-001",
    name: "Tagung",
    category: "Catering",
    default_price_net_cents: 4500,
    vat_rate: 19,
    unit: "person" as const,
  };

  function withoutKey(key: keyof typeof validInput): Record<string, unknown> {
    const partial: Record<string, unknown> = { ...validInput };
    delete partial[key];
    return partial;
  }

  it("rejects missing sku", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("sku"))).toThrow();
  });

  it("rejects empty sku", () => {
    expect(() => catalogItemCreateSchema.parse({ ...validInput, sku: "   " })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("name"))).toThrow();
  });

  it("rejects missing category", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("category"))).toThrow();
  });

  it("rejects missing unit", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("unit"))).toThrow();
  });

  it("rejects missing vat_rate", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("vat_rate"))).toThrow();
  });

  it("rejects missing default_price_net_cents", () => {
    expect(() => catalogItemCreateSchema.parse(withoutKey("default_price_net_cents"))).toThrow();
  });

  it("rejects negative default_price_net_cents", () => {
    expect(() =>
      catalogItemCreateSchema.parse({ ...validInput, default_price_net_cents: -1 }),
    ).toThrow();
  });

  it("rejects negative cost_default_net_cents", () => {
    expect(() =>
      catalogItemCreateSchema.parse({ ...validInput, cost_default_net_cents: -1 }),
    ).toThrow();
  });

  it("accepts null cost_default_net_cents", () => {
    const result = catalogItemCreateSchema.parse({
      ...validInput,
      cost_default_net_cents: null,
    });
    expect(result.cost_default_net_cents).toBeNull();
  });

  it("rejects invalid vat_rate (not 7 or 19)", () => {
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 16 })).toThrow();
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 0 })).toThrow();
  });

  it("accepts vat_rate 7 and 19", () => {
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 7 })).not.toThrow();
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 19 })).not.toThrow();
  });

  it("rejects invalid unit", () => {
    expect(() =>
      catalogItemCreateSchema.parse({
        ...validInput,
        unit: "kilogram" as unknown as "piece",
      }),
    ).toThrow();
  });

  it("accepts all four valid units", () => {
    for (const unit of ["piece", "hour", "person", "flat"] as const) {
      expect(() => catalogItemCreateSchema.parse({ ...validInput, unit })).not.toThrow();
    }
  });

  it("accepts non-integer floats only when vat_rate is 7.0 or 19.0", () => {
    // JS number 7 === 7.0; refine check passes for these literal forms.
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 7.0 })).not.toThrow();
    expect(() => catalogItemCreateSchema.parse({ ...validInput, vat_rate: 19.5 })).toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// createCatalogItemRecord — success + audit
// ────────────────────────────────────────────────────────────

describe("createCatalogItemRecord — success", () => {
  it("inserts and writes catalog_item_created audit", async () => {
    const inserted = makeCatalogItem({
      sku: "CAT-001",
      name: "Tagung",
      default_price_net_cents: 4500,
    });
    const insertQuery = makeQuery({ data: inserted, error: null });
    const { client, rpc } = makeSupabase({ chains: [insertQuery] });

    const result = await createCatalogItemRecord(client, USER_ID, {
      sku: "CAT-001",
      name: "Tagung",
      category: "Catering",
      default_price_net_cents: 4500,
      vat_rate: 19,
      unit: "person",
    });

    expect(result).toEqual(inserted);
    expect(insertQuery.insert).toHaveBeenCalledWith({
      sku: "CAT-001",
      name: "Tagung",
      category: "Catering",
      subcategory: null,
      default_price_net_cents: 4500,
      vat_rate: 19,
      cost_default_net_cents: null,
      unit: "person",
      is_active: true,
      created_by: USER_ID,
    });

    const auditCalls = rpc.mock.calls.filter(([n]) => n === "log_audit");
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toEqual({
      p_entity_type: "catalog_item",
      p_entity_id: inserted.id,
      p_action: "catalog_item_created",
      p_before: null,
      p_after: inserted,
    });
  });

  it("respects is_active=false when explicitly set", async () => {
    const inserted = makeCatalogItem({ is_active: false });
    const insertQuery = makeQuery({ data: inserted, error: null });
    const { client } = makeSupabase({ chains: [insertQuery] });

    await createCatalogItemRecord(client, USER_ID, {
      sku: "CAT-002",
      name: "Inaktiv",
      category: "Catering",
      default_price_net_cents: 0,
      vat_rate: 7,
      unit: "flat",
      is_active: false,
    });

    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });

  it("does not write audit if insert fails", async () => {
    const failQuery = makeQuery({ data: null, error: { message: "boom" } });
    const { client, rpc } = makeSupabase({ chains: [failQuery] });

    await expect(
      createCatalogItemRecord(client, USER_ID, {
        sku: "CAT-003",
        name: "X",
        category: "Y",
        default_price_net_cents: 100,
        vat_rate: 19,
        unit: "piece",
      }),
    ).rejects.toThrow(/boom/);
    expect(rpc.mock.calls.filter(([n]) => n === "log_audit")).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────
// updateCatalogItemRecord — whitelist + audit
// ────────────────────────────────────────────────────────────

describe("updateCatalogItemRecord — whitelist", () => {
  it("strips unknown fields at parse time and never forwards them to DB", async () => {
    const before = makeCatalogItem({ name: "Old" });
    const after = makeCatalogItem({ name: "New" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const updateQuery = makeQuery({ data: after, error: null });
    const { client } = makeSupabase({ chains: [beforeQuery, updateQuery] });

    // Unknown keys at runtime — typed via `unknown`-cast to bypass static
    // excess-property checks; tests verify they never reach the DB.
    const maliciousPatch: Record<string, unknown> = {
      name: "New",
      malicious_field: "evil",
      id: "not-allowed",
      created_by: "spoofed",
      created_at: "spoofed",
      updated_at: "spoofed",
    };
    await updateCatalogItemRecord(
      client,
      ITEM_ID,
      maliciousPatch as unknown as Parameters<typeof updateCatalogItemRecord>[2],
    );

    const updateCallArg = updateQuery.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateCallArg).toEqual({ name: "New" });
    expect(updateCallArg).not.toHaveProperty("malicious_field");
    expect(updateCallArg).not.toHaveProperty("id");
    expect(updateCallArg).not.toHaveProperty("created_by");
    expect(updateCallArg).not.toHaveProperty("created_at");
    expect(updateCallArg).not.toHaveProperty("updated_at");
  });

  it("throws when no patchable fields are provided", async () => {
    const before = makeCatalogItem();
    const beforeQuery = makeQuery({ data: before, error: null });
    const { client } = makeSupabase({ chains: [beforeQuery] });

    await expect(updateCatalogItemRecord(client, ITEM_ID, {})).rejects.toThrow(
      /No patchable fields provided/,
    );
  });

  it("schema rejects negative default_price on patch", () => {
    expect(() => catalogItemPatchSchema.parse({ default_price_net_cents: -100 })).toThrow();
  });

  it("schema rejects invalid vat_rate on patch", () => {
    expect(() => catalogItemPatchSchema.parse({ vat_rate: 16 })).toThrow();
  });

  it("writes catalog_item_updated audit with before/after", async () => {
    const before = makeCatalogItem({ name: "Old" });
    const after = makeCatalogItem({ name: "New" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const updateQuery = makeQuery({ data: after, error: null });
    const { client, rpc } = makeSupabase({ chains: [beforeQuery, updateQuery] });

    const result = await updateCatalogItemRecord(client, ITEM_ID, { name: "New" });

    expect(result.name).toBe("New");
    const auditCalls = rpc.mock.calls.filter(([n]) => n === "log_audit");
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toMatchObject({
      p_entity_type: "catalog_item",
      p_entity_id: ITEM_ID,
      p_action: "catalog_item_updated",
      p_before: before,
      p_after: after,
    });
  });

  it("throws when item not found", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });

    await expect(updateCatalogItemRecord(client, ITEM_ID, { name: "X" })).rejects.toThrow(
      /Catalog item not found/,
    );
  });
});

// ────────────────────────────────────────────────────────────
// classifyCatalogItemRecord — validation
// ────────────────────────────────────────────────────────────

describe("classifyCatalogItemRecord — validation", () => {
  it("rejects empty roles array", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, [])).rejects.toThrow(
      /at least one dispatch role/,
    );
  });

  it("rejects invalid role", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(
      classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["marketing" as unknown as "kitchen"]),
    ).rejects.toThrow();
  });

  it("rejects when item does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"])).rejects.toThrow(
      /Catalog item not found/,
    );
  });
});

// ────────────────────────────────────────────────────────────
// classifyCatalogItemRecord — success
// ────────────────────────────────────────────────────────────

describe("classifyCatalogItemRecord — success", () => {
  it("flags exactly the first role as is_primary, others false", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertedDispatch = [
      makeDispatchRow({ dispatch_role: "kitchen", is_primary: true }),
      makeDispatchRow({ dispatch_role: "service", is_primary: false }),
      makeDispatchRow({ dispatch_role: "operations", is_primary: false }),
    ];
    const insertQuery = makeQuery({ data: insertedDispatch, error: null });
    const upsertedClassification = makeClassification();
    const upsertQuery = makeQuery({ data: upsertedClassification, error: null });

    const { client } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
    });

    const result = await classifyCatalogItemRecord(client, USER_ID, ITEM_ID, [
      "kitchen",
      "service",
      "operations",
    ]);

    const insertPayload = insertQuery.insert.mock.calls[0]?.[0] as ReadonlyArray<{
      dispatch_role: string;
      is_primary: boolean;
    }>;
    expect(insertPayload).toEqual([
      { catalog_item_id: ITEM_ID, dispatch_role: "kitchen", is_primary: true },
      { catalog_item_id: ITEM_ID, dispatch_role: "service", is_primary: false },
      { catalog_item_id: ITEM_ID, dispatch_role: "operations", is_primary: false },
    ]);
    const primaryCount = insertPayload.filter((r) => r.is_primary).length;
    expect(primaryCount).toBe(1);
    expect(result.dispatch).toEqual(insertedDispatch);
    expect(result.classification.classification_status).toBe("classified");
  });

  it("replaces existing dispatch rows (delete is invoked before insert)", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertedDispatch = [makeDispatchRow({ dispatch_role: "tech", is_primary: true })];
    const insertQuery = makeQuery({ data: insertedDispatch, error: null });
    const upsertQuery = makeQuery({ data: makeClassification(), error: null });

    const { client } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
    });

    await classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["tech"]);

    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.eq).toHaveBeenCalledWith("catalog_item_id", ITEM_ID);
    expect(insertQuery.insert).toHaveBeenCalledTimes(1);
  });

  it("upserts classification with status='classified', classified_at, classified_by", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertQuery = makeQuery({
      data: [makeDispatchRow({ dispatch_role: "kitchen", is_primary: true })],
      error: null,
    });
    const upsertedClassification = makeClassification();
    const upsertQuery = makeQuery({ data: upsertedClassification, error: null });

    const { client } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
    });

    await classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"]);

    const upsertCall = upsertQuery.upsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(upsertCall).toMatchObject({
      catalog_item_id: ITEM_ID,
      classification_status: "classified",
      classified_by: USER_ID,
    });
    expect(upsertCall.classified_at).toBeTruthy();
    expect(upsertQuery.upsert.mock.calls[0]?.[1]).toEqual({
      onConflict: "catalog_item_id",
    });
  });

  it("writes catalog_item_classified audit with dispatch + classification payload", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertedDispatch = [makeDispatchRow({ dispatch_role: "kitchen", is_primary: true })];
    const insertQuery = makeQuery({ data: insertedDispatch, error: null });
    const upsertedClassification = makeClassification();
    const upsertQuery = makeQuery({ data: upsertedClassification, error: null });

    const { client, rpc } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
    });

    await classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"]);

    const auditCalls = rpc.mock.calls.filter(([n]) => n === "log_audit");
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toMatchObject({
      p_entity_type: "catalog_item",
      p_entity_id: ITEM_ID,
      p_action: "catalog_item_classified",
      p_before: null,
      p_after: {
        dispatch: insertedDispatch,
        classification: upsertedClassification,
      },
    });
  });

  it("de-dupes accidentally repeated roles", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertQuery = makeQuery({
      data: [
        makeDispatchRow({ dispatch_role: "kitchen", is_primary: true }),
        makeDispatchRow({ dispatch_role: "service", is_primary: false }),
      ],
      error: null,
    });
    const upsertQuery = makeQuery({ data: makeClassification(), error: null });

    const { client } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
    });

    await classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen", "service", "kitchen"]);

    const insertPayload = insertQuery.insert.mock.calls[0]?.[0] as ReadonlyArray<{
      dispatch_role: string;
    }>;
    expect(insertPayload).toHaveLength(2);
    expect(insertPayload.map((r) => r.dispatch_role)).toEqual(["kitchen", "service"]);
  });
});

// ────────────────────────────────────────────────────────────
// classifyCatalogItemRecord — fail-closed steps
// ────────────────────────────────────────────────────────────

describe("classifyCatalogItemRecord — fail-closed", () => {
  it("throws and skips audit when delete (step 1) fails", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: { message: "delete-fail" } });
    const { client, rpc } = makeSupabase({ chains: [itemQuery, deleteQuery] });

    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"])).rejects.toThrow(
      /delete-fail/,
    );
    expect(rpc.mock.calls.filter(([n]) => n === "log_audit")).toHaveLength(0);
  });

  it("throws and skips upsert + audit when insert (step 2) fails", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertFail = makeQuery({ data: null, error: { message: "insert-fail" } });
    const { client, rpc } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertFail],
    });

    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"])).rejects.toThrow(
      /insert-fail/,
    );
    expect(rpc.mock.calls.filter(([n]) => n === "log_audit")).toHaveLength(0);
  });

  it("throws and skips audit when classification upsert (step 3) fails", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertQuery = makeQuery({
      data: [makeDispatchRow({ dispatch_role: "kitchen", is_primary: true })],
      error: null,
    });
    const upsertFail = makeQuery({
      data: null,
      error: { message: "classification-fail" },
    });
    const { client, rpc } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertFail],
    });

    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"])).rejects.toThrow(
      /classification-fail/,
    );
    expect(rpc.mock.calls.filter(([n]) => n === "log_audit")).toHaveLength(0);
  });

  it("throws if audit RPC fails (no silent success)", async () => {
    const item = makeCatalogItem();
    const itemQuery = makeQuery({ data: item, error: null });
    const deleteQuery = makeQuery({ data: null, error: null });
    const insertQuery = makeQuery({
      data: [makeDispatchRow({ dispatch_role: "kitchen", is_primary: true })],
      error: null,
    });
    const upsertQuery = makeQuery({ data: makeClassification(), error: null });
    const { client } = makeSupabase({
      chains: [itemQuery, deleteQuery, insertQuery, upsertQuery],
      rpc: async (name) => {
        if (name === "log_audit") return { data: null, error: { message: "audit-fail" } };
        return { data: null, error: null };
      },
    });

    await expect(classifyCatalogItemRecord(client, USER_ID, ITEM_ID, ["kitchen"])).rejects.toThrow(
      /audit-fail/,
    );
  });
});

// ────────────────────────────────────────────────────────────
// listCatalogItemsRecord
// ────────────────────────────────────────────────────────────

describe("listCatalogItemsRecord", () => {
  it("filters is_active=true and orders by name ascending", async () => {
    const items = [makeCatalogItem({ name: "Alpha" }), makeCatalogItem({ name: "Beta" })];
    const listQuery = makeQuery({ data: items, error: null });
    const { client } = makeSupabase({ chains: [listQuery] });

    const result = await listCatalogItemsRecord(client);

    expect(result).toEqual(items);
    expect(listQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(listQuery.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns [] on empty", async () => {
    const listQuery = makeQuery({ data: null, error: null });
    const { client } = makeSupabase({ chains: [listQuery] });
    const result = await listCatalogItemsRecord(client);
    expect(result).toEqual([]);
  });

  it("throws on db error", async () => {
    const listQuery = makeQuery({ data: null, error: { message: "list-fail" } });
    const { client } = makeSupabase({ chains: [listQuery] });
    await expect(listCatalogItemsRecord(client)).rejects.toThrow(/list-fail/);
  });
});
