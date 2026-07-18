import type { ButtonHTMLAttributes } from "react";

const VARIANT_CLASSES = {
  default:
    "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
  danger:
    "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/30",
} as const;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
}

export default function IconButton({
  variant = "default",
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center rounded-full p-2 transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    />
  );
}
