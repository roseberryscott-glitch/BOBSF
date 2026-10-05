"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireApproved } from "@/lib/auth";
import { notifyAdminsOfEvent, notifyEventDecision } from "@/lib/notify";
import { REPEATS, type Repeat } from "@/lib/events";
import { localInputToIso } from "@/lib/time";

function readEvent(formData: FormData) {
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const group = text("group_id");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text("date")) ? text("date") : "";
  const time = /^\d{2}:\d{2}/.test(text("time")) ? text("time").slice(0, 5) : "";
  const repeat = text("repeat") in REPEATS ? (text("repeat") as Repeat) : "none";
  const until = /^\d{4}-\d{2}-\d{2}$/.test(text("repeat_until")) ? text("repeat_until") : null;
  return {
    title: text("title").slice(0, 200),
    description: text("description") || null,
    location: text("location") || null,
    starts_at: date && time ? localInputToIso(`${date}T${time}`) : null,
    ends_at: null,
    repeat,
    repeat_until: repeat !== "none" && until && until >= date ? until : null,
    group_id: group === "all" ? null : group,
  };
}

export async function createEvent(formData: FormData) {
  const { supabase, profile } = await requireApproved();
  const event = readEvent(formData);
  if (!event.title || !event.starts_at) {
    redirect(`/events/new?error=${encodeURIComponent("Please add a name, a day and a time.")}`);
  }
  // The database decides whether it goes straight on the calendar (admins, and
  // leaders for their own branch) or waits for an admin (everyone else).
  const { data, error } = await supabase
    .from("events")
    .insert({ ...event, created_by: profile.id })
    .select("id, status")
    .single();
  if (error || !data) {
    redirect(`/events/new?error=${encodeURIComponent("You can't add an event for that group.")}`);
  }
  revalidatePath("/events");
  if (data.status === "pending") {
    after(() => notifyAdminsOfEvent(data.id));
    redirect(
      `/events?message=${encodeURIComponent("Thanks! Your event was sent to the admins and will appear on the calendar once it's approved.")}`,
    );
  }
  redirect(`/events/${data.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const { supabase } = await requireApproved();
  const event = readEvent(formData);
  if (!event.title || !event.starts_at) {
    redirect(`/events/${id}/edit?error=${encodeURIComponent("Please add a name, a day and a time.")}`);
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

export async function reviewEvent(id: string, approve: boolean, formData: FormData) {
  const { supabase } = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  const { data, error } = await supabase
    .from("events")
    .update({ status: approve ? "approved" : "declined", decline_reason: approve ? null : reason })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  const back = String(formData.get("back") ?? "") === "admin" ? "/admin?tab=events" : `/events/${id}`;
  const sep = back.includes("?") ? "&" : "?";
  if (error || !data?.length) {
    redirect(`${back}${sep}error=${encodeURIComponent("That event was already reviewed.")}`);
  }
  after(() => notifyEventDecision(id));
  revalidatePath("/events");
  revalidatePath("/admin");
  redirect(`${back}${sep}message=${encodeURIComponent(approve ? "Approved. It's on the calendar now." : "Declined. The member has been told.")}`);
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
