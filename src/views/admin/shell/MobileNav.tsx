"use client";

import { Grid3x3, Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/views/admin/providers";
import { useAdminNav } from "@/views/admin/router";
import { navItems } from "./nav-items";

const THEME_ORDER: Theme[] = ["light", "dark", "system"];
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };

export default function MobileNav() {
  const { currentPath, navigate } = useAdminNav();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = THEME_ICON[theme];

  const cycleTheme = () =>
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]);

  return (
    <>
      {/* Top bar mobile */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Grid3x3 size={16} />
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Engine Tables
          </span>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          aria-label="Cambiar tema"
          className="p-2 text-zinc-500 dark:text-zinc-400"
        >
          <ThemeIcon size={18} />
        </button>
      </div>

      {/* Bottom nav bar mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${
                  isActive ? "bg-zinc-900 dark:bg-white" : ""
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-300 ${
                    isActive ? "text-white dark:text-zinc-900" : "text-zinc-400"
                  }`}
                />
              </span>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
