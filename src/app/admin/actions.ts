"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyStatusChange } from "@/lib/notify";

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
  revalidatePath("/admin");
  redirect(`/admin?tab=members&message=${encodeURIComponent("Saved.")}`);
}

export async function resolveReport(reportId: number) {
  const { supabase } = await requireAdmin();
  await supabase.from("post_reports").update({ resolved: true }).eq("id", reportId);
  revalidatePath("/admin");
}
