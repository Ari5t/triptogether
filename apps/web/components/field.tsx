import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-body text-fg placeholder:text-fg-muted disabled:bg-sunken disabled:text-fg-muted";

export function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-small font-medium">
      {label}
      {children}
      {error && <span className="text-caption font-normal text-error-ink">{error}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input className={inputClass} {...props} />;
}

/** Native select with the chevron drawn by us, so it keeps the 12px inset of the design (§6.3). */
export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select className={`${inputClass} appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
    </span>
  );
}
