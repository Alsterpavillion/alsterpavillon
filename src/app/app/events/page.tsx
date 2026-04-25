import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/crm/events";

type EventRow = Pick<
  Event,
  | "id"
  | "event_number"
  | "title"
  | "status"
  | "start_time"
  | "end_time"
  | "room_id"
  | "company_id"
  | "contact_id"
>;

type CompanyRef = { id: string; name: string };
type ContactRef = { id: string; first_name: string; last_name: string };
type RoomRef = { id: string; name: string };

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

function contactDisplay(c: ContactRef | undefined): string {
  if (!c) return "—";
  return `${c.last_name}, ${c.first_name}`;
}

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();

  const [eventsResult, companiesResult, contactsResult, roomsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id,event_number,title,status,start_time,end_time,room_id,company_id,contact_id")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("companies").select("id,name"),
    supabase.from("contacts").select("id,first_name,last_name"),
    supabase.from("rooms").select("id,name"),
  ]);

  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (companiesResult.error) throw new Error(companiesResult.error.message);
  if (contactsResult.error) throw new Error(contactsResult.error.message);
  if (roomsResult.error) throw new Error(roomsResult.error.message);

  const events = (eventsResult.data ?? []) as EventRow[];
  const companies = new Map<string, CompanyRef>(
    ((companiesResult.data ?? []) as CompanyRef[]).map((c) => [c.id, c]),
  );
  const contacts = new Map<string, ContactRef>(
    ((contactsResult.data ?? []) as ContactRef[]).map((c) => [c.id, c]),
  );
  const rooms = new Map<string, RoomRef>(
    ((roomsResult.data ?? []) as RoomRef[]).map((r) => [r.id, r]),
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Events</h1>
          <p className="mt-1 text-sm text-zinc-600">Event roster (M1.2).</p>
        </div>
        <Link
          href="/app/events/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New event
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Event #</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {events.map((event) => {
              const room = event.room_id ? rooms.get(event.room_id) : undefined;
              const company = event.company_id ? companies.get(event.company_id) : undefined;
              const contact = event.contact_id ? contacts.get(event.contact_id) : undefined;
              return (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    <Link
                      className="font-medium text-zinc-900 hover:underline"
                      href={`/app/events/${event.id}`}
                    >
                      {event.event_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-900">{event.title}</td>
                  <td className="px-4 py-3 text-zinc-600">{event.status}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatTime(event.start_time)}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatTime(event.end_time)}</td>
                  <td className="px-4 py-3 text-zinc-600">{room?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{company?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{contactDisplay(contact)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">No events yet.</p>
        ) : null}
      </div>
    </section>
  );
}
