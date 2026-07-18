"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Tema claro/oscuro con opción "system". Base UI/UX — sin lógica de negocio.
// La clase `.dark` se aplica en <html>; el `dark:` de Tailwind responde a ella.

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  /** Preferencia elegida por el usuario. */
  theme: Theme;
  /** Tema efectivo tras resolver "system". */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Hidratar desde localStorage tras el montaje (el no-flash script del layout
  // ya aplicó la clase correcta antes del primer paint).
  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      // SSR / modo privado / quota: se ignora y cae a "system".
    }
    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setThemeState(initial);
  }, []);

  // Resolver + aplicar clase cada vez que cambia la preferencia, y suscribirse a
  // cambios del sistema cuando el modo es "system".
  useEffect(() => {
    const resolve = () => {
      const next = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
      setResolvedTheme(next);
      applyThemeClass(next);
    };
    resolve();

    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", resolve);
    return () => mql.removeEventListener("change", resolve);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // quota / modo privado: el tema aplica igual en memoria, solo no persiste.
    }
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

/**
 * Script inline (sin React) que se ejecuta ANTES del primer paint para evitar
 * el flash de tema incorrecto. Se inyecta en <head> vía dangerouslySetInnerHTML.
 */
export const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("${STORAGE_KEY}");
    var dark = t === "dark" || ((!t || t === "system") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
