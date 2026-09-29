import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchBadge } from "@/components/BranchBadge";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { deleteThread, moderateThread, reply, reportPost, setFollowing, setPostHidden } from "../../actions";

export default async function ThreadPage(props: PageProps<"/forums/[forum]/[thread]">) {
  const { forum: forumId, thread: threadId } = await props.params;
  const sp = await props.searchParams;
  const { supabase, profile } = await requireApproved();

  const [{ data: thread }, { data: forum }] = await Promise.all([
    supabase.from("threads").select("*").eq("id", threadId).eq("forum_id", forumId).maybeSingle(),
    supabase.from("forums").select("id, name, group_id").eq("id", forumId).maybeSingle(),
  ]);
  if (!thread || !forum) notFound();

  const [{ data: posts }, { data: follow }] = await Promise.all([
    supabase.from("posts").select("*").eq("thread_id", threadId).order("created_at"),
    supabase.from("thread_followers").select("user_id").eq("thread_id", threadId).eq("user_id", profile.id).maybeSingle(),
  ]);

  const canModerate =
    profile.role === "admin" || (profile.role === "leader" && forum.group_id === profile.group_id);
  const following = !!follow;

  return (
    <div>
      <p className="mb-4"><Link href={`/forums/${forumId}`}>← {forum.name}</Link></p>
      <h1 className="mb-2 text-3xl font-bold">{thread.title}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action={setFollowing.bind(null, forumId, threadId, !following)}>
          <button className="btn-secondary btn-small">
            {following ? "Stop emailing me about this" : "Email me when people reply"}
          </button>
        </form>
        {canModerate && (
          <>
            <form action={moderateThread.bind(null, forumId, threadId, { pinned: !thread.pinned })}>
              <button className="btn-secondary btn-small">{thread.pinned ? "Unpin" : "Pin to top"}</button>
            </form>
            <form action={moderateThread.bind(null, forumId, threadId, { locked: !thread.locked })}>
              <button className="btn-secondary btn-small">{thread.locked ? "Unlock" : "Lock replies"}</button>
            </form>
            <form action={deleteThread.bind(null, forumId, threadId)}>
              <button className="btn-danger btn-small">Delete discussion</button>
            </form>
          </>
        )}
      </div>
      <Messages error={sp.error} message={sp.message} />

      <ol className="space-y-4">
        {(posts ?? []).map((p) => (
          <li key={p.id} id={`post-${p.id}`} className={`card ${p.hidden ? "opacity-60" : ""}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <strong className="text-lg">{p.author_name}</strong>
              {p.author_group && <BranchBadge groupId={p.author_group} size="sm" />}
              <span className="text-muted">{formatDateTime(p.created_at)}</span>
              {p.hidden && <span className="font-semibold text-danger">Hidden by a moderator</span>}
            </div>
            <div className="whitespace-pre-line break-words">{p.body}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {canModerate && (
                <form action={setPostHidden.bind(null, forumId, threadId, p.id, !p.hidden)}>
                  <button className="btn-secondary btn-small">{p.hidden ? "Unhide" : "Hide"}</button>
                </form>
              )}
              {p.author_id !== profile.id && !p.hidden && (
                <form action={reportPost.bind(null, forumId, threadId, p.id)}>
                  <button className="cursor-pointer text-base text-muted underline">Report this post</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ol>

      {thread.locked && !canModerate ? (
        <p className="notice mt-8">This discussion is locked, so no new replies can be added.</p>
      ) : (
        <form action={reply.bind(null, forumId, threadId)} className="card mt-8 space-y-4">
          <label className="label text-xl" htmlFor="body">Write a reply</label>
          <textarea className="input min-h-36" id="body" name="body" required />
          <p className="hint">Everyone following this discussion will get an email.</p>
          <button className="btn">Post reply</button>
        </form>
      )}
    </div>
  );
}
