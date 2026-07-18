"use client";

import { useEffect } from "react";
import { writeCache } from "@/views/admin/utils/cache";

/**
 * Persiste `value` en el cache local del admin (`admin:{key}:{businessId}`) cada
 * vez que cambia, pero SOLO cuando `enabledRef.current` es true.
 *
 * El gate evita escribir estado vacío/transitorio sobre un cache válido antes de
 * que llegue el primer snapshot real (VIEW §7.1: "escribir cache local solo
 * después del primer valor remoto real"). `enabledRef` es un ref (estable) que
 * el provider pone en true al recibir el primer snapshot.
 */
export function usePersistOnChange<T>(
  key: string,
  businessId: string | null,
  value: T,
  enabledRef: { readonly current: boolean },
): void {
  useEffect(() => {
    if (!businessId || !enabledRef.current) return;
    writeCache(key, businessId, value);
  }, [key, businessId, value, enabledRef]);
}
