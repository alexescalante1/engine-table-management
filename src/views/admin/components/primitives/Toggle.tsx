"use client";

import type { ReactNode } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  /** Color del track activo. Default "emerald". "amber" = dorado (ej. Destacado). */
  accent?: "emerald" | "amber";
  /** Icono dentro del círculo (usa `fill-current`); el thumb lo colorea según on/off. */
  thumbIcon?: ReactNode;
}

const TRACK_ON: Record<NonNullable<ToggleProps["accent"]>, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
};
const ICON_ON: Record<NonNullable<ToggleProps["accent"]>, string> = {
  emerald: "text-emerald-500",
  amber: "text-amber-500",
};

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  accent = "emerald",
  thumbIcon,
}: ToggleProps) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={!label ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-zinc-900 ${
        checked ? TRACK_ON[accent] : "bg-zinc-300 dark:bg-zinc-600"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        } ${thumbIcon ? (checked ? ICON_ON[accent] : "text-zinc-300 dark:text-zinc-400") : ""}`}
      >
        {thumbIcon}
      </span>
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {toggle}
    </div>
  );
}
