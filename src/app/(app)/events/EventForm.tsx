import type { Profile } from "@/lib/types";
import { GROUPS } from "@/lib/groups";
import { REPEATS } from "@/lib/events";
import { SITE_TIMEZONE_LABEL } from "@/lib/time";

type Values = {
  title?: string;
  description?: string | null;
  location?: string | null;
  date?: string;
  time?: string;
  repeat?: string;
  repeat_until?: string | null;
  group_id?: string | null;
};

export function EventForm({
  action,
  profile,
  values = {},
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  profile: Profile;
  values?: Values;
  submitLabel: string;
}) {
  // Admins can post for anyone; everyone else for all members or their own group.
  const groupOptions = [
    { id: "all", name: "All members" },
    ...GROUPS.filter((g) => profile.role === "admin" || g.id === profile.group_id).map((g) => ({ id: g.id, name: `${g.name} only` })),
  ];

  return (
    <form action={action} className="card space-y-5">
      <div>
        <label className="label" htmlFor="title">Event name</label>
        <input className="input" id="title" name="title" defaultValue={values.title} maxLength={200} required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Day</label>
          <input className="input" id="date" name="date" type="date" defaultValue={values.date} required />
        </div>
        <div>
          <label className="label" htmlFor="time">Time</label>
          <input className="input" id="time" name="time" type="time" step={300} defaultValue={values.time} required />
        </div>
      </div>
      <p className="hint -mt-3">Times are in {SITE_TIMEZONE_LABEL} time.</p>
      <div className="group grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="repeat">Repeats</label>
          <select className="input" id="repeat" name="repeat" defaultValue={values.repeat ?? "none"}>
            {Object.entries(REPEATS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <span className="hint">Repeats on the same weekday (or the same date, for monthly) as the day above.</span>
        </div>
        <div className="group-has-[option[value=none]:checked]:hidden">
          <label className="label" htmlFor="repeat_until">Last day it repeats <span className="font-normal text-muted">(optional)</span></label>
          <input className="input" id="repeat_until" name="repeat_until" type="date" defaultValue={values.repeat_until ?? ""} />
          <span className="hint">Leave empty to keep repeating.</span>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="location">Location</label>
        <input className="input" id="location" name="location" defaultValue={values.location ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="group_id">Who is it for?</label>
        <select className="input" id="group_id" name="group_id" defaultValue={values.group_id ?? (profile.role === "leader" ? profile.group_id : "all")}>
          {groupOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="description">Details</label>
        <textarea className="input min-h-36" id="description" name="description" defaultValue={values.description ?? ""} />
      </div>
      <button className="btn">{submitLabel}</button>
    </form>
  );
}
