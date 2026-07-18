"use client";

import { getBorderClasses, getColorRingClasses } from "./input-styles";

interface ColorInputProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  error?: string | boolean;
}

export default function ColorInput({ value, onChange, label, error }: ColorInputProps) {
  const hasError = !!error;
  const errorMessage = typeof error === "string" ? error : null;

  const borderClass = getColorRingClasses(hasError);
  const textBorderClass = getBorderClasses({ hasError });

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
      )}
      <label
        className={`relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border transition-colors duration-150 ${borderClass}`}
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={value}
        aria-invalid={hasError || undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        className={`w-full rounded-lg border bg-white px-2 py-1.5 font-mono text-xs text-zinc-900 transition-colors duration-150 focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${textBorderClass}`}
        placeholder="#000000"
      />
      {errorMessage && (
        <p role="alert" className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
