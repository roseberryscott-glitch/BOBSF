"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveBranchLogos } from "@/app/site-actions";
import { BranchLogo } from "@/components/BranchLogo";
import { uploadSiteImage } from "@/components/cms/upload";
import type { BranchLogos } from "@/lib/content";
import { GROUPS } from "@/lib/groups";

// Upload each branch's logo. They appear on branch pages, forums, member
// cards and the welcome page. Until one is uploaded, a BOBSF shield shows.
export function BranchLogoEditor({ initial }: { initial: BranchLogos }) {
  const [logos, setLogos] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function persist(next: BranchLogos) {
    setLogos(next);
    const res = await saveBranchLogos(next);
    setMessage("error" in res && res.error ? res.error : "Saved.");
  }

  async function onFile(groupId: string, file: File | undefined) {
    if (!file) return;
    setBusy(groupId);
    setMessage(null);
    try {
      const url = await uploadSiteImage(file, "branch-logos");
      await persist({ ...logos, [groupId]: url });
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <div>
      <p className="notice mb-6">
        Official branch seals and emblems are trademarks of each service. Make sure BOBSF has permission
        to use any logo you upload. PNG with a transparent background looks best.
      </p>
      {message && <p role="status" className="mb-4 font-semibold">{message}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <li key={g.id} className="card flex items-center gap-5">
            <BranchLogo groupId={g.id} logos={logos} size={80} />
            <div className="flex-1">
              <p className="font-display text-xl font-bold uppercase text-navy">{g.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="btn-secondary btn-small cursor-pointer">
                  {busy === g.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                  {logos[g.id] ? "Change logo" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/webp,image/jpeg"
                    className="sr-only"
                    disabled={busy !== null}
                    onChange={(e) => onFile(g.id, e.target.files?.[0])}
                  />
                </label>
                {logos[g.id] && (
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => {
                      const next = { ...logos };
                      delete next[g.id];
                      persist(next);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
