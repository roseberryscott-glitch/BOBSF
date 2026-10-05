"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const text = (fd: FormData, k: string, max = 2000) =>
  String(fd.get(k) ?? "").trim().slice(0, max) || null;

export async function saveProfile(formData: FormData) {
  const { supabase, profile } = await requireApproved({ allowIncompleteProfile: true });
  const nameVisibility = formData.get("name_visibility") === "all" ? "all" : "group";
  const contact = String(formData.get("contact_visibility"));
  const contactVisibility = ["leaders", "group", "all"].includes(contact) ? contact : "leaders";

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: text(formData, "full_name", 120) ?? profile.full_name,
      service_years: text(formData, "service_years", 60),
      city: text(formData, "city", 120),
      phone: text(formData, "phone", 40),
      bio: text(formData, "bio", 2000),
      name_visibility: nameVisibility,
      contact_visibility: contactVisibility,
      email_forum: formData.get("email_forum") === "on",
      email_announcements: formData.get("email_announcements") === "on",
      profile_completed_at: profile.profile_completed_at ?? new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  if (!profile.profile_completed_at) {
    redirect(`/?message=${encodeURIComponent("Welcome aboard! Your member profile is saved.")}`);
  }
  redirect(`/profile?message=${encodeURIComponent("Your profile has been saved.")}`);
}

// The browser uploads the file straight to storage (see PhotoUpload), which
// avoids hosting request-size limits; this just records the new path.
export async function setPhoto(path: string) {
  const { supabase, profile } = await requireApproved({ allowIncompleteProfile: true });
  if (!path.startsWith(`${profile.id}/`)) throw new Error("Invalid photo path");

  if (profile.photo_path && profile.photo_path !== path) {
    await supabase.storage.from("avatars").remove([profile.photo_path]);
  }
  await supabase.from("profiles").update({ photo_path: path }).eq("id", profile.id);
  revalidatePath("/", "layout");
}

export async function removePhoto() {
  const { supabase, profile } = await requireApproved({ allowIncompleteProfile: true });
  if (profile.photo_path) {
    await supabase.storage.from("avatars").remove([profile.photo_path]);
    await supabase.from("profiles").update({ photo_path: null }).eq("id", profile.id);
  }
  revalidatePath("/", "layout");
  redirect(`/profile?message=${encodeURIComponent("Your photo has been removed.")}`);
}

// Required by the app stores: members can delete their own account.
export async function deleteAccount(formData: FormData) {
  const { supabase, profile } = await requireApproved({ allowIncompleteProfile: true });
  if (formData.get("confirm") !== "DELETE") {
    redirect(`/profile?error=${encodeURIComponent('Type DELETE in the box to confirm.')}`);
  }
  if (profile.role === "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved")
      .neq("id", profile.id);
    if (!count) redirect(`/profile?error=${encodeURIComponent("Make someone else an admin before deleting the last admin account.")}`);
  }

  const admin = createAdminClient();
  if (profile.photo_path) await admin.storage.from("avatars").remove([profile.photo_path]);
  await admin.auth.admin.deleteUser(profile.id);
  await supabase.auth.signOut();
  redirect("/?message=" + encodeURIComponent("Your account has been deleted."));
}
