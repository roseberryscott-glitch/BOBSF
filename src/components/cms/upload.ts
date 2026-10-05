import { createClient } from "@/lib/supabase/browser";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// Uploads a picture for site pages (admins only) and returns its public URL.
export async function uploadSiteImage(file: File, folder: string): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Please use a JPG, PNG, WebP, GIF or SVG picture.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Please use a picture under 10 MB.");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}
