import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BranchBadge } from "@/components/BranchBadge";
import { BranchLogo } from "@/components/BranchLogo";
import { requireApproved } from "@/lib/auth";
import { GROUPS, getGroup } from "@/lib/groups";
import { signPhotos } from "@/lib/photos";
import { getBranchLogos } from "@/lib/site";
import type { DirectoryEntry } from "@/lib/types";

export const metadata = { title: "Members" };

// Who can pick a branch and see who is in it. Change to `true` to let every
// member browse the other branches too.
const EVERYONE_CAN_BROWSE = false;

export default async function MembersPage(props: PageProps<"/members">) {
  const { supabase, profile } = await requireApproved();
  const sp = await props.searchParams;

  // The database decides who is visible (see member_directory in the migration).
  const { data } = await supabase.rpc("member_directory").order("full_name");
  const members = (data ?? []) as DirectoryEntry[];

  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  const isAdmin = profile.role === "admin";
  const canBrowse = isAdmin || EVERYONE_CAN_BROWSE;
  // Admins see every branch, even empty ones, plus everyone at once.
  const tabs = isAdmin ? GROUPS : GROUPS.filter((g) => g.id === profile.group_id || counts.has(g.id));

  const requested = typeof sp.group === "string" ? sp.group : null;
  const selected = !canBrowse
    ? profile.group_id
    : requested === "all" && isAdmin
      ? "all"
      : requested && getGroup(requested)
        ? requested
        : profile.group_id;
  const shown = selected === "all" ? members : members.filter((m) => m.group_id === selected);
  const [photos, logos] = await Promise.all([
    signPhotos(supabase, shown.map((m) => m.photo_path)),
    getBranchLogos(supabase),
  ]);
  const group = getGroup(selected);

  return (
    <div>
      <h1 className="sr-only">Members</h1>
      {canBrowse && (
        <nav aria-label="Branches" className="mb-6 flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href="/members?group=all"
              aria-current={selected === "all" ? "page" : undefined}
              className={selected === "all" ? "btn btn-small" : "btn-secondary btn-small"}
            >
              All members ({members.length})
            </Link>
          )}
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
      )}

      <div className="hero-bg relative mb-8 overflow-hidden rounded-2xl text-white shadow-lg">
        <div className="stars absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-6 p-6 sm:p-8">
          {selected === "all" ? (
            <Image src="/bobsf-logo-small.png" alt="" width={110} height={110} className="h-[110px] w-auto" />
          ) : (
            <BranchLogo groupId={selected} logos={logos} size={110} />
          )}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">Members</p>
            <h2 className="font-display text-4xl font-bold uppercase sm:text-5xl">{group?.name ?? "All members"}</h2>
            <p className="mt-1 text-slate-300">
              {shown.length} {shown.length === 1 ? "member" : "members"}
              {isAdmin ? "" : " you can see"}
            </p>
          </div>
        </div>
      </div>

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
            <li key={m.id} className="lift-card flex gap-4 p-5">
              <Avatar name={m.full_name} url={m.photo_path ? photos.get(m.photo_path) : null} />
              <div className="min-w-0">
                <Link href={`/members/${m.id}`} className="text-xl font-semibold">{m.full_name}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <BranchBadge groupId={m.group_id} size="sm" />
                  {m.role === "leader" && <span className="font-semibold text-accent">Group leader</span>}
                  {m.role === "admin" && <span className="font-semibold text-accent">Admin</span>}
                </div>
                {m.member_since && <p className="text-base font-semibold text-olive">Member since {m.member_since}</p>}
                {(m.job_title || m.retired) && (
                  <p>{[m.job_title, m.retired ? "Retired" : null].filter(Boolean).join(" · ")}</p>
                )}
                {m.is_business_owner && m.business_name && (
                  <p className="font-semibold text-navy">Owner, {m.business_name}</p>
                )}
                {m.city && <p className="text-muted">{[m.city, m.state].filter(Boolean).join(", ")}</p>}
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
