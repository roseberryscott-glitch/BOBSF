import Link from "next/link";
import { BranchBadge } from "@/components/BranchBadge";
import { requireApproved } from "@/lib/auth";
import { dayParts, formatTime, monthLabel, upcomingCutoffIso } from "@/lib/time";

export const metadata = { title: "Calendar" };

export default async function EventsPage(props: PageProps<"/events">) {
  const sp = await props.searchParams;
  const past = sp.past === "1";
  const { supabase, profile } = await requireApproved();
  const now = upcomingCutoffIso();

  let query = supabase.from("events").select("id, title, starts_at, location, group_id, event_rsvps(count)");
  query = past
    ? query.lt("starts_at", now).order("starts_at", { ascending: false }).limit(50)
    : query.gte("starts_at", now).order("starts_at");
  const { data: events } = await query;

  const byMonth = new Map<string, NonNullable<typeof events>>();
  for (const e of events ?? []) {
    const m = monthLabel(e.starts_at);
    byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
  }
  const canCreate = profile.role === "admin" || profile.role === "leader";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{past ? "Past events" : "Calendar"}</h1>
        <div className="flex gap-3">
          <Link className="btn-secondary btn-small" href={past ? "/events" : "/events?past=1"}>
            {past ? "Upcoming events" : "Past events"}
          </Link>
          {canCreate && <Link className="btn btn-small" href="/events/new">Add an event</Link>}
        </div>
      </div>

      {byMonth.size === 0 && <p className="card">No {past ? "past" : "upcoming"} events.</p>}

      {[...byMonth].map(([month, list]) => (
        <section key={month} className="mb-8">
          <h2 className="mb-3 text-2xl font-bold">{month}</h2>
          <ul className="space-y-3">
            {list.map((e) => {
              const d = dayParts(e.starts_at);
              const going = (e.event_rsvps as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li key={e.id} className="card flex gap-5">
                  <div className="w-16 shrink-0 rounded-md bg-primary py-2 text-center text-white" aria-hidden="true">
                    <div className="text-sm uppercase">{d.weekday}</div>
                    <div className="text-2xl font-bold">{d.day}</div>
                    <div className="text-sm uppercase">{d.month}</div>
                  </div>
                  <div>
                    <Link href={`/events/${e.id}`} className="text-xl font-semibold">{e.title}</Link>
                    <p>
                      {d.weekday} {d.month} {d.day}, {formatTime(e.starts_at)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                      {e.group_id ? <BranchBadge groupId={e.group_id} size="sm" /> : "All members"}
                      {going > 0 && <span>· {going} going</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
