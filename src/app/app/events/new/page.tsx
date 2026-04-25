import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listRoomsRecord } from "@/lib/crm/events";
import { createEventForm } from "../actions";

export default async function NewEventPage() {
  const supabase = await createSupabaseServerClient();
  const rooms = await listRoomsRecord(supabase);

  return (
    <section className="max-w-xl space-y-6">
      <div>
        <Link href="/app/events" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to events
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">New event</h1>
      </div>

      <form
        action={createEventForm}
        className="space-y-4 rounded border border-zinc-200 bg-white p-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Title *</span>
          <input
            name="title"
            required
            maxLength={200}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Start</span>
            <input
              type="time"
              name="start_time"
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">End</span>
            <input
              type="time"
              name="end_time"
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Room</span>
          <select
            name="room_id"
            defaultValue=""
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            <option value="">— none —</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save event
          </button>
        </div>
      </form>
    </section>
  );
}
