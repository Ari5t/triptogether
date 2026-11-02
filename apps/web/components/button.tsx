import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold disabled:cursor-not-allowed [&_svg]:shrink-0";
const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:bg-border disabled:text-fg-faint",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-sunken active:bg-border disabled:text-fg-faint",
  ghost: "text-primary hover:bg-primary-subtle hover:text-primary-hover disabled:text-fg-faint",
  danger: "text-error-ink hover:underline px-1",
} as const;
const sizes = { sm: "h-8 px-3 text-small", md: "h-10 px-4 text-body", lg: "h-11 px-5 text-body" } as const;

export function buttonClass(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") {
  return `${base} ${variants[variant]} ${variant === "danger" ? "h-10 text-small" : sizes[size]}`;
}

export function Button({ variant, size, className = "", ...props }: ComponentProps<"button"> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return <button type="button" className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}
