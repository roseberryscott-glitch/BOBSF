"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const text = (fd: FormData, k: string, max = 2000) =>
  String(fd.get(k) ?? "").trim().slice(0, max) || null;

function birthDate(fd: FormData) {
  const v = String(fd.get("date_of_birth") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1900 || d > new Date()) return null;
  return v;
}

function website(fd: FormData) {
  const v = text(fd, "business_website", 300);
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export async function saveProfile(formData: FormData) {
  const { supabase, profile } = await requireApproved({ allowIncompleteProfile: true });
  const nameVisibility = formData.get("name_visibility") === "all" ? "all" : "group";
  const contactVisibility = formData.get("contact_visibility") === "all" ? "all" : "leaders";
  const firstName = text(formData, "first_name", 80);
  const lastName = text(formData, "last_name", 80);
  if (!firstName || !lastName) {
    redirect(`/profile?error=${encodeURIComponent("Please enter your first and last name.")}`);
  }

  const thisYear = new Date().getFullYear();
  const year = Number(formData.get("joined_year"));
  const memberSince =
    formData.get("joined") === "year" && Number.isInteger(year) && year >= 1950 && year <= thisYear
      ? year
      : formData.get("joined") === "new"
        ? thisYear
        : profile.member_since;
  const businessOwner = formData.get("is_business_owner") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      date_of_birth: birthDate(formData),
      member_since: memberSince,
      service_years: text(formData, "service_years", 60),
      bio: text(formData, "bio", 4000),
      phone: text(formData, "phone", 40),
      address_line1: text(formData, "address_line1", 200),
      address_line2: text(formData, "address_line2", 200),
      city: text(formData, "city", 120),
      state: text(formData, "state", 30),
      postal_code: text(formData, "postal_code", 10),
      job_title: text(formData, "job_title", 120),
      retired: formData.get("retired") === "on",
      is_business_owner: businessOwner,
      business_name: businessOwner ? text(formData, "business_name", 160) : null,
      business_website: businessOwner ? website(formData) : null,
      business_phone: businessOwner ? text(formData, "business_phone", 40) : null,
      business_description: businessOwner ? text(formData, "business_description", 2000) : null,
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
