import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CrmSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const VAT_RATES = [7, 19] as const;
export const CATALOG_UNITS = ["piece", "hour", "person", "flat"] as const;
export const DISPATCH_ROLES = ["kitchen", "service", "purchase", "tech", "operations"] as const;
export const CLASSIFICATION_STATUSES = ["pending", "classified"] as const;

export type VatRate = (typeof VAT_RATES)[number];
export type CatalogUnit = (typeof CATALOG_UNITS)[number];
export type DispatchRole = (typeof DISPATCH_ROLES)[number];
export type ClassificationStatus = (typeof CLASSIFICATION_STATUSES)[number];

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  default_price_net_cents: number;
  vat_rate: number;
  cost_default_net_cents: number | null;
  unit: CatalogUnit;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type CatalogDispatch = {
  id: string;
  catalog_item_id: string;
  dispatch_role: DispatchRole;
  is_primary: boolean;
  created_at: string;
};

export type CatalogClassification = {
  catalog_item_id: string;
  classification_status: ClassificationStatus;
  classified_at: string | null;
  classified_by: string | null;
  created_at: string;
  updated_at: string;
};

const optionalText = (max: number) =>
  z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(max).nullable(),
    )
    .optional();

export const catalogItemCreateSchema = z.object({
  sku: z.string().trim().min(1, "sku is required").max(100),
  name: z.string().trim().min(1, "name is required").max(200),
  category: z.string().trim().min(1, "category is required").max(100),
  subcategory: optionalText(100),
  default_price_net_cents: z
    .number()
    .int("default_price_net_cents must be an integer")
    .nonnegative("default_price_net_cents must be >= 0"),
  vat_rate: z
    .number()
    .refine((v) => (VAT_RATES as readonly number[]).includes(v), "vat_rate must be 7 or 19"),
  cost_default_net_cents: z
    .union([
      z
        .number()
        .int("cost_default_net_cents must be an integer")
        .nonnegative("cost_default_net_cents must be >= 0"),
      z.null(),
    ])
    .optional(),
  unit: z.enum(CATALOG_UNITS),
  is_active: z.boolean().optional(),
});
export type CatalogItemCreateInput = z.input<typeof catalogItemCreateSchema>;

export const catalogItemPatchSchema = catalogItemCreateSchema.partial();
export type CatalogItemPatchInput = z.input<typeof catalogItemPatchSchema>;

export const dispatchRolesInputSchema = z
  .array(z.enum(DISPATCH_ROLES), {
    message: "dispatchRoles must be an array of dispatch roles",
  })
  .min(1, "at least one dispatch role is required")
  .transform((arr) => Array.from(new Set(arr)));

const PATCHABLE_FIELDS = [
  "sku",
  "name",
  "category",
  "subcategory",
  "default_price_net_cents",
  "vat_rate",
  "cost_default_net_cents",
  "unit",
  "is_active",
] as const;

async function requireUserId(supabase: CrmSupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication required.");
  }
  return user.id;
}

