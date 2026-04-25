"use server";

import { redirect } from "next/navigation";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type EventCreateInput,
  type EventPatchInput,
  type EventStatus,
} from "@/lib/crm/events";

function strField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createEventForm(formData: FormData) {
  const input: EventCreateInput = {
    title: strField(formData, "title"),
    start_time: strField(formData, "start_time"),
    end_time: strField(formData, "end_time"),
    room_id: strField(formData, "room_id"),
  };
  await createEvent(input);
  redirect("/app/events");
}

export async function updateEventForm(id: string, formData: FormData) {
  const patch: EventPatchInput = {
    title: strField(formData, "title"),
    start_time: strField(formData, "start_time"),
    end_time: strField(formData, "end_time"),
    status: strField(formData, "status") as EventStatus,
  };
  await updateEvent(id, patch);
  redirect(`/app/events/${id}`);
}

export async function deleteEventForm(id: string) {
  await deleteEvent(id);
  redirect("/app/events");
}
