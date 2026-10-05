"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { BranchLogos, Section } from "@/lib/content";
import { GROUPS } from "@/lib/groups";

const SECTION_TYPES = new Set(["hero", "text", "cards", "people", "links", "image", "cta", "branches"]);

export async function savePage(
  slug: string,
  page: { title: string; visible: boolean; is_public: boolean; sections: Section[] },
) {
  const { supabase, profile } = await requireAdmin();

  if (!Array.isArray(page.sections) || page.sections.some((s) => !SECTION_TYPES.has(s?.type))) {
    return { error: "Something in this page couldn't be saved. Please reload and try again." };
  }
  if (JSON.stringify(page.sections).length > 500_000) {
    return { error: "This page is too large to save." };
  }

  const { data, error } = await supabase
    .from("site_pages")
    .update({
      title: String(page.title).slice(0, 120) || slug,
      // The welcome page can't be hidden or made members-only.
      visible: slug === "home" ? true : !!page.visible,
      is_public: slug === "home" ? true : !!page.is_public,
      sections: page.sections,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("slug", slug)
    .select("slug");
  if (error || !data?.length) return { error: error?.message ?? "You can't edit this page." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBranchLogos(logos: BranchLogos) {
  const { supabase } = await requireAdmin();
  const clean: BranchLogos = {};
  for (const g of GROUPS) {
    const url = logos[g.id];
    if (typeof url === "string" && /^https:\/\//.test(url)) clean[g.id] = url;
  }
  const { error } = await supabase
    .from("site_settings")
    .update({ value: clean, updated_at: new Date().toISOString() })
    .eq("key", "branch_logos");
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
