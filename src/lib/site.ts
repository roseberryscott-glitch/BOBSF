import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BranchLogos, SitePage } from "@/lib/content";

export async function getPage(supabase: SupabaseClient, slug: string) {
  const { data } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle();
  return data as SitePage | null;
}

export async function getMenuPages(supabase: SupabaseClient) {
  const { data } = await supabase.from("site_pages").select("slug, title, visible").order("slug");
  return (data ?? []) as Pick<SitePage, "slug" | "title" | "visible">[];
}

export async function getBranchLogos(supabase: SupabaseClient): Promise<BranchLogos> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "branch_logos").maybeSingle();
  return (data?.value as BranchLogos) ?? {};
}
