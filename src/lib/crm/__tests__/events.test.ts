import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateSupabaseServerClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => mockedCreateSupabaseServerClient(),
}));

import {
  createEvent,
  createEventRecord,
  deleteEventRecord,
  listRoomsRecord,
  updateEventRecord,
  type Event,
  type Room,
} from "../events";

type EventClient = Parameters<typeof createEventRecord>[0];

type DbResult = { data: unknown; error: { message: string } | null };

type QueryBuilder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
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
  builder.delete = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  // Make the chain itself thenable (for queries like `.from().select().eq().order()`).
  Object.defineProperty(builder, "then", {
    value: (onFulfilled: (value: DbResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    writable: true,
    configurable: true,
  });
  return builder;
}

type RpcResult = { data: unknown; error: { message: string } | null };

function makeSupabase(opts: {
  chains: QueryBuilder[];
  rpc?: (name: string, args?: unknown) => Promise<RpcResult>;
  user?: { id: string } | null;
}) {
  let index = 0;
  const rpc = vi.fn(async (name: string, args?: unknown) => {
    if (opts.rpc) return opts.rpc(name, args);
    if (name === "next_event_number") {
      return { data: "EV-2026-0001", error: null };
    }
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
    client: { from, rpc, auth: { getUser } } as unknown as EventClient,
    from,
    rpc,
    getUser,
  };
}

const ROOM_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "99999999-9999-4999-8999-999999999999";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: EVENT_ID,
    event_number: "EV-2026-0001",
    company_id: null,
    contact_id: null,
    room_id: null,
    title: "Test Event",
    event_date: null,
    start_time: null,
    end_time: null,
    guest_count: null,
    status: "draft",
    notes: null,
    created_by: USER_ID,
    created_at: "2026-04-26T10:00:00.000Z",
    updated_at: "2026-04-26T10:00:00.000Z",
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    name: "Pavillon",
    slug: "pavillon",
    description: null,
    capacity: 120,
    is_active: true,
    sort_order: 20,
    created_by: null,
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

describe("createEventRecord — validation", () => {
  it("rejects missing title", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(createEventRecord(client, USER_ID, { title: "" })).rejects.toThrow();
  });

  it("rejects whitespace-only title", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(createEventRecord(client, USER_ID, { title: "   " })).rejects.toThrow();
  });

  it("rejects start_time >= end_time", async () => {
    const { client: a } = makeSupabase({ chains: [] });
    await expect(
      createEventRecord(a, USER_ID, {
        title: "T",
        start_time: "18:00",
        end_time: "17:00",
      }),
    ).rejects.toThrow();

    const { client: b } = makeSupabase({ chains: [] });
    await expect(
      createEventRecord(b, USER_ID, {
        title: "T",
        start_time: "18:00",
        end_time: "18:00",
      }),
    ).rejects.toThrow();
  });

  it("rejects when company_id does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(
      createEventRecord(client, USER_ID, { title: "T", company_id: COMPANY_ID }),
    ).rejects.toThrow(/Company not found/);
  });

  it("rejects when contact_id does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(
      createEventRecord(client, USER_ID, { title: "T", contact_id: CONTACT_ID }),
    ).rejects.toThrow(/Contact not found/);
  });

  it("rejects when room_id does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(
      createEventRecord(client, USER_ID, { title: "T", room_id: ROOM_ID }),
    ).rejects.toThrow(/Room not found/);
  });

  it("rejects invalid uuid for company_id", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(
      createEventRecord(client, USER_ID, { title: "T", company_id: "not-a-uuid" }),
    ).rejects.toThrow();
  });
});

