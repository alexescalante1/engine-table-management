"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/views/admin/providers";

const ORDER: Theme[] = ["light", "dark", "system"];
const META: Record<Theme, { label: string; Icon: typeof Sun }> = {
  light: { label: "Claro", Icon: Sun },
  dark: { label: "Oscuro", Icon: Moon },
  system: { label: "Sistema", Icon: Monitor },
};

export default function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const { label, Icon } = META[theme];

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={collapsed ? `Tema: ${label}` : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span className={collapsed ? "hidden" : "block"}>Tema: {label}</span>
    </button>
  );
}
