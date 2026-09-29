import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BranchBadge } from "@/components/BranchBadge";
import { requireApproved } from "@/lib/auth";
import { GROUPS, getGroup } from "@/lib/groups";
import { signPhotos } from "@/lib/photos";
import type { DirectoryEntry } from "@/lib/types";

export const metadata = { title: "Members" };

export default async function MembersPage(props: PageProps<"/members">) {
  const { supabase, profile } = await requireApproved();
  const sp = await props.searchParams;

  // The database decides who is visible (see member_directory in the migration).
  const { data } = await supabase.rpc("member_directory").order("full_name");
  const members = (data ?? []) as DirectoryEntry[];

  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  const tabs = GROUPS.filter((g) => g.id === profile.group_id || counts.has(g.id));

  const selected = typeof sp.group === "string" && getGroup(sp.group) ? sp.group : profile.group_id;
  const shown = members.filter((m) => m.group_id === selected);
  const photos = await signPhotos(supabase, shown.map((m) => m.photo_path));

  return (
    <div>
      <h1 className="page-title">Members</h1>
      <nav aria-label="Groups" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((g) => (
          <Link
            key={g.id}
            href={`/members?group=${g.id}`}
            aria-current={g.id === selected ? "page" : undefined}
            className={g.id === selected ? "btn btn-small" : "btn-secondary btn-small"}
          >
            {g.name} ({counts.get(g.id) ?? 0})
          </Link>
        ))}
      </nav>

      {selected !== profile.group_id && profile.role !== "admin" && (
        <p className="notice mb-6">
          You&apos;re seeing the {getGroup(selected)?.name} members who chose to share their name with everyone.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="card">No members to show here yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {shown.map((m) => (
            <li key={m.id} className="card flex gap-4">
              <Avatar name={m.full_name} url={m.photo_path ? photos.get(m.photo_path) : null} />
              <div className="min-w-0">
                <Link href={`/members/${m.id}`} className="text-xl font-semibold">{m.full_name}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <BranchBadge groupId={m.group_id} size="sm" />
                  {m.role === "leader" && <span className="font-semibold text-accent">Group leader</span>}
                  {m.role === "admin" && <span className="font-semibold text-accent">Admin</span>}
                </div>
                {m.city && <p className="text-muted">{m.city}</p>}
                {m.email && (
                  <p className="break-all"><a href={`mailto:${m.email}`}>{m.email}</a></p>
                )}
                {m.phone && (
                  <p><a href={`tel:${m.phone}`}>{m.phone}</a></p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
