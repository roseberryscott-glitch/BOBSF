import { CalendarDays, MessagesSquare, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BranchLogo } from "@/components/BranchLogo";
import { Messages } from "@/components/Messages";
import { Watermark } from "@/components/Watermark";
import { PageView } from "@/components/cms/PageView";
import { getViewer } from "@/lib/auth";
import { getGroup, groupName } from "@/lib/groups";
import { getBranchLogos, getPage } from "@/lib/site";
import { dayParts, formatTime, upcomingCutoffIso } from "@/lib/time";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const { supabase, profile } = await getViewer();
  const logos = await getBranchLogos(supabase);

  // Visitors see the public welcome page, which admins edit at /welcome.
  if (!profile) {
    const page = await getPage(supabase, "home");
    return (
      <>
        <div className="mx-auto max-w-5xl px-4">
          <Messages message={sp.message} />
        </div>
        {page ? <PageView page={page} isAdmin={false} logos={logos} watermark /> : null}
      </>
    );
  }
  if (profile.status !== "approved") redirect("/pending");
  if (profile.profile_completed_at === null) redirect("/profile?welcome=1");

  const [{ data: events }, { data: threads }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, group_id, location")
      .gte("starts_at", upcomingCutoffIso())
      .order("starts_at")
      .limit(4),
    supabase
      .from("threads")
      .select("id, title, forum_id, author_name, last_post_at, forums(name)")
      .order("last_post_at", { ascending: false })
      .limit(5),
  ]);
  const group = getGroup(profile.group_id);

  return (
    <>
      <section className="hero-bg relative isolate overflow-hidden text-white">
        <Watermark />
        <div className="stars absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-4 py-12">
          <BranchLogo groupId={profile.group_id} logos={logos} size={96} />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">{group?.name}</p>
            <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">
              Welcome back, {profile.full_name.split(" ")[0]}
            </h1>
            {profile.member_since && <p className="mt-1 text-slate-300">Member since {profile.member_since}</p>}
          </div>
        </div>
        <div className="flag-stripe" aria-hidden="true" />
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <Messages message={sp.message} />

        <nav aria-label="Quick links" className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/events", label: "Calendar", icon: CalendarDays, text: "Upcoming events and RSVPs" },
            { href: "/forums", label: "Forums", icon: MessagesSquare, text: "Talk with your branch and everyone" },
            { href: `/members?group=${profile.group_id}`, label: "Members", icon: Users, text: `Your ${group?.name ?? ""} family` },
          ].map(({ href, label, icon: Icon, text }) => (
            <Link key={href} href={href} className="lift-card flex items-center gap-4 p-5 no-underline">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-gold">
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="font-display block text-xl font-bold uppercase text-navy">{label}</span>
                <span className="text-base text-slate-600">{text}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="grid gap-10 md:grid-cols-2">
          <section aria-labelledby="events-h">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="events-h" className="section-title text-3xl">Coming up</h2>
              <Link href="/events">Full calendar</Link>
            </div>
            {events?.length ? (
              <ul className="space-y-3">
                {events.map((e) => {
                  const d = dayParts(e.starts_at);
                  return (
                    <li key={e.id}>
                      <Link href={`/events/${e.id}`} className="lift-card flex gap-4 p-4 no-underline">
                        <span className="w-14 shrink-0 rounded-lg bg-navy py-1.5 text-center text-white" aria-hidden="true">
                          <span className="block text-xs uppercase text-gold">{d.month}</span>
                          <span className="font-display block text-2xl font-bold">{d.day}</span>
                        </span>
                        <span>
                          <span className="block text-lg font-semibold text-navy">{e.title}</span>
                          <span className="block text-base text-slate-600">
                            {d.weekday} {formatTime(e.starts_at)} · {e.group_id ? groupName(e.group_id) : "All members"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lift-card p-5 text-slate-600">No upcoming events yet.</p>
            )}
          </section>

          <section aria-labelledby="threads-h">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="threads-h" className="section-title text-3xl">Latest talk</h2>
              <Link href="/forums">All forums</Link>
            </div>
            {threads?.length ? (
              <ul className="space-y-3">
                {threads.map((t) => (
                  <li key={t.id}>
                    <Link href={`/forums/${t.forum_id}/${t.id}`} className="lift-card block p-4 no-underline">
                      <span className="block text-lg font-semibold text-navy">{t.title}</span>
                      <span className="block text-base text-slate-600">
                        {(t.forums as unknown as { name: string } | null)?.name} · started by {t.author_name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lift-card p-5 text-slate-600">No discussions yet. Start the first one!</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
