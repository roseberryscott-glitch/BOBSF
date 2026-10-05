import { notFound } from "next/navigation";
import { Messages } from "@/components/Messages";
import { canManageGroup, requireApproved } from "@/lib/auth";
import { isoToLocalInput } from "@/lib/time";
import { updateEvent } from "../../actions";
import { EventForm } from "../../EventForm";

export const metadata = { title: "Edit event" };

export default async function EditEventPage(props: PageProps<"/events/[id]/edit">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, profile } = await requireApproved();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e || !canManageGroup(profile, e.group_id)) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title">Edit event</h1>
      <Messages error={sp.error} />
      <EventForm
        action={updateEvent.bind(null, id)}
        profile={profile}
        submitLabel="Save changes"
        values={{
          ...e,
          group_id: e.group_id ?? "all",
          date: isoToLocalInput(e.starts_at).slice(0, 10),
          time: isoToLocalInput(e.starts_at).slice(11, 16),
        }}
      />
    </div>
  );
}
