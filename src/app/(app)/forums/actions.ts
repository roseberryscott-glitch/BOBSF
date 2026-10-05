"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";
import { notifyNewPost } from "@/lib/notify";

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createThread(forumId: string, formData: FormData) {
  const { supabase } = await requireApproved();
  const title = field(formData, "title").slice(0, 200);
  const body = field(formData, "body");
  if (!title || !body) {
    redirect(`/forums/${forumId}?error=${encodeURIComponent("Please add a title and a message.")}`);
  }

  // Author name and access are enforced by the database.
  const { data: thread, error } = await supabase
    .from("threads")
    .insert({ forum_id: forumId, title })
    .select("id")
    .single();
  if (error || !thread) {
    redirect(`/forums/${forumId}?error=${encodeURIComponent("You can't post in this forum.")}`);
  }
  await supabase.from("posts").insert({ thread_id: thread.id, body });

  revalidatePath(`/forums/${forumId}`);
  redirect(`/forums/${forumId}/${thread.id}`);
}

export async function reply(forumId: string, threadId: string, formData: FormData) {
  const { supabase } = await requireApproved();
  const body = field(formData, "body");
  const back = `/forums/${forumId}/${threadId}`;
  if (!body) redirect(`${back}?error=${encodeURIComponent("Please write a message first.")}`);

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ thread_id: threadId, body })
    .select("id")
    .single();
  if (error || !post) redirect(`${back}?error=${encodeURIComponent("This discussion is locked.")}`);

  after(() => notifyNewPost(post.id));
  revalidatePath(back);
  redirect(`${back}#post-${post.id}`);
}

export async function setFollowing(forumId: string, threadId: string, follow: boolean) {
  const { supabase, profile } = await requireApproved();
  if (follow) {
    await supabase.from("thread_followers").insert({ thread_id: threadId, user_id: profile.id });
  } else {
    await supabase.from("thread_followers").delete().eq("thread_id", threadId).eq("user_id", profile.id);
  }
  revalidatePath(`/forums/${forumId}/${threadId}`);
}

// Moderation. The database only lets admins and that group's leader do these.
export async function moderateThread(
  forumId: string,
  threadId: string,
  change: { pinned?: boolean; locked?: boolean },
) {
  const { supabase } = await requireApproved();
  await supabase.from("threads").update(change).eq("id", threadId);
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/${threadId}`);
}

export async function deleteThread(forumId: string, threadId: string) {
  const { supabase } = await requireApproved();
  await supabase.from("threads").delete().eq("id", threadId);
  revalidatePath(`/forums/${forumId}`);
  redirect(`/forums/${forumId}`);
}

export async function setPostHidden(forumId: string, threadId: string, postId: string, hidden: boolean) {
  const { supabase } = await requireApproved();
  await supabase.from("posts").update({ hidden }).eq("id", postId);
  revalidatePath(`/forums/${forumId}/${threadId}`);
}

export async function reportPost(forumId: string, threadId: string, postId: string) {
  const { supabase, profile } = await requireApproved();
  await supabase.from("post_reports").insert({ post_id: postId, reporter_id: profile.id });
  redirect(
    `/forums/${forumId}/${threadId}?message=${encodeURIComponent("Thanks. An admin will take a look at that post.")}`,
  );
}
