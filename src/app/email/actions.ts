"use server";

import { redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmails } from "@/lib/email";
import { getGroup } from "@/lib/groups";

export async function sendBulkEmail(formData: FormData) {
  const { profile } = await requireApproved();
  const audience = String(formData.get("audience") ?? "");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim();

  // Leaders may email their own group; admins may email anyone.
  const allowed =
    profile.role === "admin"
      ? audience === "all" || !!getGroup(audience)
      : profile.role === "leader" && audience === profile.group_id;
  if (!allowed) redirect(`/email?error=${encodeURIComponent("You can't email that group.")}`);
  if (!subject || !body) redirect(`/email?error=${encodeURIComponent("Please add a subject and a message.")}`);

  const db = createAdminClient();
  let query = db
    .from("profiles")
    .select("email, unsubscribe_token")
    .eq("status", "approved")
    .eq("email_announcements", true);
  if (audience !== "all") query = query.eq("group_id", audience);
  const { data: recipients } = await query;

  const sent = await sendEmails(
    (recipients ?? []).map((r) => ({
      to: r.email,
      kind: "announcements" as const,
      unsubscribeToken: r.unsubscribe_token,
      subject,
      text: `${body}\n\n— ${profile.full_name}`,
    })),
  );

  await db.from("email_log").insert({
    sender_id: profile.id,
    audience,
    subject,
    recipient_count: sent,
  });

  redirect(`/email?message=${encodeURIComponent(`Your email was sent to ${sent} ${sent === 1 ? "member" : "members"}.`)}`);
}
