"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/views/admin/config/routes";

// Rutas que se resuelven client-side (SPA): cambiar entre ellas NO recarga la
// página ni pega al server — solo hace pushState + swap de componente.
const SPA_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_MESAS,
  ROUTES.ADMIN_RESERVAS,
  ROUTES.ADMIN_CONFIG,
  ROUTES.ADMIN_COMPONENTS,
]);

interface AdminNavContextValue {
  currentPath: string;
  navigate: (path: string) => void;
  isSpaRoute: (path: string) => boolean;
}

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function useAdminNav(): AdminNavContextValue {
  const ctx = useContext(AdminNavContext);
  if (!ctx) throw new Error("useAdminNav must be used within AdminNavProvider");
  return ctx;
}

export default function AdminNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // SSR-safe + se sincroniza con router.push de Next
  const [currentPath, setCurrentPath] = useState(pathname);
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const isSpaRoute = useCallback((path: string) => SPA_ROUTES.has(path), []);

  // Si Next navega por su cuenta (redirect, back del navegador a otra ruta), sync.
  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  const navigate = useCallback(
    (path: string) => {
      if (path === currentPathRef.current) return;
      if (!isSpaRoute(path)) {
        window.location.href = path; // fuera de la SPA → navegación real
        return;
      }
      window.history.pushState(null, "", path);
      setCurrentPath(path);
    },
    [isSpaRoute],
  );

  // Botones atrás/adelante del navegador.
  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = useMemo(
    () => ({ currentPath, navigate, isSpaRoute }),
    [currentPath, navigate, isSpaRoute],
  );

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}
