import { type ButtonHTMLAttributes } from "react";

type SelectorAccent = "inverted" | "emerald";
type SelectorSize = "sm" | "md";

interface SelectorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  accent?: SelectorAccent;
  size?: SelectorSize;
}

const selectedStyles: Record<SelectorAccent, string> = {
  inverted:
    "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900",
  emerald:
    "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400",
};

const unselectedStyles: Record<SelectorAccent, string> = {
  inverted:
    "border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300",
  emerald:
    "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800",
};

const sizeStyles: Record<SelectorSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-3 py-2.5 text-sm",
};

export default function SelectorButton({
  selected = false,
  accent = "inverted",
  size = "md",
  className = "",
  children,
  ...props
}: SelectorButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors ${
        selected ? selectedStyles[accent] : unselectedStyles[accent]
      } ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
