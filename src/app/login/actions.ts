"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("That email and password didn't match. Please try again.")}`);
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function sendPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl("/auth/confirm") });
  // Same message either way, so this can't be used to check who's a member.
  redirect(`/forgot?message=${encodeURIComponent("If that email belongs to a member, a reset link is on its way.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) {
    redirect(`/reset-password?error=${encodeURIComponent("Please use at least 10 characters.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect(`/?message=${encodeURIComponent("Your password has been changed.")}`);
}
