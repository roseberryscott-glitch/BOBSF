"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";
import { GROUPS } from "@/lib/groups";
import { notifyAdminsOfSignup } from "@/lib/notify";

function fail(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  const serviceYears = String(formData.get("service_years") ?? "").trim();
  const verificationNote = String(formData.get("verification_note") ?? "").trim();
  const consent = formData.get("consent") === "on";

  if (!fullName) fail("Please enter your name.");
  if (!GROUPS.some((g) => g.id === groupId)) fail("Please choose your branch, or Friends.");
  if (password.length < 10) fail("Please use a password of at least 10 characters.");
  if (!consent) fail("Please check the box to agree before joining.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl("/auth/confirm?next=/pending"),
      data: {
        full_name: fullName,
        group_id: groupId,
        service_years: serviceYears,
        verification_note: verificationNote,
        consent: "true",
      },
    },
  });
  if (error) fail(error.message);

  after(() => notifyAdminsOfSignup(fullName, groupId));
  redirect(
    `/pending?message=${encodeURIComponent("Thanks! Please check your email and click the link to confirm your address.")}`,
  );
}
