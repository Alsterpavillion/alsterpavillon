import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/crm/events";

type EventRow = Pick<
  Event,
  "id" | "event_number" | "title" | "status" | "start_time" | "end_time" | "room_id"
>;

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,event_number,title,status,start_time,end_time,room_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const events = (data ?? []) as EventRow[];

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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {events.map((event) => (
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
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {event.room_id ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">No events yet.</p>
        ) : null}
      </div>
    </section>
  );
}
