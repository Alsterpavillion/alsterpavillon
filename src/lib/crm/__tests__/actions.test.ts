import { describe, expect, it, vi } from "vitest";
import {
  createCompanyRecord,
  createContactRecord,
  deleteCompanyRecord,
  deleteContactRecord,
  parseCompanyFormData,
  parseContactFormData,
  updateCompanyRecord,
  updateContactRecord,
  type Company,
  type Contact,
} from "../actions";

type CompanyClient = Parameters<typeof createCompanyRecord>[0];
type ContactClient = Parameters<typeof createContactRecord>[0];
type DbResult = { data: unknown; error: { message: string } | null };

type QueryBuilder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeForm(values: Record<string, string | boolean>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) formData.set(key, "on");
    } else {
      formData.set(key, value);
    }
  }

  return formData;
}

function makeQuery(result: DbResult) {
  const builder = {} as QueryBuilder;
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  return builder;
}

function makeSupabase(chains: QueryBuilder[]) {
  let index = 0;
  const rpc = vi.fn(async () => ({ data: 1, error: null }));
  const from = vi.fn(() => {
    const chain = chains[index];
    index += 1;
    if (!chain) throw new Error("Unexpected table query.");
    return chain;
  });

  return {
    client: { from, rpc } as unknown as CompanyClient & ContactClient,
    from,
    rpc,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Alster GmbH",
    vat_id: "DE123",
    billing_address: "Jungfernstieg 1",
    notes: null,
    created_by: "99999999-9999-4999-8999-999999999999",
    created_at: "2026-04-25T10:00:00.000Z",
    updated_at: "2026-04-25T10:00:00.000Z",
    ...overrides,
  };
}

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    company_id: "11111111-1111-4111-8111-111111111111",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: "+49 40 123",
    is_private_customer: false,
    notes: null,
    created_by: "99999999-9999-4999-8999-999999999999",
    created_at: "2026-04-25T10:00:00.000Z",
    updated_at: "2026-04-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("CRM validation", () => {
  it("normalizes company form data and rejects blank names", () => {
    expect(
      parseCompanyFormData(
        makeForm({
          name: "  Alster GmbH  ",
          vat_id: "",
          billing_address: "  Jungfernstieg 1  ",
          notes: "",
        }),
      ),
    ).toEqual({
      name: "Alster GmbH",
      vat_id: null,
      billing_address: "Jungfernstieg 1",
      notes: null,
    });

    expect(() =>
      parseCompanyFormData(
        makeForm({
          name: " ",
          vat_id: "",
          billing_address: "",
          notes: "",
        }),
      ),
    ).toThrow();
  });

  it("normalizes contact form data and rejects invalid email or company id", () => {
    expect(
      parseContactFormData(
        makeForm({
          company_id: "",
          first_name: "  Ada ",
          last_name: " Lovelace ",
          email: "",
          phone: "",
          is_private_customer: true,
          notes: "",
        }),
      ),
    ).toEqual({
      company_id: null,
      first_name: "Ada",
      last_name: "Lovelace",
      email: null,
      phone: null,
      is_private_customer: true,
      notes: null,
    });

    expect(() =>
      parseContactFormData(
        makeForm({
          company_id: "not-a-uuid",
          first_name: "Ada",
          last_name: "Lovelace",
          email: "not-an-email",
          phone: "",
          notes: "",
        }),
      ),
    ).toThrow();
  });
});

describe("CRM audit calls", () => {
  it("audits company create, update, and delete mutations", async () => {
    const actorUserId = "99999999-9999-4999-8999-999999999999";
    const created = company();
    const before = company({ name: "Old GmbH" });
    const after = company({ name: "New GmbH" });
    const createQuery = makeQuery({ data: created, error: null });
    const updateBeforeQuery = makeQuery({ data: before, error: null });
    const updateAfterQuery = makeQuery({ data: after, error: null });
    const deleteBeforeQuery = makeQuery({ data: after, error: null });
    const deleteQuery = makeQuery({ data: { id: after.id }, error: null });
    const { client, rpc } = makeSupabase([
      createQuery,
      updateBeforeQuery,
      updateAfterQuery,
      deleteBeforeQuery,
      deleteQuery,
    ]);

    await createCompanyRecord(client, actorUserId, {
      name: "Alster GmbH",
      vat_id: "DE123",
      billing_address: "Jungfernstieg 1",
      notes: null,
    });
    await updateCompanyRecord(client, after.id, {
      name: "New GmbH",
      vat_id: "DE123",
      billing_address: "Jungfernstieg 1",
      notes: null,
    });
    await deleteCompanyRecord(client, after.id);

    expect(createQuery.insert).toHaveBeenCalledWith({
      name: "Alster GmbH",
      vat_id: "DE123",
      billing_address: "Jungfernstieg 1",
      notes: null,
      created_by: actorUserId,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "log_audit", {
      p_entity_type: "company",
      p_entity_id: created.id,
      p_action: "create",
      p_before: null,
      p_after: created,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "log_audit", {
      p_entity_type: "company",
      p_entity_id: after.id,
      p_action: "update",
      p_before: before,
      p_after: after,
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "log_audit", {
      p_entity_type: "company",
      p_entity_id: after.id,
      p_action: "delete",
      p_before: after,
      p_after: null,
    });
  });

  it("audits contact create, update, and delete mutations", async () => {
    const actorUserId = "99999999-9999-4999-8999-999999999999";
    const created = contact();
    const before = contact({ first_name: "Old" });
    const after = contact({ first_name: "New" });
    const createQuery = makeQuery({ data: created, error: null });
    const updateBeforeQuery = makeQuery({ data: before, error: null });
    const updateAfterQuery = makeQuery({ data: after, error: null });
    const deleteBeforeQuery = makeQuery({ data: after, error: null });
    const deleteQuery = makeQuery({ data: { id: after.id }, error: null });
    const { client, rpc } = makeSupabase([
      createQuery,
      updateBeforeQuery,
      updateAfterQuery,
      deleteBeforeQuery,
      deleteQuery,
    ]);

    await createContactRecord(client, actorUserId, {
      company_id: created.company_id,
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "+49 40 123",
      is_private_customer: false,
      notes: null,
    });
    await updateContactRecord(client, after.id, {
      company_id: after.company_id,
      first_name: "New",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "+49 40 123",
      is_private_customer: false,
      notes: null,
    });
    await deleteContactRecord(client, after.id);

    expect(createQuery.insert).toHaveBeenCalledWith({
      company_id: created.company_id,
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "+49 40 123",
      is_private_customer: false,
      notes: null,
      created_by: actorUserId,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "log_audit", {
      p_entity_type: "contact",
      p_entity_id: created.id,
      p_action: "create",
      p_before: null,
      p_after: created,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "log_audit", {
      p_entity_type: "contact",
      p_entity_id: after.id,
      p_action: "update",
      p_before: before,
      p_after: after,
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "log_audit", {
      p_entity_type: "contact",
      p_entity_id: after.id,
      p_action: "delete",
      p_before: after,
      p_after: null,
    });
  });
});
