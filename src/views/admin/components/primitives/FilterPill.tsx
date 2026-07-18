import { type ButtonHTMLAttributes } from "react";

type FilterPillVariant = "default" | "danger";

interface FilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: FilterPillVariant;
}

const activeStyles: Record<FilterPillVariant, string> = {
  default:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  danger:
    "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300",
};

const inactiveStyle =
  "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700";

export default function FilterPill({
  active = false,
  variant = "default",
  className = "",
  children,
  ...props
}: FilterPillProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-full shadow-sm px-3 py-1 text-xs font-medium transition-colors ${
        active || variant === "danger" ? activeStyles[variant] : inactiveStyle
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
