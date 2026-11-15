import { dayColor } from "@/components/avatar";

/** Rounded-square day/stop marker (DESIGN.md §6: days = squares with a number). */
export function DayPin({ n, day }: { n: number; day: number }) {
  return (
    <span className="grid size-6.5 shrink-0 place-items-center rounded-[7px] text-caption text-day-foreground" style={{ backgroundColor: dayColor(day) }}>
      {n}
    </span>
  );
}
