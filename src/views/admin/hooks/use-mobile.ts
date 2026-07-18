"use client";

import { useSyncExternalStore } from "react";

/**
 * Breakpoint único para mobile/desktop en toda la app.
 * Coincide con Tailwind `md:` (768px).
 *
 * Mobile: < 768px  |  Desktop: >= 768px
 *
 * Usa matchMedia + useSyncExternalStore para evitar hydration mismatch.
 */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(cb: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true; // SSR asume mobile-first
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
