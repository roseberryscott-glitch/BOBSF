import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchBadge } from "@/components/BranchBadge";
import { canManageGroup, requireApproved } from "@/lib/auth";
import { formatDateTime, formatTime } from "@/lib/time";
import { deleteEvent, setRsvp } from "../actions";

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const { supabase, profile } = await requireApproved();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  const { data: rsvps } = await supabase.from("event_rsvps").select("user_id").eq("event_id", id);
  const going = rsvps?.some((r) => r.user_id === profile.id) ?? false;
  const mapUrl = e.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` : null;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4"><Link href="/events">← Calendar</Link></p>
      <div className="card space-y-4">
        <h1 className="text-3xl font-bold">{e.title}</h1>
        <p className="text-xl">
          {formatDateTime(e.starts_at)}
          {e.ends_at ? ` to ${formatTime(e.ends_at)}` : ""}
        </p>
        {e.location && (
          <p>
            {e.location} · {mapUrl && <a href={mapUrl}>Map</a>}
          </p>
        )}
        <p className="flex items-center gap-2">
          For: {e.group_id ? <BranchBadge groupId={e.group_id} /> : "All members"}
        </p>
        {e.description && <div className="whitespace-pre-line">{e.description}</div>}
        <p className="text-muted">{rsvps?.length ?? 0} going</p>
        <div className="flex flex-wrap gap-3">
          <form action={setRsvp.bind(null, id, !going)}>
            <button className={going ? "btn-secondary" : "btn"}>{going ? "I can't make it" : "I'm going"}</button>
          </form>
          <a className="btn-secondary" href={`/events/${id}/ics`}>Add to my calendar</a>
        </div>
        {canManageGroup(profile, e.group_id) && (
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Link className="btn-secondary btn-small" href={`/events/${id}/edit`}>Edit</Link>
            <form action={deleteEvent.bind(null, id)}>
              <button className="btn-danger btn-small">Delete event</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