describe("createEventRecord — success", () => {
  it("creates with title only, returns EV-YYYY-XXXX, calls next_event_number exactly once and log_audit once", async () => {
    const inserted = makeEvent({ event_number: "EV-2026-0001" });
    const insertQuery = makeQuery({ data: inserted, error: null });
    const { client, rpc } = makeSupabase({ chains: [insertQuery] });

    const result = await createEventRecord(client, USER_ID, { title: "Sommerfest" });

    expect(result.event_number).toMatch(/^EV-\d{4}-\d{4}$/);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Sommerfest",
        company_id: null,
        contact_id: null,
        room_id: null,
        status: "draft",
        event_number: "EV-2026-0001",
        created_by: USER_ID,
      }),
    );

    const nextNumberCalls = rpc.mock.calls.filter(([name]) => name === "next_event_number");
    const auditCalls = rpc.mock.calls.filter(([name]) => name === "log_audit");
    expect(nextNumberCalls).toHaveLength(1);
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toEqual({
      p_entity_type: "event",
      p_entity_id: inserted.id,
      p_action: "event_created",
      p_before: null,
      p_after: inserted,
    });
  });

  it("rejects unknown event_number format from RPC (defense in depth)", async () => {
    const insertQuery = makeQuery({ data: makeEvent(), error: null });
    const { client } = makeSupabase({
      chains: [insertQuery],
      rpc: async (name) => {
        if (name === "next_event_number") return { data: "BAD-FORMAT", error: null };
        return { data: null, error: null };
      },
    });
    await expect(createEventRecord(client, USER_ID, { title: "X" })).rejects.toThrow(
      /invalid format/,
    );
  });

  it("trims title and persists", async () => {
    const inserted = makeEvent({ title: "Hochzeit" });
    const insertQuery = makeQuery({ data: inserted, error: null });
    const { client } = makeSupabase({ chains: [insertQuery] });

    await createEventRecord(client, USER_ID, { title: "  Hochzeit  " });
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ title: "Hochzeit" }));
  });

  it("yields distinct event numbers across two calls (RPC is asked once per create)", async () => {
    const insertedA = makeEvent({ id: "aaaa", event_number: "EV-2026-0001" });
    const insertedB = makeEvent({ id: "bbbb", event_number: "EV-2026-0002" });
    const insertA = makeQuery({ data: insertedA, error: null });
    const insertB = makeQuery({ data: insertedB, error: null });

    const numbers = ["EV-2026-0001", "EV-2026-0002"];
    let i = 0;
    const { client, rpc } = makeSupabase({
      chains: [insertA, insertB],
      rpc: async (name) => {
        if (name === "next_event_number") {
          const value = numbers[i] ?? "EV-2026-0099";
          i += 1;
          return { data: value, error: null };
        }
        return { data: null, error: null };
      },
    });

    const a = await createEventRecord(client, USER_ID, { title: "A" });
    const b = await createEventRecord(client, USER_ID, { title: "B" });

    expect(a.event_number).not.toBe(b.event_number);
    expect(rpc.mock.calls.filter(([n]) => n === "next_event_number")).toHaveLength(2);
    expect(rpc.mock.calls.filter(([n]) => n === "log_audit")).toHaveLength(2);
  });
});

