import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchLogo } from "@/components/BranchLogo";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { getBranchLogos } from "@/lib/site";
import { formatDateTime } from "@/lib/time";
import { createThread } from "../actions";

export default async function ForumPage(props: PageProps<"/forums/[forum]">) {
  const { forum: forumId } = await props.params;
  const sp = await props.searchParams;
  const { supabase } = await requireApproved();

  const { data: forum } = await supabase.from("forums").select("*").eq("id", forumId).maybeSingle();
  if (!forum) notFound();

  const { data: threads } = await supabase
    .from("threads")
    .select("id, title, author_name, pinned, locked, last_post_at, posts(count)")
    .eq("forum_id", forumId)
    .order("pinned", { ascending: false })
    .order("last_post_at", { ascending: false });

  return (
    <div>
      <p className="mb-4"><Link href="/forums">← All forums</Link></p>
      <div className="mb-8 flex flex-wrap items-center gap-5">
        {forum.group_id && <BranchLogo groupId={forum.group_id} logos={await getBranchLogos(supabase)} size={80} />}
        <div>
          <h1 className="page-title mb-1">{forum.name}</h1>
          <p className="text-muted">{forum.description}</p>
        </div>
      </div>
      <Messages error={sp.error} />

      {threads?.length ? (
        <ul className="mb-10 space-y-3">
          {threads.map((t) => {
            const replies = Math.max(0, ((t.posts as unknown as { count: number }[])[0]?.count ?? 1) - 1);
            return (
              <li key={t.id} className="card">
                <Link href={`/forums/${forumId}/${t.id}`} className="text-xl font-semibold">
                  {t.pinned && "📌 "}
                  {t.title}
                </Link>
                <p className="text-muted">
                  Started by {t.author_name} · {replies} {replies === 1 ? "reply" : "replies"} · last activity{" "}
                  {formatDateTime(t.last_post_at)}
                  {t.locked && " · locked"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card mb-10">No discussions yet. Be the first to start one.</p>
      )}

      <section aria-labelledby="new-h" className="card">
        <h2 id="new-h" className="mb-4 text-2xl font-bold">Start a discussion</h2>
        <form action={createThread.bind(null, forumId)} className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input className="input" id="title" name="title" maxLength={200} required />
          </div>
          <div>
            <label className="label" htmlFor="body">Message</label>
            <textarea className="input min-h-40" id="body" name="body" required />
          </div>
          <button className="btn">Post discussion</button>
        </form>
      </section>
    </div>
  );
}
