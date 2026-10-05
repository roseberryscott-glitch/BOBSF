import type { Profile } from "@/lib/types";
import { GROUPS } from "@/lib/groups";
import { SITE_TIMEZONE } from "@/lib/time";

type Values = {
  title?: string;
  description?: string | null;
  location?: string | null;
  starts_at?: string;
  ends_at?: string;
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
          <label className="label" htmlFor="starts_at">Starts</label>
          <input className="input" id="starts_at" name="starts_at" type="datetime-local" defaultValue={values.starts_at} required />
        </div>
        <div>
          <label className="label" htmlFor="ends_at">Ends (optional)</label>
          <input className="input" id="ends_at" name="ends_at" type="datetime-local" defaultValue={values.ends_at} />
        </div>
      </div>
      <p className="hint -mt-3">Times are in {SITE_TIMEZONE.replace("_", " ")} time.</p>
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
