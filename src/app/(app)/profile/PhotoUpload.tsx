"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { setPhoto } from "./actions";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function PhotoUpload({ userId }: { userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    if (!file) return setStatus("Please choose a photo first.");
    const ext = TYPES[file.type];
    if (!ext) return setStatus("Please use a JPG, PNG or WebP photo.");
    if (file.size > 10 * 1024 * 1024) return setStatus("Please use a photo under 10 MB.");

    setBusy(true);
    setStatus("Uploading…");
    const path = `${userId}/photo-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return setStatus(`Upload failed: ${error.message}`);
    }
    await setPhoto(path);
    setBusy(false);
    setStatus("Your photo has been updated.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="label" htmlFor="photo">Choose a photo (JPG or PNG)</label>
      <input id="photo" name="photo" type="file"
        accept="image/jpeg,image/png,image/webp"
        className="block max-w-full file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-xl file:border-0 file:bg-navy file:px-4 file:py-1 file:text-base file:font-semibold file:text-white file:shadow-sm hover:file:bg-[var(--navy-2)]"
      />
      <button className="btn btn-small" disabled={busy}>Upload photo</button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}
