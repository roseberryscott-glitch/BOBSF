import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmails, siteUrl } from "@/lib/email";
import { groupName } from "@/lib/groups";
import { formatDateTime } from "@/lib/time";

// All notifications go through here. When the phone apps exist, push
// notifications for new threads and events get added in this file.

export async function notifyNewPost(postId: string) {
  const db = createAdminClient();
  const { data: post } = await db
    .from("posts")
    .select("id, body, author_id, author_name, thread_id, threads(id, title, forum_id)")
    .eq("id", postId)
    .single();
  if (!post) return;
  const thread = post.threads as unknown as { id: string; title: string; forum_id: string };

  const { data: followers } = await db
    .from("thread_followers")
    .select("profiles(id, email, status, email_forum, unsubscribe_token)")
    .eq("thread_id", post.thread_id);

  const url = siteUrl(`/forums/${thread.forum_id}/${thread.id}`);
  const excerpt = post.body.length > 600 ? post.body.slice(0, 600) + "…" : post.body;

  const emails = (followers ?? [])
    .map((f) => f.profiles as unknown as {
      id: string; email: string; status: string; email_forum: boolean; unsubscribe_token: string;
    })
    .filter((p) => p && p.id !== post.author_id && p.status === "approved" && p.email_forum)
    .map((p) => ({
      to: p.email,
      kind: "forum" as const,
      unsubscribeToken: p.unsubscribe_token,
      subject: `New reply: ${thread.title}`,
      text: `${post.author_name} wrote in "${thread.title}":\n\n${excerpt}\n\nRead and reply: ${url}\n\nYou're getting this because you follow this discussion. You can unfollow it on that page.`,
    }));

  await sendEmails(emails);
}

export async function notifyAdminsOfSignup(fullName: string, groupId: string) {
  const db = createAdminClient();
  const { data: admins } = await db
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("status", "approved");

  await sendEmails(
    (admins ?? []).map((a) => ({
      to: a.email,
      kind: "account" as const,
      subject: `New BOBSF registration: ${fullName}`,
      text: `${fullName} (${groupName(groupId)}) has asked to join BOBSF.\n\nReview it here: ${siteUrl("/admin")}`,
    })),
  );
}

export async function notifyStatusChange(memberId: string, status: "approved" | "rejected") {
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("email, full_name").eq("id", memberId).single();
  if (!p) return;

  const text =
    status === "approved"
      ? `Welcome to Band of Brothers Sisters and Friends, ${p.full_name}!\n\nYour membership has been approved. Sign in here: ${siteUrl("/login")}\n\nTake a minute to set up your profile and choose what other members can see.`
      : `Hello ${p.full_name},\n\nThank you for your interest in BOBSF. We weren't able to approve your registration. If you think this is a mistake, please reply to an admin you know.`;

  await sendEmails([
    {
      to: p.email,
      kind: "account",
      subject: status === "approved" ? "Your BOBSF membership is approved" : "Your BOBSF registration",
      text,
    },
  ]);
}

export async function notifyAdminsOfEvent(eventId: string) {
  const db = createAdminClient();
  const [{ data: e }, { data: admins }] = await Promise.all([
    db.from("events").select("title, starts_at, profiles!events_created_by_fkey(full_name)").eq("id", eventId).single(),
    db.from("profiles").select("email").eq("role", "admin").eq("status", "approved"),
  ]);
  if (!e) return;
  const by = (e.profiles as unknown as { full_name: string } | null)?.full_name ?? "A member";
  await sendEmails(
    (admins ?? []).map((a) => ({
      to: a.email,
      kind: "account" as const,
      subject: `Event to approve: ${e.title}`,
      text: `${by} suggested an event for the calendar: "${e.title}" on ${formatDateTime(e.starts_at)}.\n\nApprove or decline it here: ${siteUrl("/admin?tab=events")}`,
    })),
  );
}

export async function notifyEventDecision(eventId: string) {
  const db = createAdminClient();
  const { data: e } = await db
    .from("events")
    .select("id, title, status, decline_reason, profiles!events_created_by_fkey(email, full_name)")
    .eq("id", eventId)
    .single();
  const p = e?.profiles as unknown as { email: string; full_name: string } | null;
  if (!e || !p) return;
  const approved = e.status === "approved";
  await sendEmails([
    {
      to: p.email,
      kind: "account",
      subject: approved ? `Your event is on the calendar: ${e.title}` : `Your event suggestion: ${e.title}`,
      text: approved
        ? `Good news, ${p.full_name}: "${e.title}" was approved and is on the BOBSF calendar.\n\n${siteUrl(`/events/${e.id}`)}`
        : `Hello ${p.full_name},\n\nYour event suggestion "${e.title}" wasn't approved for the calendar.${e.decline_reason ? `\n\nThe admin's note: ${e.decline_reason}` : ""}`,
    },
  ]);
}
