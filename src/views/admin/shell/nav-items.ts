import { LayoutDashboard, Grid3x3, CalendarClock, Settings, Blocks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROUTES } from "@/views/admin/config/routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Navegación base del motor de mesas. Solo texto/íconos — sin lógica.
export const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [{ label: "Dashboard", href: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard }],
  },
  {
    title: "Operación",
    items: [
      { label: "Mesas", href: ROUTES.ADMIN_MESAS, icon: Grid3x3 },
      { label: "Reservas", href: ROUTES.ADMIN_RESERVAS, icon: CalendarClock },
    ],
  },
  {
    title: "Ajustes",
    items: [
      { label: "Configuración", href: ROUTES.ADMIN_CONFIG, icon: Settings },
      { label: "Componentes", href: ROUTES.ADMIN_COMPONENTS, icon: Blocks },
    ],
  },
];

/** Lista plana para la barra inferior mobile. */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);
