"use client";

import { useEffect, useRef } from "react";
import { ROUTES } from "@/views/admin/config/routes";
import { useAdminNav } from "./AdminNavProvider";
import DashboardScreen from "@/views/admin/screens/DashboardScreen";
import MesasScreen from "@/views/admin/screens/MesasScreen";
import ReservasScreen from "@/views/admin/screens/ReservasScreen";
import ConfiguracionScreen from "@/views/admin/screens/ConfiguracionScreen";
import ComponentsScreen from "@/views/admin/screens/ComponentsScreen";

const SCREEN_MAP: Record<string, { component: React.ComponentType; title: string }> = {
  [ROUTES.ADMIN_DASHBOARD]: { component: DashboardScreen, title: "Dashboard" },
  [ROUTES.ADMIN_MESAS]: { component: MesasScreen, title: "Mesas" },
  [ROUTES.ADMIN_RESERVAS]: { component: ReservasScreen, title: "Reservas" },
  [ROUTES.ADMIN_CONFIG]: { component: ConfiguracionScreen, title: "Configuración" },
  [ROUTES.ADMIN_COMPONENTS]: { component: ComponentsScreen, title: "Componentes" },
};

const FALLBACK = SCREEN_MAP[ROUTES.ADMIN_DASHBOARD];

export default function AdminRouter() {
  const { currentPath } = useAdminNav();
  const entry = SCREEN_MAP[currentPath] ?? FALLBACK;
  const Screen = entry.component;
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPath = useRef(currentPath);

  // Al cambiar de pantalla: reinicia la animación CSS vía DOM (sin re-render),
  // sube el scroll y actualiza el título del documento.
  useEffect(() => {
    if (prevPath.current === currentPath) return;
    prevPath.current = currentPath;

    const el = containerRef.current;
    if (el) {
      el.classList.remove("animate-fade-in");
      void el.offsetWidth; // fuerza reflow para reiniciar la animación
      el.classList.add("animate-fade-in");
    }

    document.title = `${entry.title} — Engine Tables`;
    const main = document.querySelector("main");
    if (main) main.scrollTo(0, 0);
  }, [currentPath, entry.title]);

  return (
    <div ref={containerRef} className="animate-fade-in">
      <Screen />
    </div>
  );
}
