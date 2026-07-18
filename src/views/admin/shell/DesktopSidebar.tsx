"use client";

import { Grid3x3, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { ROUTES } from "@/views/admin/config/routes";
import { useAdminNav } from "@/views/admin/router";
import { navGroups } from "./nav-items";
import ThemeToggle from "./ThemeToggle";

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function DesktopSidebar({ collapsed, onToggleCollapse }: DesktopSidebarProps) {
  const { currentPath, navigate } = useAdminNav();

  return (
    <aside
      className={`hidden flex-col border-r border-zinc-200 bg-white transition-[width] duration-300 ease-in-out md:flex dark:border-zinc-800 dark:bg-zinc-950 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div
        className={`flex h-16 items-center gap-3 border-b border-zinc-200 transition-[padding] duration-300 dark:border-zinc-800 ${
          collapsed ? "justify-center px-3" : "px-5"
        }`}
      >
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button
          onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
          className={`flex items-center gap-3 overflow-hidden transition-[width,opacity] duration-300 ${
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Grid3x3 size={18} />
          </span>
          <div className="text-left">
            <p className="whitespace-nowrap text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Engine Tables
            </p>
            <p className="whitespace-nowrap text-[10px] text-zinc-400">
              Panel de administración
            </p>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-4 p-3">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p
              className={`mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ${
                collapsed ? "text-center" : "px-3"
              }`}
            >
              {collapsed ? "•" : group.title}
            </p>
            {group.items.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  title={collapsed ? item.label : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className={collapsed ? "hidden" : "block"}>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <ThemeToggle collapsed={collapsed} />
        <button
          type="button"
          title={collapsed ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          <span className={collapsed ? "hidden" : "block"}>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
