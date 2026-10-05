"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";
import { localInputToIso } from "@/lib/time";

function readEvent(formData: FormData) {
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const group = text("group_id");
  return {
    title: text("title").slice(0, 200),
    description: text("description") || null,
    location: text("location") || null,
    starts_at: localInputToIso(text("starts_at")),
    ends_at: text("ends_at") ? localInputToIso(text("ends_at")) : null,
    group_id: group === "all" ? null : group,
  };
}

export async function createEvent(formData: FormData) {
  const { supabase, profile } = await requireApproved();
  const event = readEvent(formData);
  if (!event.title || !event.starts_at) {
    redirect(`/events/new?error=${encodeURIComponent("Please add a title and a start time.")}`);
  }
  // The database only allows admins, or a leader posting for their own group.
  const { data, error } = await supabase
    .from("events")
    .insert({ ...event, created_by: profile.id })
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/events/new?error=${encodeURIComponent("You can't add an event for that group.")}`);
  }
  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const { supabase } = await requireApproved();
  const event = readEvent(formData);
  if (!event.title || !event.starts_at) {
    redirect(`/events/${id}/edit?error=${encodeURIComponent("Please add a title and a start time.")}`);
  }
  const { data, error } = await supabase.from("events").update(event).eq("id", id).select("id");
  if (error || !data?.length) {
    redirect(`/events/${id}/edit?error=${encodeURIComponent("You can't change this event.")}`);
  }
  revalidatePath("/events");
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireApproved();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/events");
  redirect("/events");
}

export async function setRsvp(id: string, going: boolean) {
  const { supabase, profile } = await requireApproved();
  if (going) {
    await supabase.from("event_rsvps").insert({ event_id: id, user_id: profile.id });
  } else {
    await supabase.from("event_rsvps").delete().eq("event_id", id).eq("user_id", profile.id);
  }
  revalidatePath(`/events/${id}`);
}
