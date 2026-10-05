/* eslint-disable @next/next/no-img-element -- admin-uploaded logos from storage */
import { getGroup } from "@/lib/groups";

// A branch's logo as uploaded by an admin, or a BOBSF shield in the branch's
// colors until one is uploaded.
export function BranchLogo({
  groupId,
  logos,
  size = 72,
  className = "",
}: {
  groupId: string;
  logos?: Record<string, string>;
  size?: number;
  className?: string;
}) {
  const g = getGroup(groupId);
  if (!g) return null;
  const url = logos?.[groupId];
  if (url) {
    return (
      <img
        src={url}
        alt={`${g.name} logo`}
        width={size}
        height={size}
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg
      role="img"
      aria-label={`${g.name} emblem`}
      viewBox="0 0 64 72"
      width={size}
      height={size * (72 / 64)}
      className={`shrink-0 drop-shadow-md ${className}`}
    >
      <path d="M32 2 60 12v22c0 18-12 30-28 36C16 64 4 52 4 34V12z" fill={g.bg} stroke={g.fg} strokeWidth="3" />
      <path d="M32 9 53 17v17c0 14-9 24-21 29-12-5-21-15-21-29V17z" fill="none" stroke={g.fg} strokeOpacity=".45" strokeWidth="1.5" />
      {g.isBranch ? (
        <path d="m32 18 3.5 7.6 8.3.9-6.2 5.6 1.8 8.2L32 36.1l-7.4 4.2 1.8-8.2-6.2-5.6 8.3-.9z" fill={g.fg} />
      ) : (
        <path d="M32 40s-10-6.2-10-13.3c0-3.8 2.8-6.7 6-6.7 1.8 0 3.2.9 4 2.2.8-1.3 2.2-2.2 4-2.2 3.2 0 6 2.9 6 6.7C42 33.8 32 40 32 40z" fill={g.fg} />
      )}
      <text x="32" y="54" textAnchor="middle" fontFamily="var(--font-oswald), Arial, sans-serif" fontWeight="700" fontSize={g.short.length > 4 ? 8 : 10} fill={g.fg} letterSpacing=".5">
        {g.short}
      </text>
    </svg>
  );
}
