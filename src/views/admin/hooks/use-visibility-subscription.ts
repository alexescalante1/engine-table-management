"use client";

import { useEffect, type DependencyList } from "react";

/**
 * Suscribe a un stream (típicamente Firestore `onSnapshot`) SOLO mientras el
 * tab está visible. Al ocultarse pausa el listener; al volver visible re-abre.
 *
 * **Por qué:** cada snapshot Firestore = 1 read = $$. Si admin deja el tab
 * abierto 8h pero solo trabaja 2h, se pueden ahorrar ~75% de reads en background
 * invisible. Firestore SDK re-sincroniza automáticamente con server state al
 * re-suscribir, así que no se pierden eventos al volver visible.
 *
 * @param factory función que ejecuta el subscribe y retorna el unsub
 * @param deps dependencias (igual a useEffect) — re-crea la subscription si cambian
 *
 * @example
 * useVisibilitySubscription(
 *   () => catalogService.subscribeCatalog(businessId, (v) => setProducts(v.products)),
 *   [businessId],
 * );
 */
export function useVisibilitySubscription(
  factory: () => (() => void),
  deps: DependencyList,
): void {
  useEffect(() => {
    if (typeof document === "undefined") return; // SSR safe

    let unsub: (() => void) | null = document.hidden ? null : factory();

    const onChange = () => {
      if (document.hidden) {
        unsub?.();
        unsub = null;
      } else if (!unsub) {
        unsub = factory();
      }
    };

    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
