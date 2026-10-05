import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchBadge } from "@/components/BranchBadge";
import { canManageGroup, requireApproved } from "@/lib/auth";
import { formatDateTime, formatTime } from "@/lib/time";
import { Messages } from "@/components/Messages";
import { deleteEvent, setRsvp } from "../actions";
import { ReviewButtons } from "../ReviewButtons";

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, profile } = await requireApproved();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  const { data: rsvps } = await supabase.from("event_rsvps").select("user_id").eq("event_id", id);
  const going = rsvps?.some((r) => r.user_id === profile.id) ?? false;
  const approved = e.status === "approved";
  const isAdmin = profile.role === "admin";
  const mine = e.created_by === profile.id;
  const mapUrl = e.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` : null;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4"><Link href="/events">← Calendar</Link></p>
      <Messages error={sp.error} message={sp.message} />
      {e.status === "pending" && (
        <p className="notice mb-4">
          {isAdmin ? "This event is waiting for your approval." : "This event is waiting for an admin to approve it. Only you can see it for now."}
        </p>
      )}
      {e.status === "declined" && (
        <p className="notice mb-4">
          This event wasn&apos;t approved for the calendar.{e.decline_reason ? ` Reason: ${e.decline_reason}` : ""}
        </p>
      )}
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
        {approved && (
          <>
            <p className="text-muted">{rsvps?.length ?? 0} going</p>
            <div className="flex flex-wrap gap-3">
              <form action={setRsvp.bind(null, id, !going)}>
                <button className={going ? "btn-secondary" : "btn"}>{going ? "I can't make it" : "I'm going"}</button>
              </form>
              <a className="btn-secondary" href={`/events/${id}/ics`}>Add to my calendar</a>
            </div>
          </>
        )}
        {isAdmin && e.status === "pending" && <ReviewButtons id={id} />}
        {!canManageGroup(profile, e.group_id) && mine && e.status === "pending" && (
          <form action={deleteEvent.bind(null, id)} className="border-t border-border pt-4">
            <button className="btn-secondary btn-small">Withdraw my suggestion</button>
          </form>
        )}
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
