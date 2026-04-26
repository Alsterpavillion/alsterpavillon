"use server";

import { redirect } from "next/navigation";
import {
  classifyCatalogItem,
  createCatalogItem,
  DISPATCH_ROLES,
  updateCatalogItem,
  type CatalogItemCreateInput,
  type CatalogItemPatchInput,
  type CatalogUnit,
  type DispatchRole,
} from "@/lib/crm/catalog";

function strField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function emptyToUndefined(formData: FormData, key: string): string | undefined {
  const raw = strField(formData, key).trim();
  return raw === "" ? undefined : raw;
}

function intField(formData: FormData, key: string): number {
  const raw = strField(formData, key).trim();
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`${key} must be an integer`);
  }
  return n;
}

function intFieldOptional(formData: FormData, key: string): number | null {
  const raw = strField(formData, key).trim();
  if (raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`${key} must be an integer`);
  }
  return n;
}

export async function createCatalogItemForm(formData: FormData) {
  const input: CatalogItemCreateInput = {
    sku: strField(formData, "sku"),
    name: strField(formData, "name"),
    category: strField(formData, "category"),
    subcategory: emptyToUndefined(formData, "subcategory"),
    default_price_net_cents: intField(formData, "default_price_net_cents"),
    vat_rate: intField(formData, "vat_rate"),
    cost_default_net_cents: intFieldOptional(formData, "cost_default_net_cents"),
    unit: strField(formData, "unit") as CatalogUnit,
  };
  await createCatalogItem(input);
  redirect("/app/catalog");
}

export async function updateCatalogItemForm(id: string, formData: FormData) {
  const patch: CatalogItemPatchInput = {
    sku: strField(formData, "sku"),
    name: strField(formData, "name"),
    category: strField(formData, "category"),
    subcategory: emptyToUndefined(formData, "subcategory"),
    default_price_net_cents: intField(formData, "default_price_net_cents"),
    vat_rate: intField(formData, "vat_rate"),
    cost_default_net_cents: intFieldOptional(formData, "cost_default_net_cents"),
    unit: strField(formData, "unit") as CatalogUnit,
  };
  await updateCatalogItem(id, patch);
  redirect(`/app/catalog/${id}`);
}

export async function classifyCatalogItemForm(id: string, formData: FormData) {
  const checkedRoles = DISPATCH_ROLES.filter(
    (role) => formData.get(`role_${role}`) === "on",
  ) as DispatchRole[];

  if (checkedRoles.length === 0) {
    throw new Error("Mindestens eine Dispatch-Rolle wählen.");
  }

  const primaryRaw = strField(formData, "primary_role");
  const primary = checkedRoles.find((role) => role === primaryRaw);

  // First entry is the primary role; if no explicit primary chosen
  // OR the chosen primary is not in the checked set, fall back to first checked.
  const ordered: DispatchRole[] = primary
    ? [primary, ...checkedRoles.filter((role) => role !== primary)]
    : checkedRoles;

  await classifyCatalogItem(id, ordered);
  redirect(`/app/catalog/${id}`);
}
