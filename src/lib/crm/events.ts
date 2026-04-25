import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CrmSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const EVENT_STATUSES = ["draft", "planned", "cancelled", "completed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type Event = {
  id: string;
  event_number: string;
  company_id: string | null;
  contact_id: string | null;
  room_id: string | null;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  status: EventStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
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

const optionalUuid = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().uuid().nullable(),
  )
  .optional();

const optionalDate = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)")
      .nullable(),
  )
  .optional();

const optionalTime = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time (HH:MM or HH:MM:SS)")
      .nullable(),
  )
  .optional();

const optionalGuestCount = z.union([z.number().int().nonnegative(), z.null()]).optional();

const eventCommonShape = {
  company_id: optionalUuid,
  contact_id: optionalUuid,
  room_id: optionalUuid,
  event_date: optionalDate,
  start_time: optionalTime,
  end_time: optionalTime,
  guest_count: optionalGuestCount,
  status: z.enum(EVENT_STATUSES).optional(),
  notes: optionalText(5000),
};

function refineTimeRange<T extends { start_time?: string | null; end_time?: string | null }>(
  schema: z.ZodType<T>,
) {
  return schema.superRefine((value, ctx) => {
    if (value.start_time && value.end_time) {
      if (timeToMinutes(value.end_time) <= timeToMinutes(value.start_time)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_time"],
          message: "end_time must be after start_time",
        });
      }
    }
  });
}

export const eventCreateSchema = refineTimeRange(
  z.object({
    title: z.string().trim().min(1, "title is required").max(200),
    ...eventCommonShape,
  }),
);
export type EventCreateInput = z.input<typeof eventCreateSchema>;

export const eventPatchSchema = refineTimeRange(
  z.object({
    title: z.string().trim().min(1, "title is required").max(200).optional(),
    ...eventCommonShape,
  }),
);
export type EventPatchInput = z.input<typeof eventPatchSchema>;

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  const h = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "0");
  return h * 60 + m;
}

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

async function assertExists(
  supabase: CrmSupabaseClient,
  table: "companies" | "contacts" | "rooms",
  id: string,
  label: string,
): Promise<void> {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).single();
  if (error || !data) {
    throw new Error(`${label} not found.`);
  }
}

async function nextEventNumber(supabase: CrmSupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("next_event_number");
  if (error) {
    throw new Error(error.message);
  }
  if (typeof data !== "string" || !/^EV-\d{4}-\d{4}$/.test(data)) {
    throw new Error("next_event_number returned invalid format.");
  }
  return data;
}

async function writeEventAudit(
  supabase: CrmSupabaseClient,
  eventId: string,
  action: "event_created" | "event_updated" | "event_deleted",
  before: Event | null,
  after: Event | null,
): Promise<void> {
  const { error } = await supabase.rpc("log_audit", {
    p_entity_type: "event",
    p_entity_id: eventId,
    p_action: action,
    p_before: before,
    p_after: after,
  });
  if (error) {
    throw new Error(error.message);
  }
}

const PATCHABLE_FIELDS = [
  "title",
  "company_id",
  "contact_id",
  "room_id",
  "event_date",
  "start_time",
  "end_time",
  "guest_count",
  "status",
  "notes",
] as const;

export async function createEventRecord(
  supabase: CrmSupabaseClient,
  actorUserId: string,
  rawInput: EventCreateInput,
): Promise<Event> {
  const input = eventCreateSchema.parse(rawInput);

  if (input.company_id) {
    await assertExists(supabase, "companies", input.company_id, "Company");
  }
  if (input.contact_id) {
    await assertExists(supabase, "contacts", input.contact_id, "Contact");
  }
  if (input.room_id) {
    await assertExists(supabase, "rooms", input.room_id, "Room");
  }

  const eventNumber = await nextEventNumber(supabase);

  const insertPayload = {
    title: input.title,
    company_id: input.company_id ?? null,
    contact_id: input.contact_id ?? null,
    room_id: input.room_id ?? null,
    event_date: input.event_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    guest_count: input.guest_count ?? null,
    status: input.status ?? "draft",
    notes: input.notes ?? null,
    event_number: eventNumber,
    created_by: actorUserId,
  };

  const { data, error } = await supabase.from("events").insert(insertPayload).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Event creation failed.");
  }

  const created = data as Event;
  await writeEventAudit(supabase, created.id, "event_created", null, created);
  return created;
}

export async function updateEventRecord(
  supabase: CrmSupabaseClient,
  id: string,
  rawPatch: EventPatchInput,
): Promise<Event> {
  const patch = eventPatchSchema.parse(rawPatch);

  if (patch.company_id) {
    await assertExists(supabase, "companies", patch.company_id, "Company");
  }
  if (patch.contact_id) {
    await assertExists(supabase, "contacts", patch.contact_id, "Contact");
  }
  if (patch.room_id) {
    await assertExists(supabase, "rooms", patch.room_id, "Room");
  }

  const { data: beforeData, error: beforeError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (beforeError || !beforeData) {
    throw new Error("Event not found.");
  }
  const before = beforeData as Event;

  const mergedStart = patch.start_time !== undefined ? patch.start_time : before.start_time;
  const mergedEnd = patch.end_time !== undefined ? patch.end_time : before.end_time;
  if (mergedStart && mergedEnd && timeToMinutes(mergedEnd) <= timeToMinutes(mergedStart)) {
    throw new Error("end_time must be after start_time");
  }

  const updatePayload: Record<string, unknown> = {};
  for (const key of PATCHABLE_FIELDS) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  }

  const { data: afterData, error: updateError } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (updateError) {
    throw new Error(updateError.message);
  }
  if (!afterData) {
    throw new Error("Event update failed.");
  }
  const after = afterData as Event;

  await writeEventAudit(supabase, id, "event_updated", before, after);
  return after;
}

export async function deleteEventRecord(supabase: CrmSupabaseClient, id: string): Promise<Event> {
  const { data: beforeData, error: beforeError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (beforeError || !beforeData) {
    throw new Error("Event not found.");
  }
  const before = beforeData as Event;

  const { data: afterData, error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  if (!afterData) {
    throw new Error("Event delete failed.");
  }
  const after = afterData as Event;

  await writeEventAudit(supabase, id, "event_deleted", before, after);
  return after;
}

export async function listRoomsRecord(supabase: CrmSupabaseClient): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Room[];
}

export async function createEvent(input: EventCreateInput): Promise<Event> {
  "use server";

  const supabase = await createSupabaseServerClient();
  const actorUserId = await requireUserId(supabase);
  const event = await createEventRecord(supabase, actorUserId, input);

  revalidatePath("/app/events");
  return event;
}

export async function updateEvent(id: string, patch: EventPatchInput): Promise<Event> {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  const event = await updateEventRecord(supabase, id, patch);

  revalidatePath("/app/events");
  revalidatePath(`/app/events/${id}`);
  return event;
}

export async function deleteEvent(id: string): Promise<Event> {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  const event = await deleteEventRecord(supabase, id);

  revalidatePath("/app/events");
  revalidatePath(`/app/events/${id}`);
  return event;
}

export async function listRooms(): Promise<Room[]> {
  "use server";

  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  return listRoomsRecord(supabase);
}