async function writeCatalogAudit(
  supabase: CrmSupabaseClient,
  itemId: string,
  action: "catalog_item_created" | "catalog_item_updated" | "catalog_item_classified",
  before: unknown,
  after: unknown,
): Promise<void> {
  const { error } = await supabase.rpc("log_audit", {
    p_entity_type: "catalog_item",
    p_entity_id: itemId,
    p_action: action,
    p_before: before,
    p_after: after,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function createCatalogItemRecord(
  supabase: CrmSupabaseClient,
  actorUserId: string,
  rawInput: CatalogItemCreateInput,
): Promise<CatalogItem> {
  const input = catalogItemCreateSchema.parse(rawInput);

  const insertPayload = {
    sku: input.sku,
    name: input.name,
    category: input.category,
    subcategory: input.subcategory ?? null,
    default_price_net_cents: input.default_price_net_cents,
    vat_rate: input.vat_rate,
    cost_default_net_cents: input.cost_default_net_cents ?? null,
    unit: input.unit,
    is_active: input.is_active ?? true,
    created_by: actorUserId,
  };

  const { data, error } = await supabase
    .from("catalog_items")
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Catalog item creation failed.");
  }

  const created = data as CatalogItem;
  await writeCatalogAudit(supabase, created.id, "catalog_item_created", null, created);
  return created;
}

export async function updateCatalogItemRecord(
  supabase: CrmSupabaseClient,
  id: string,
  rawPatch: CatalogItemPatchInput,
): Promise<CatalogItem> {
  const patch = catalogItemPatchSchema.parse(rawPatch);

  const { data: beforeData, error: beforeError } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();
  if (beforeError || !beforeData) {
    throw new Error("Catalog item not found.");
  }
  const before = beforeData as CatalogItem;

  // Whitelist enforcement: only fields in PATCHABLE_FIELDS are forwarded to the DB.
  // Defense-in-depth on top of Zod's default strip behavior for unknown keys.
  const updatePayload: Record<string, unknown> = {};
  for (const key of PATCHABLE_FIELDS) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new Error("No patchable fields provided.");
  }

  const { data: afterData, error } = await supabase
    .from("catalog_items")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  if (!afterData) {
    throw new Error("Catalog item update failed.");
  }
  const after = afterData as CatalogItem;

  await writeCatalogAudit(supabase, id, "catalog_item_updated", before, after);
  return after;
}

export type ClassifyCatalogResult = {
  item: CatalogItem;
  dispatch: CatalogDispatch[];
  classification: CatalogClassification;
};

/**
 * Replace dispatch rows for an item and flip classification to 'classified'.
 * Three sequential DB steps (delete old, insert new, upsert classification);
 * any failure throws (fail-closed). Atomicity gap is documented as M2 risk —
 * an atomic SECURITY DEFINER RPC is the planned hardening for M2-followup.
 */
export async function classifyCatalogItemRecord(
  supabase: CrmSupabaseClient,
  actorUserId: string,
  id: string,
  rawRoles: DispatchRole[],
): Promise<ClassifyCatalogResult> {
  const roles = dispatchRolesInputSchema.parse(rawRoles);

  // Verify the item exists before mutating dispatch state.
  const { data: itemData, error: itemError } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .single();
  if (itemError || !itemData) {
    throw new Error("Catalog item not found.");
  }
  const item = itemData as CatalogItem;

  // Step 1: delete existing dispatch rows for this item.
  const { error: deleteError } = await supabase
    .from("catalog_dispatch")
    .delete()
    .eq("catalog_item_id", id);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // Step 2: insert new dispatch rows. First role becomes the primary one.
  const dispatchPayload = roles.map((role, idx) => ({
    catalog_item_id: id,
    dispatch_role: role,
    is_primary: idx === 0,
  }));
  const { data: dispatchData, error: dispatchError } = await supabase
    .from("catalog_dispatch")
    .insert(dispatchPayload)
    .select("*");
  if (dispatchError) {
    throw new Error(dispatchError.message);
  }
  if (!dispatchData) {
    throw new Error("Catalog dispatch insert returned no rows.");
  }

  // Step 3: upsert classification to 'classified' (auto-trigger may have created
  // a 'pending' row at item-insert time; we update it here).
  const { data: classificationData, error: classificationError } = await supabase
    .from("catalog_classifications")
    .upsert(
      {
        catalog_item_id: id,
        classification_status: "classified",
        classified_at: new Date().toISOString(),
        classified_by: actorUserId,
      },
      { onConflict: "catalog_item_id" },
    )
    .select("*")
    .single();
  if (classificationError) {
    throw new Error(classificationError.message);
  }
  if (!classificationData) {
    throw new Error("Catalog classification upsert returned no row.");
  }

  const dispatch = dispatchData as CatalogDispatch[];
  const classification = classificationData as CatalogClassification;

  await writeCatalogAudit(supabase, id, "catalog_item_classified", null, {
    dispatch,
    classification,
  });

  return { item, dispatch, classification };
}

export async function listCatalogItemsRecord(supabase: CrmSupabaseClient): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as CatalogItem[];
}

// ────────────────────────────────────────────────────────────
// Server Actions
// ────────────────────────────────────────────────────────────

export async function createCatalogItem(input: CatalogItemCreateInput): Promise<CatalogItem> {
  "use server";

  const supabase = await createSupabaseServerClient();
  const actorUserId = await requireUserId(supabase);
  return createCatalogItemRecord(supabase, actorUserId, input);
}

export async function updateCatalogItem(
  id: string,
  patch: CatalogItemPatchInput,
): Promise<CatalogItem> {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  return updateCatalogItemRecord(supabase, id, patch);
}

export async function classifyCatalogItem(
  id: string,
  dispatchRoles: DispatchRole[],
): Promise<ClassifyCatalogResult> {
  "use server";

  const supabase = await createSupabaseServerClient();
  const actorUserId = await requireUserId(supabase);
  return classifyCatalogItemRecord(supabase, actorUserId, id, dispatchRoles);
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  return listCatalogItemsRecord(supabase);
}
