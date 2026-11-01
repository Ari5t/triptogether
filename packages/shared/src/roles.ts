export const TRIP_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type TripRole = (typeof TRIP_ROLES)[number];

const RANK: Record<TripRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

/** True when `role` is at least `min` (OWNER > EDITOR > VIEWER). */
export function hasRole(role: TripRole, min: TripRole): boolean {
  return RANK[role] >= RANK[min];
}

/** Roles an invite can grant: never OWNER. */
export const INVITE_ROLES = ["EDITOR", "VIEWER"] as const;
