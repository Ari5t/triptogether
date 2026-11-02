import type { TripRole } from "@triptogether/shared";

const STYLE: Record<TripRole, string> = {
  OWNER: "bg-primary-100 text-primary-800 font-semibold",
  EDITOR: "bg-sunken text-fg border font-semibold",
  VIEWER: "border border-dashed border-border-strong text-fg-secondary font-semibold",
};

/** Role badge (DESIGN.md §6.7), trip-card size. */
export function RoleBadge({ role, label }: { role: TripRole; label: string }) {
  return <span className={`inline-flex h-[22px] shrink-0 items-center rounded-sm px-[7px] text-[11px] ${STYLE[role]}`}>{label}</span>;
}
