import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EVENT_STATUSES, type Event } from "@/lib/crm/events";
import { deleteEventForm, updateEventForm } from "../actions";

const STATUS_LABELS: Record<(typeof EVENT_STATUSES)[number], string> = {
  draft: "Draft",
  planned: "Planned",
  cancelled: "Cancelled",
  completed: "Completed",
};

function timeForInput(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();

  if (error || !data) {
    notFound();
  }

  const event = data as Event;
  const updateAction = updateEventForm.bind(null, event.id);
  const deleteAction = deleteEventForm.bind(null, event.id);

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
