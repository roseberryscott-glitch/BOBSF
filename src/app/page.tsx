import Link from "next/link";
import { redirect } from "next/navigation";
import { BranchBadge } from "@/components/BranchBadge";
import { Messages } from "@/components/Messages";
import { getViewer } from "@/lib/auth";
import { groupName } from "@/lib/groups";
import { formatDateTime, upcomingCutoffIso } from "@/lib/time";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const { supabase, profile } = await getViewer();

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-8 text-center">
        <h1 className="mb-4 text-4xl font-bold">Band of Brothers Sisters and Friends</h1>
        <p className="mb-8 text-xl">
          A members-only community for veterans of every branch, and the friends who stand with them.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link className="btn" href="/login">Sign in</Link>
          <Link className="btn-secondary" href="/signup">Ask to join</Link>
        </div>
      </div>
    );
  }
  if (profile.status !== "approved") redirect("/pending");

  const [{ data: events }, { data: threads }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, group_id, location")
      .gte("starts_at", upcomingCutoffIso())
      .order("starts_at")
      .limit(5),
    supabase
      .from("threads")
      .select("id, title, forum_id, author_name, last_post_at, forums(name)")
      .order("last_post_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <div>
      <Messages message={sp.message} />
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Welcome, {profile.full_name.split(" ")[0]}</h1>
        <BranchBadge groupId={profile.group_id} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="events-h">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="events-h" className="text-2xl font-bold">Coming up</h2>
            <Link href="/events">Full calendar</Link>
          </div>
          {events?.length ? (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="card">
                  <Link href={`/events/${e.id}`} className="text-xl font-semibold">{e.title}</Link>
                  <p>{formatDateTime(e.starts_at)}</p>
                  <p className="text-muted">
                    {e.location ? `${e.location} · ` : ""}
                    {e.group_id ? groupName(e.group_id) : "All members"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card">No upcoming events yet.</p>
          )}
        </section>

        <section aria-labelledby="threads-h">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="threads-h" className="text-2xl font-bold">Latest discussions</h2>
            <Link href="/forums">All forums</Link>
          </div>
          {threads?.length ? (
            <ul className="space-y-3">
              {threads.map((t) => (
                <li key={t.id} className="card">
                  <Link href={`/forums/${t.forum_id}/${t.id}`} className="text-xl font-semibold">{t.title}</Link>
                  <p className="text-muted">
                    {(t.forums as unknown as { name: string } | null)?.name} · started by {t.author_name}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card">No discussions yet. Start the first one!</p>
          )}
        </section>
      </div>
    </div>
  );
}
