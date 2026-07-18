"use client";

import type { ReactNode } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  error?: string | boolean;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, error, disabled }: CheckboxProps) {
  const hasError = !!error;

  return (
    <label className={`flex cursor-pointer items-start gap-2.5${disabled ? " pointer-events-none opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-0.5 h-4 w-4 rounded border bg-white transition-colors duration-150 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-zinc-900 ${hasError ? "border-red-500 ring-1 ring-red-500" : "border-zinc-300 dark:border-zinc-600"}`}
      />
      {label && (
        <span className={`text-xs leading-relaxed ${hasError ? "text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
          {label}
        </span>
      )}
    </label>
  );
}
