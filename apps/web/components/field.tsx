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
