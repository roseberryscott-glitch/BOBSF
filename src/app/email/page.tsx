import { redirect } from "next/navigation";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { GROUPS, groupName } from "@/lib/groups";
import { formatDateTime } from "@/lib/time";
import { sendBulkEmail } from "./actions";

export const metadata = { title: "Email members" };

export default async function EmailPage(props: PageProps<"/email">) {
  const sp = await props.searchParams;
  const { supabase, profile } = await requireApproved();
  if (profile.role === "member") redirect("/");

  const options =
    profile.role === "admin"
      ? [{ id: "all", name: "Everyone" }, ...GROUPS.map((g) => ({ id: g.id, name: `${g.name} members` }))]
      : [{ id: profile.group_id, name: `${groupName(profile.group_id)} members` }];

  const { data: log } = await supabase
    .from("email_log")
    .select("id, audience, subject, recipient_count, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title">Email members</h1>
      <Messages error={sp.error} message={sp.message} />
      <form action={sendBulkEmail} className="card space-y-5">
        <div>
          <label className="label" htmlFor="audience">Send to</label>
          <select className="input" id="audience" name="audience">
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <span className="hint">Members who turned off announcement emails won&apos;t get it.</span>
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input className="input" id="subject" name="subject" maxLength={200} required />
        </div>
        <div>
          <label className="label" htmlFor="body">Message</label>
          <textarea className="input min-h-48" id="body" name="body" required />
          <span className="hint">Your name is added at the end, with a link to stop these emails.</span>
        </div>
        <button className="btn">Send email</button>
      </form>

      {!!log?.length && (
        <section className="mt-10">
          <h2 className="mb-3 text-2xl font-bold">Recently sent</h2>
          <ul className="space-y-2">
            {log.map((l) => (
              <li key={l.id} className="card">
                <strong>{l.subject}</strong>
                <p className="text-muted">
                  {l.audience === "all" ? "Everyone" : groupName(l.audience)} · {l.recipient_count} sent ·{" "}
                  {formatDateTime(l.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
