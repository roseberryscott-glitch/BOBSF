import { ChevronLeft, ChevronRight, Plus, Repeat2 } from "lucide-react";
import Link from "next/link";
import { BranchBadge } from "@/components/BranchBadge";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { describeRepeat, occurrences, type Repeating } from "@/lib/events";
import {
  addDays,
  addMonths,
  dayParts,
  formatDateTime,
  formatTime,
  localInputToIso,
  monthGrid,
  monthName,
  zonedDay,
} from "@/lib/time";

export const metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalEvent = Repeating & {
  id: string;
  title: string;
  location: string | null;
  group_id: string | null;
};

export default async function EventsPage(props: PageProps<"/events">) {
  const sp = await props.searchParams;
  const { supabase, profile } = await requireApproved();

  const today = zonedDay(new Date());
  const month = typeof sp.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const weeks = monthGrid(month);
  const gridStart = weeks[0][0];
  const gridEnd = addDays(weeks.at(-1)!.at(-1)!, 1);

  const [{ data }, { data: mine }, { count: waiting }] = await Promise.all([
    // One-off events in the weeks on screen, plus every repeating event that has started by then.
    supabase
      .from("events")
      .select("id, title, starts_at, location, group_id, repeat, repeat_until")
      .eq("status", "approved")
      .lt("starts_at", localInputToIso(`${gridEnd}T00:00`)!)
      .or(`starts_at.gte.${localInputToIso(`${gridStart}T00:00`)},repeat.neq.none`)
      .order("starts_at"),
    supabase
      .from("events")
      .select("id, title, starts_at, status, decline_reason")
      .eq("created_by", profile.id)
      .neq("status", "approved")
      .order("starts_at"),
    profile.role === "admin"
      ? supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  // One entry per date the event happens on screen.
  const events = ((data ?? []) as CalEvent[])
    .flatMap((e) => occurrences(e, gridStart, gridEnd).map((at) => ({ ...e, at, day: zonedDay(at) })))
    .sort((a, b) => a.at.localeCompare(b.at));
  const byDay = new Map<string, typeof events>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const thisMonth = events.filter((e) => e.day.startsWith(month));
  const canPublish = profile.role === "admin" || profile.role === "leader";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-olive">Calendar</p>
          <h1 className="font-display text-4xl font-bold uppercase text-navy">{monthName(month)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn-secondary btn-small" href={`/events?month=${addMonths(month, -1)}`} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {month !== today.slice(0, 7) && (
            <Link className="btn-secondary btn-small" href="/events">Today</Link>
          )}
          <Link className="btn-secondary btn-small" href={`/events?month=${addMonths(month, 1)}`} aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </Link>
          <Link className="btn btn-small" href="/events/new">
            <Plus className="mr-1 h-4 w-4" /> {canPublish ? "Add an event" : "Suggest an event"}
          </Link>
        </div>
      </div>

      <Messages error={sp.error} message={sp.message} />

      {!!waiting && (
        <p className="notice mb-6 flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>{waiting}</strong> {waiting === 1 ? "event is" : "events are"} waiting for your approval.
          </span>
          <Link className="btn btn-small" href="/admin?tab=events">Review</Link>
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="grid grid-cols-7 bg-navy text-center text-sm font-bold uppercase tracking-wide text-white">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              <span className="sm:hidden">{d[0]}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 border-t border-border">
            {week.map((day) => {
              const list = byDay.get(day) ?? [];
              const inMonth = day.startsWith(month);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`min-h-16 border-l border-border p-1 first:border-l-0 sm:min-h-28 sm:p-2 ${inMonth ? "" : "bg-slate-50 text-slate-400"}`}
                >
                  <div
                    className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? "bg-gold text-navy" : ""}`}
                  >
                    {Number(day.slice(8))}
                  </div>
                  {/* Phones: a dot per event; the list below has the details. */}
                  <div className="flex flex-wrap gap-1 sm:hidden">
                    {list.map((e) => (
                      <Link key={e.id} href={`/events/${e.id}?on=${e.day}`} aria-label={e.title} className={`h-2.5 w-2.5 rounded-full ${e.group_id ? "bg-olive" : "bg-navy"}`} />
                    ))}
                  </div>
                  <ul className="hidden space-y-1 sm:block">
                    {list.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/events/${e.id}?on=${e.day}`}
                          title={e.title}
                          className={`block truncate rounded px-1.5 py-0.5 text-sm font-semibold text-white no-underline hover:opacity-90 ${e.group_id ? "bg-olive" : "bg-navy"}`}
                        >
                          <span className="font-normal opacity-80">{formatTime(e.at).replace(/ [A-Z]{2,4}$/, "")} </span>
                          {e.title}
                        </Link>
                      </li>
                    ))}
                    {list.length > 3 && <li className="px-1 text-sm text-muted">+{list.length - 3} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-navy" /> All members</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-olive" /> One branch</span>
      </p>

      <section className="mt-10" aria-labelledby="list-h">
        <h2 id="list-h" className="mb-3 text-2xl font-bold">Events in {monthName(month).split(" ")[0]}</h2>
        {thisMonth.length === 0 ? (
          <p className="card">Nothing on the calendar this month yet.</p>
        ) : (
          <ul className="space-y-3">
            {thisMonth.map((e) => {
              const d = dayParts(e.at);
              const repeats = describeRepeat(e);
              return (
                <li key={`${e.id}-${e.day}`} className="card flex gap-5">
                  <div className="w-16 shrink-0 rounded-md bg-primary py-2 text-center text-white" aria-hidden="true">
                    <div className="text-sm uppercase">{d.weekday}</div>
                    <div className="text-2xl font-bold">{d.day}</div>
                    <div className="text-sm uppercase">{d.month}</div>
                  </div>
                  <div className="min-w-0">
                    <Link href={`/events/${e.id}?on=${e.day}`} className="text-xl font-semibold">{e.title}</Link>
                    <p>
                      {d.weekday} {d.month} {d.day}, {formatTime(e.at)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    {repeats && <p className="flex items-center gap-1.5 text-olive"><Repeat2 className="h-4 w-4" /> {repeats}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                      {e.group_id ? <BranchBadge groupId={e.group_id} size="sm" /> : "All members"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(mine ?? []).length > 0 && (
        <section className="mt-10" aria-labelledby="mine-h">
          <h2 id="mine-h" className="mb-3 text-2xl font-bold">Your suggestions</h2>
          <ul className="space-y-3">
            {(mine ?? []).map((e) => (
              <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/events/${e.id}`} className="text-lg font-semibold">{e.title}</Link>
                  <p className="text-muted">{formatDateTime(e.starts_at)}</p>
                  {e.status === "declined" && e.decline_reason && <p className="text-muted">Reason: {e.decline_reason}</p>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${e.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700"}`}
                >
                  {e.status === "pending" ? "Waiting for approval" : "Not approved"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
