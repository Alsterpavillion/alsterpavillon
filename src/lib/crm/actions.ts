import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CrmSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type Company = {
  id: string;
  name: string;
  vat_id: string | null;
  billing_address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_private_customer: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );

const companySchema = z.object({
  name: z.string().trim().min(1).max(200),
  vat_id: optionalText(100),
  billing_address: optionalText(2000),
  notes: optionalText(5000),
});

const contactSchema = z.object({
  company_id: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().uuid().nullable(),
  ),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().email().max(320).nullable(),
  ),
  phone: optionalText(80),
  is_private_customer: z.boolean(),
  notes: optionalText(5000),
});

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseCompanyFormData(formData: FormData) {
  return companySchema.parse({
    name: formValue(formData, "name"),
    vat_id: formValue(formData, "vat_id"),
    billing_address: formValue(formData, "billing_address"),
    notes: formValue(formData, "notes"),
  });
}

export function parseContactFormData(formData: FormData) {
  return contactSchema.parse({
    company_id: formValue(formData, "company_id"),
    first_name: formValue(formData, "first_name"),
    last_name: formValue(formData, "last_name"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    is_private_customer: formData.get("is_private_customer") === "on",
    notes: formValue(formData, "notes"),
  });
}

async function requireUserId(supabase: CrmSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user.id;
}

async function writeAudit(
  supabase: CrmSupabaseClient,
  entityType: "company" | "contact",
  entityId: string,
  action: "create" | "update" | "delete",
  before: Company | Contact | null,
  after: Company | Contact | null,
) {
  const { error } = await supabase.rpc("log_audit", {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_before: before,
    p_after: after,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createCompanyRecord(
  supabase: CrmSupabaseClient,
  actorUserId: string,
  input: CompanyInput,
) {
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...input, created_by: actorUserId })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Company creation failed.");
  }

  await writeAudit(supabase, "company", data.id, "create", null, data);
  return data;
}

export async function updateCompanyRecord(
  supabase: CrmSupabaseClient,
  id: string,
  input: CompanyInput,
) {
  const { data: before, error: beforeError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) {
    throw new Error(beforeError.message);
  }
  if (!before) {
    throw new Error("Company not found.");
  }

  const { data: after, error } = await supabase
    .from("companies")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!after) {
    throw new Error("Company update failed.");
  }

  await writeAudit(supabase, "company", id, "update", before, after);
  return after;
}

export async function deleteCompanyRecord(supabase: CrmSupabaseClient, id: string) {
  const { data: before, error: beforeError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) {
    throw new Error(beforeError.message);
  }
  if (!before) {
    throw new Error("Company not found.");
  }

  const { error } = await supabase.from("companies").delete().eq("id", id).select("id").single();
  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(supabase, "company", id, "delete", before, null);
}

export async function createContactRecord(
  supabase: CrmSupabaseClient,
  actorUserId: string,
  input: ContactInput,
) {
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...input, created_by: actorUserId })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Contact creation failed.");
  }

  await writeAudit(supabase, "contact", data.id, "create", null, data);
  return data;
}

export async function updateContactRecord(
  supabase: CrmSupabaseClient,
  id: string,
  input: ContactInput,
) {
  const { data: before, error: beforeError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) {
    throw new Error(beforeError.message);
  }
  if (!before) {
    throw new Error("Contact not found.");
  }

  const { data: after, error } = await supabase
    .from("contacts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!after) {
    throw new Error("Contact update failed.");
  }

  await writeAudit(supabase, "contact", id, "update", before, after);
  return after;
}

export async function deleteContactRecord(supabase: CrmSupabaseClient, id: string) {
  const { data: before, error: beforeError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) {
    throw new Error(beforeError.message);
  }
  if (!before) {
    throw new Error("Contact not found.");
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id).select("id").single();
  if (error) {
    throw new Error(error.message);
  }

  await writeAudit(supabase, "contact", id, "delete", before, null);
}

export async function createCompany(formData: FormData) {
  "use server";

  const input = parseCompanyFormData(formData);
  const supabase = await createSupabaseServerClient();
  const actorUserId = await requireUserId(supabase);
  const company = await createCompanyRecord(supabase, actorUserId, input);

  revalidatePath("/app/companies");
  redirect(`/app/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  "use server";

  const input = parseCompanyFormData(formData);
  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  const company = await updateCompanyRecord(supabase, id, input);

  revalidatePath("/app/companies");
  revalidatePath(`/app/companies/${company.id}`);
  redirect(`/app/companies/${company.id}`);
}

export async function deleteCompany(id: string) {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  await deleteCompanyRecord(supabase, id);

  revalidatePath("/app/companies");
  redirect("/app/companies");
}

export async function createContact(formData: FormData) {
  "use server";

  const input = parseContactFormData(formData);
  const supabase = await createSupabaseServerClient();
  const actorUserId = await requireUserId(supabase);
  const contact = await createContactRecord(supabase, actorUserId, input);

  revalidatePath("/app/contacts");
  redirect(`/app/contacts/${contact.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  "use server";

  const input = parseContactFormData(formData);
  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  const contact = await updateContactRecord(supabase, id, input);

  revalidatePath("/app/contacts");
  revalidatePath(`/app/contacts/${contact.id}`);
  redirect(`/app/contacts/${contact.id}`);
}

export async function deleteContact(id: string) {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  await deleteContactRecord(supabase, id);

  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}
