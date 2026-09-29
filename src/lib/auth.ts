import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return { supabase, user, profile };
}

// For pages only approved members may see. Sends everyone else to the
// right place (login, or the waiting-for-approval page).
export async function requireApproved() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login");
  if (!viewer.profile || viewer.profile.status !== "approved") redirect("/pending");
  return { supabase: viewer.supabase, user: viewer.user, profile: viewer.profile };
}

export async function requireAdmin() {
  const viewer = await requireApproved();
  if (viewer.profile.role !== "admin") redirect("/");
  return viewer;
}

export function canManageGroup(profile: Profile, groupId: string | null) {
  if (profile.role === "admin") return true;
  return profile.role === "leader" && groupId !== null && profile.group_id === groupId;
}
