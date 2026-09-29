// Mirrors the groups table. Colors are for BOBSF's own badges; they are not
// official branch insignia (those are trademarked).
export type Group = {
  id: string;
  name: string;
  short: string;
  isBranch: boolean;
  bg: string;
  fg: string;
};

export const GROUPS: Group[] = [
  { id: "army", name: "Army", short: "ARMY", isBranch: true, bg: "#2f3a1f", fg: "#f2c94c" },
  { id: "navy", name: "Navy", short: "NAVY", isBranch: true, bg: "#0b2545", fg: "#f2c94c" },
  { id: "marines", name: "Marine Corps", short: "USMC", isBranch: true, bg: "#9b1c1c", fg: "#f2c94c" },
  { id: "air_force", name: "Air Force", short: "USAF", isBranch: true, bg: "#1f4e99", fg: "#ffffff" },
  { id: "coast_guard", name: "Coast Guard", short: "USCG", isBranch: true, bg: "#ffffff", fg: "#c2410c" },
  { id: "space_force", name: "Space Force", short: "USSF", isBranch: true, bg: "#1c1c28", fg: "#c7ccd6" },
  { id: "friends", name: "Friends", short: "FRIEND", isBranch: false, bg: "#14532d", fg: "#ffffff" },
];

export function getGroup(id: string | null | undefined): Group | undefined {
  return GROUPS.find((g) => g.id === id);
}

export function groupName(id: string | null | undefined): string {
  return getGroup(id)?.name ?? "Everyone";
}
