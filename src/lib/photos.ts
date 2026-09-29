import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Profile photos are in a private bucket; hand out short-lived links.
export async function signPhotos(supabase: SupabaseClient, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(unique, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
