const COLORS = ["blue", "orange", "plum", "teal", "ochre", "rose", "indigo", "olive"] as const;

/** Participant colour by join order (DESIGN.md §2.6). */
export const participantColor = (index: number) => `var(--p-${COLORS[((index % COLORS.length) + COLORS.length) % COLORS.length]})`;
/** Day colour, cycling through the five day colours (DESIGN.md §2.7). */
export const dayColor = (index: number) => `var(--day-${(index % 5) + 1})`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Avatar({ name, color, size = 30, online }: { name: string; color: string; size?: number; online?: boolean }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full font-bold text-p-foreground" style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.36) }} title={name}>
      <span aria-hidden>{initials(name)}</span>
      <span className="sr-only">{name}</span>
      {online && <span className="absolute -bottom-px -right-px size-2.5 rounded-full border-2 border-surface bg-success" />}
    </span>
  );
}
