import { redirect } from "next/navigation";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { createEvent } from "../actions";
import { EventForm } from "../EventForm";

export const metadata = { title: "Add an event" };

export default async function NewEventPage(props: PageProps<"/events/new">) {
  const sp = await props.searchParams;
  const { profile } = await requireApproved();
  if (profile.role === "member") redirect("/events");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title">Add an event</h1>
      <Messages error={sp.error} />
      <EventForm action={createEvent} profile={profile} submitLabel="Add to calendar" />
    </div>
  );
}
