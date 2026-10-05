import Link from "next/link";
import { BranchBadge } from "@/components/BranchBadge";
import { Messages } from "@/components/Messages";
import { requireAdmin } from "@/lib/auth";
import { PAGE_ROUTES } from "@/lib/content";
import { GROUPS } from "@/lib/groups";
import { getBranchLogos } from "@/lib/site";
import { formatDateTime } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { resolveReport, setRole, setStatus } from "./actions";
import { BranchLogoEditor } from "./BranchLogoEditor";

export const metadata = { title: "Admin" };

const TABS = [
  { id: "pending", label: "Registrations" },
  { id: "members", label: "Members" },
  { id: "reports", label: "Reported posts" },
  { id: "pages", label: "Pages" },
  { id: "logos", label: "Branch logos" },
];

export default async function AdminPage(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.id === sp.tab) ? sp.tab : "pending";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { supabase, profile: me } = await requireAdmin();

  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div>
      <h1 className="page-title">Admin</h1>
      <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={t.id === tab ? "btn btn-small" : "btn-secondary btn-small"}
          >
            {t.label}
            {t.id === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </nav>
      <Messages error={sp.error} message={sp.message} />
      {tab === "pending" && <Pending />}
      {tab === "members" && <Members q={q} meId={me.id} />}
      {tab === "reports" && <Reports />}
      {tab === "pages" && <Pages />}
      {tab === "logos" && <BranchLogoEditor initial={await getBranchLogos(supabase)} />}
    </div>
  );

  async function Pending() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at");
    const pending = (data ?? []) as Profile[];
    if (!pending.length) return <p className="card">No registrations waiting.</p>;
    return (
      <ul className="space-y-4">
        {pending.map((p) => (
          <li key={p.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-xl">{p.full_name}</strong>
              <BranchBadge groupId={p.group_id} size="sm" />
            </div>
            <p className="break-all">{p.email}</p>
            {p.service_years && <p>Service: {p.service_years}</p>}
            <p>
              <span className="font-semibold">How to verify:</span>{" "}
              {p.verification_note || <span className="text-muted">nothing provided</span>}
            </p>
            <p className="text-muted">Registered {formatDateTime(p.created_at)}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <form action={setStatus.bind(null, p.id, "approved")}>
                <button className="btn btn-small">Approve</button>
              </form>
              <form action={setStatus.bind(null, p.id, "rejected")}>
                <button className="btn-secondary btn-small">Decline</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  async function Members({ q, meId }: { q: string; meId: string }) {
    let query = supabase.from("profiles").select("*").neq("status", "pending").order("full_name");
    if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
    const { data } = await query;
    const members = (data ?? []) as Profile[];
    return (
      <div>
        <form className="mb-6 flex flex-wrap gap-3" action="/admin">
          <input type="hidden" name="tab" value="members" />
          <label className="sr-only" htmlFor="q">Search members</label>
          <input className="input max-w-sm" id="q" name="q" defaultValue={q} placeholder="Search by name or email" />
          <button className="btn-secondary">Search</button>
        </form>
        <ul className="space-y-3">
          {members.map((p) => (
            <li key={p.id} className="card">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <strong className="text-lg">{p.full_name}</strong>
                <BranchBadge groupId={p.group_id} size="sm" />
                <span className="break-all text-muted">{p.email}</span>
                {p.status !== "approved" && <span className="font-semibold text-danger">{p.status}</span>}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <form action={setRole.bind(null, p.id)} className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="label text-base" htmlFor={`role-${p.id}`}>Role</label>
                    <select className="input" id={`role-${p.id}`} name="role" defaultValue={p.role}>
                      <option value="member">Member</option>
                      <option value="leader">Group leader</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-base" htmlFor={`group-${p.id}`}>Group</label>
                    <select className="input" id={`group-${p.id}`} name="group_id" defaultValue={p.group_id}>
                      {GROUPS.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-base" htmlFor={`since-${p.id}`}>Member since</label>
                    <input
                      className="input w-28"
                      id={`since-${p.id}`}
                      name="member_since"
                      type="number"
                      min={1900}
                      max={2200}
                      defaultValue={p.member_since ?? ""}
                    />
                  </div>
                  <button className="btn-secondary btn-small">Save</button>
                </form>
                {p.id !== meId &&
                  (p.status === "approved" ? (
                    <form action={setStatus.bind(null, p.id, "suspended")}>
                      <button className="btn-danger btn-small">Suspend</button>
                    </form>
                  ) : (
                    <form action={setStatus.bind(null, p.id, "approved")}>
                      <button className="btn btn-small">Restore access</button>
                    </form>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function Pages() {
    const { data } = await supabase.from("site_pages").select("slug, title, visible, is_public, updated_at").order("slug");
    return (
      <div>
        <p className="mb-4">
          Open a page and click <strong>Edit this page</strong> to change its words, pictures and links.
        </p>
        <ul className="space-y-3">
          {(data ?? []).map((pg) => (
            <li key={pg.slug} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={PAGE_ROUTES[pg.slug] ?? "/"} className="text-xl font-semibold">{pg.title}</Link>
                <p className="text-muted">
                  {pg.visible ? "Shown" : "Hidden"} · {pg.is_public ? "anyone can see it" : "members only"} · last
                  changed {formatDateTime(pg.updated_at)}
                </p>
              </div>
              <Link className="btn-secondary btn-small" href={PAGE_ROUTES[pg.slug] ?? "/"}>Open and edit</Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function Reports() {
    const { data } = await supabase
      .from("post_reports")
      .select("id, created_at, posts(id, body, author_name, thread_id, threads(forum_id, title))")
      .eq("resolved", false)
      .order("created_at");
    if (!data?.length) return <p className="card">No reported posts.</p>;
    return (
      <ul className="space-y-4">
        {data.map((r) => {
          const post = r.posts as unknown as {
            id: string; body: string; author_name: string; thread_id: string;
            threads: { forum_id: string; title: string };
          } | null;
          return (
            <li key={r.id} className="card space-y-2">
              {post ? (
                <>
                  <p>
                    <strong>{post.author_name}</strong> in{" "}
                    <Link href={`/forums/${post.threads.forum_id}/${post.thread_id}#post-${post.id}`}>{post.threads.title}</Link>
                  </p>
                  <p className="whitespace-pre-line">{post.body.slice(0, 500)}</p>
                </>
              ) : (
                <p className="text-muted">This post was deleted.</p>
              )}
              <p className="text-muted">Reported {formatDateTime(r.created_at)}</p>
              <form action={resolveReport.bind(null, r.id)}>
                <button className="btn-secondary btn-small">Mark as handled</button>
              </form>
            </li>
          );
        })}
      </ul>
    );
  }
}
