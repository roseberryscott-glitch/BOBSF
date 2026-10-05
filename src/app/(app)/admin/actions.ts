"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyStatusChange } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// The database functions check the caller is an admin too.

export async function setStatus(memberId: string, status: "approved" | "rejected" | "suspended") {
  const { supabase } = await requireAdmin();
  const { data: before } = await supabase.from("profiles").select("status").eq("id", memberId).single();
  const { error } = await supabase.rpc("admin_set_status", { member: memberId, new_status: status });
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  if (before?.status === "pending" && (status === "approved" || status === "rejected")) {
    after(() => notifyStatusChange(memberId, status));
  }
  revalidatePath("/admin");
}

export async function setRole(memberId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_role", {
    member: memberId,
    new_role: String(formData.get("role")),
    new_group: String(formData.get("group_id")),
  });
  if (error) redirect(`/admin?tab=members&error=${encodeURIComponent(error.message)}`);

  const since = Number(formData.get("member_since"));
  const { error: sinceError } = await supabase.rpc("admin_set_member_since", {
    member: memberId,
    since: Number.isInteger(since) && since >= 1900 && since <= 2200 ? since : null,
  });
  if (sinceError) redirect(`/admin?tab=members&error=${encodeURIComponent(sinceError.message)}`);
  revalidatePath("/admin");
  redirect(`/admin?tab=members&message=${encodeURIComponent("Saved.")}`);
}

export async function resolveReport(reportId: number) {
  const { supabase } = await requireAdmin();
  await supabase.from("post_reports").update({ resolved: true }).eq("id", reportId);
  revalidatePath("/admin");
}

// Permanently erases a member's account and personal info. Their forum posts
// stay, shown as "a former member".
export async function deleteMember(memberId: string, formData: FormData) {
  const { profile: me } = await requireAdmin();
  const back = "/admin?tab=members";
  if (memberId === me.id) {
    redirect(`${back}&error=${encodeURIComponent("To delete your own account, use the button on your profile.")}`);
  }
  if (formData.get("confirm") !== "DELETE") {
    redirect(`${back}&error=${encodeURIComponent("Type DELETE in the box to confirm.")}`);
  }

  const admin = createAdminClient();
  const { data: member } = await admin.from("profiles").select("full_name, photo_path").eq("id", memberId).single();
  if (!member) redirect(`${back}&error=${encodeURIComponent("That member no longer exists.")}`);
  if (member.photo_path) await admin.storage.from("avatars").remove([member.photo_path]);
  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) redirect(`${back}&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/", "layout");
  redirect(`${back}&message=${encodeURIComponent(`${member.full_name} has been deleted.`)}`);
}

// Takes a business off Support Members. The member can list it again from
// their profile.
export async function removeBusiness(memberId: string) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      is_business_owner: false,
      business_name: null,
      business_website: null,
      business_phone: null,
      business_description: null,
    })
    .eq("id", memberId);
  if (error) redirect(`/support?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(`/support?message=${encodeURIComponent("The business has been removed from Support Members.")}`);
}
