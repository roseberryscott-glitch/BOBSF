import { getGroup } from "@/lib/groups";

// BOBSF's own branch badge. Deliberately not the official seal (trademarked).
export function BranchBadge({ groupId, size = "md" }: { groupId: string; size?: "sm" | "md" }) {
  const g = getGroup(groupId);
  if (!g) return null;
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold tracking-wide ${pad}`}
      style={{ background: g.bg, color: g.fg, borderColor: g.fg }}
      title={g.name}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
        {g.isBranch ? (
          <path d="M8 1l2 4.2 4.6.6-3.3 3.2.8 4.6L8 11.4 3.9 13.6l.8-4.6L1.4 5.8 6 5.2z" />
        ) : (
          <path d="M8 14s-5.5-3.4-5.5-7.3C2.5 4.6 4 3 5.8 3c1 0 1.8.5 2.2 1.2C8.4 3.5 9.2 3 10.2 3 12 3 13.5 4.6 13.5 6.7 13.5 10.6 8 14 8 14z" />
        )}
      </svg>
      {g.short}
      <span className="sr-only"> ({g.name})</span>
    </span>
  );
}
