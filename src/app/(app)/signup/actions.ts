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
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 80);
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 80);
  const fullName = `${firstName} ${lastName}`.trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  const verificationNote = String(formData.get("verification_note") ?? "").trim();
  const consent = formData.get("consent") === "on";

  if (!firstName || !lastName) fail("Please enter your first and last name.");
  if (!GROUPS.some((g) => g.id === groupId)) fail("Please choose your branch, or Friends.");
  if (password.length < 10) fail("Please use a password of at least 10 characters.");
  if (!consent) fail("Please check the box to agree before joining.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl("/auth/confirm?next=/pending"),
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        group_id: groupId,
        verification_note: verificationNote,
        consent: "true",
      },
    },
  });
  if (error) fail(error.message);

  after(() => notifyAdminsOfSignup(fullName, groupId));
  // With email confirmation turned off in Supabase there's a session already.
  redirect(
    `/pending?message=${encodeURIComponent(
      data.session
        ? "Thanks! Your registration has been sent to the admins."
        : "Thanks! Please check your email and click the link to confirm your address.",
    )}`,
  );
}
