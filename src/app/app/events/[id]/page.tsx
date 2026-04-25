import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EVENT_STATUSES, listRoomsRecord, type Event } from "@/lib/crm/events";
import { deleteEventForm, updateEventForm } from "../actions";

const STATUS_LABELS: Record<(typeof EVENT_STATUSES)[number], string> = {
  draft: "Draft",
  planned: "Planned",
  cancelled: "Cancelled",
  completed: "Completed",
};

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; first_name: string; last_name: string };

function timeForInput(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [eventResult, rooms, companiesResult, contactsResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    listRoomsRecord(supabase),
    supabase.from("companies").select("id,name").order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,first_name,last_name")
      .order("last_name", { ascending: true }),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }
  if (companiesResult.error) throw new Error(companiesResult.error.message);
  if (contactsResult.error) throw new Error(contactsResult.error.message);

  const event = eventResult.data as Event;
  const companies = (companiesResult.data ?? []) as CompanyOption[];
  const contacts = (contactsResult.data ?? []) as ContactOption[];

  const updateAction = updateEventForm.bind(null, event.id);
  const deleteAction = deleteEventForm.bind(null, event.id);

  const currentRoom = event.room_id ? rooms.find((r) => r.id === event.room_id) : null;
  const currentCompany = event.company_id ? companies.find((c) => c.id === event.company_id) : null;
  const currentContact = event.contact_id ? contacts.find((c) => c.id === event.contact_id) : null;

  return (
    <section className="max-w-xl space-y-6">
      <div>
        <Link href="/app/events" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to events
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          <span className="font-mono text-base text-zinc-500">{event.event_number}</span>{" "}
          <span>{event.title}</span>
        </h1>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs text-zinc-600">
          <div>
            <dt className="text-zinc-500">Room</dt>
            <dd className="text-zinc-800">{currentRoom?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Company</dt>
            <dd className="text-zinc-800">{currentCompany?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Contact</dt>
            <dd className="text-zinc-800">
              {currentContact ? `${currentContact.last_name}, ${currentContact.first_name}` : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <form action={updateAction} className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Title *</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={event.title}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Start</span>
            <input
              type="time"
              name="start_time"
              defaultValue={timeForInput(event.start_time)}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">End</span>
            <input
              type="time"
              name="end_time"
              defaultValue={timeForInput(event.end_time)}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Status</span>
          <select
            name="status"
            defaultValue={event.status}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            {EVENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Company</span>
          <select
            name="company_id"
            defaultValue={event.company_id ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            <option value="">— none —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Contact</span>
          <select
            name="contact_id"
            defaultValue={event.contact_id ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            <option value="">— none —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.last_name}, {c.first_name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save event
          </button>
          <span className="text-xs text-zinc-500">
            Created {new Date(event.created_at).toLocaleDateString("de-DE")}
          </span>
        </div>
      </form>

      <form action={deleteAction}>
        <button type="submit" className="text-sm font-medium text-red-700 hover:text-red-900">
          Cancel event (soft delete)
        </button>
      </form>
    </section>
  );
}
