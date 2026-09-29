import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BranchBadge } from "@/components/BranchBadge";
import { requireApproved } from "@/lib/auth";
import { signPhotos } from "@/lib/photos";
import type { DirectoryEntry } from "@/lib/types";

export default async function MemberPage(props: PageProps<"/members/[id]">) {
  const { id } = await props.params;
  const { supabase, profile } = await requireApproved();
  const { data } = await supabase.rpc("member_directory").eq("id", id).maybeSingle();
  const m = data as DirectoryEntry | null;
  if (!m) notFound();

  const photos = await signPhotos(supabase, [m.photo_path]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4"><Link href={`/members?group=${m.group_id}`}>← Back to members</Link></p>
      <div className="card">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={m.full_name} url={m.photo_path ? photos.get(m.photo_path) : null} size={96} />
          <div>
            <h1 className="text-3xl font-bold">{m.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BranchBadge groupId={m.group_id} />
              {m.role === "leader" && <span className="font-semibold text-accent">Group leader</span>}
              {m.role === "admin" && <span className="font-semibold text-accent">Admin</span>}
            </div>
          </div>
        </div>
        <dl className="mt-6 space-y-3">
          {m.service_years && (<div><dt className="font-semibold">Service</dt><dd>{m.service_years}</dd></div>)}
          {m.city && (<div><dt className="font-semibold">Location</dt><dd>{m.city}</dd></div>)}
          {m.email && (<div><dt className="font-semibold">Email</dt><dd><a href={`mailto:${m.email}`}>{m.email}</a></dd></div>)}
          {m.phone && (<div><dt className="font-semibold">Phone</dt><dd><a href={`tel:${m.phone}`}>{m.phone}</a></dd></div>)}
          {m.bio && (<div><dt className="font-semibold">About</dt><dd className="whitespace-pre-line">{m.bio}</dd></div>)}
        </dl>
        {m.id === profile.id && (
          <p className="mt-6"><Link href="/profile">Edit my profile</Link></p>
        )}
      </div>
    </div>
  );
}
