"use client";

import { useState } from "react";
import { useAdminNav, AdminRouter } from "@/views/admin/router";
import DesktopSidebar from "./DesktopSidebar";
import MobileNav from "./MobileNav";

// Shell del frontier admin: sidebar desktop colapsable + barra mobile + área de
// contenido. La navegación entre secciones SPA la resuelve <AdminRouter/> en
// cliente (instantáneo, sin round-trip). Base UI/UX: sin auth, sin datos.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { currentPath, isSpaRoute } = useAdminNav();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50 pt-[env(safe-area-inset-top)] dark:bg-zinc-950">
      <DesktopSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <main className="scrollbar-elegant flex-1 overflow-y-auto overflow-x-hidden">
        <MobileNav />
        <div className="p-5 pb-24 md:p-8">
          {isSpaRoute(currentPath) ? <AdminRouter /> : children}
        </div>
      </main>
    </div>
  );
}