describe("updateEventRecord", () => {
  it("rejects merged invalid time window (patch end_time before existing start_time)", async () => {
    const before = makeEvent({ start_time: "10:00", end_time: "12:00" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const { client } = makeSupabase({ chains: [beforeQuery] });

    await expect(updateEventRecord(client, EVENT_ID, { end_time: "09:00" })).rejects.toThrow(
      /end_time/,
    );
  });

  it("rejects when patched time range is invalid by itself", async () => {
    const { client } = makeSupabase({ chains: [] });
    await expect(
      updateEventRecord(client, EVENT_ID, { start_time: "20:00", end_time: "19:30" }),
    ).rejects.toThrow();
  });

  it("rejects when company_id does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(updateEventRecord(client, EVENT_ID, { company_id: COMPANY_ID })).rejects.toThrow(
      /Company not found/,
    );
  });

  it("succeeds: updates title and writes event_updated audit with before/after", async () => {
    const before = makeEvent({ title: "Old" });
    const after = makeEvent({ title: "New" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const updateQuery = makeQuery({ data: after, error: null });
    const { client, rpc } = makeSupabase({ chains: [beforeQuery, updateQuery] });

    const result = await updateEventRecord(client, EVENT_ID, { title: "New" });

    expect(result.title).toBe("New");
    expect(updateQuery.update).toHaveBeenCalledWith({ title: "New" });

    const auditCalls = rpc.mock.calls.filter(([n]) => n === "log_audit");
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toEqual({
      p_entity_type: "event",
      p_entity_id: EVENT_ID,
      p_action: "event_updated",
      p_before: before,
      p_after: after,
    });
    expect(rpc.mock.calls.filter(([n]) => n === "next_event_number")).toHaveLength(0);
  });

  it("does not include unchanged fields in update payload", async () => {
    const before = makeEvent({ title: "T", notes: "old notes", status: "draft" });
    const after = makeEvent({ title: "T", notes: "new notes", status: "draft" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const updateQuery = makeQuery({ data: after, error: null });
    const { client } = makeSupabase({ chains: [beforeQuery, updateQuery] });

    await updateEventRecord(client, EVENT_ID, { notes: "new notes" });
    expect(updateQuery.update).toHaveBeenCalledWith({ notes: "new notes" });
  });
});

describe("deleteEventRecord — soft delete", () => {
  it("sets status to 'cancelled', logs event_deleted, returns updated row", async () => {
    const before = makeEvent({ status: "draft" });
    const after = makeEvent({ status: "cancelled" });
    const beforeQuery = makeQuery({ data: before, error: null });
    const updateQuery = makeQuery({ data: after, error: null });
    const { client, rpc } = makeSupabase({ chains: [beforeQuery, updateQuery] });

    const result = await deleteEventRecord(client, EVENT_ID);

    expect(result.status).toBe("cancelled");
    expect(updateQuery.update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(updateQuery.delete).not.toHaveBeenCalled();

    const auditCalls = rpc.mock.calls.filter(([n]) => n === "log_audit");
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.[1]).toEqual({
      p_entity_type: "event",
      p_entity_id: EVENT_ID,
      p_action: "event_deleted",
      p_before: before,
      p_after: after,
    });
  });

  it("rejects when event does not exist", async () => {
    const missing = makeQuery({ data: null, error: { message: "0 rows" } });
    const { client } = makeSupabase({ chains: [missing] });
    await expect(deleteEventRecord(client, EVENT_ID)).rejects.toThrow(/Event not found/);
  });
});

describe("listRoomsRecord", () => {
  it("returns rows from rooms ordered by sort_order then name, only active", async () => {
    const rooms = [
      makeRoom({ name: "A", sort_order: 10 }),
      makeRoom({ name: "B", sort_order: 20 }),
    ];
    const listQuery = makeQuery({ data: rooms, error: null });
    const { client } = makeSupabase({ chains: [listQuery] });

    const result = await listRoomsRecord(client);

    expect(result).toEqual(rooms);
    expect(listQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(listQuery.order).toHaveBeenNthCalledWith(1, "sort_order", { ascending: true });
    expect(listQuery.order).toHaveBeenNthCalledWith(2, "name", { ascending: true });
  });

  it("returns [] on empty result", async () => {
    const listQuery = makeQuery({ data: null, error: null });
    const { client } = makeSupabase({ chains: [listQuery] });
    const result = await listRoomsRecord(client);
    expect(result).toEqual([]);
  });

  it("throws on db error", async () => {
    const listQuery = makeQuery({ data: null, error: { message: "boom" } });
    const { client } = makeSupabase({ chains: [listQuery] });
    await expect(listRoomsRecord(client)).rejects.toThrow(/boom/);
  });
});

describe("server action — RLS / auth gate", () => {
  it("createEvent throws when no authenticated user", async () => {
    const { client } = makeSupabase({ chains: [], user: null });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    await expect(createEvent({ title: "Test" })).rejects.toThrow(/Authentication required/);
  });

  it("createEvent succeeds when authenticated and propagates record result", async () => {
    const inserted = makeEvent({ event_number: "EV-2026-0042", title: "Auth Path" });
    const insertQuery = makeQuery({ data: inserted, error: null });
    const { client } = makeSupabase({ chains: [insertQuery] });
    mockedCreateSupabaseServerClient.mockResolvedValue(client);

    const result = await createEvent({ title: "Auth Path" });
    expect(result.event_number).toBe("EV-2026-0042");
    expect(result.title).toBe("Auth Path");
  });
});
