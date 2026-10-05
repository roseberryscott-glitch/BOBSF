import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { createEvent } from "../actions";
import { EventForm } from "../EventForm";

export const metadata = { title: "Add an event" };

export default async function NewEventPage(props: PageProps<"/events/new">) {
  const sp = await props.searchParams;
  const { profile } = await requireApproved();
  const isAdmin = profile.role === "admin";
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title">{isAdmin ? "Add an event" : "Suggest an event"}</h1>
      {!isAdmin && (
        <p className="notice mb-6">
          An admin reviews each event before it appears on the calendar.
          {profile.role === "leader" && " Events just for your branch go on right away."}
        </p>
      )}
      <Messages error={sp.error} />
      <EventForm action={createEvent} profile={profile} submitLabel={isAdmin ? "Add to calendar" : "Send for approval"} />
    </div>
  );
}
