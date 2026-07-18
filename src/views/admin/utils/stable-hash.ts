/**
 * Hash estable agnóstico de tipo — sirve para Tenant, Branch, o cualquier
 * objeto del dominio. Excluye keys volátiles del shape comparado.
 *
 * Keys excluidas del hash de equivalencia:
 * - `id` / `createdAt` / `updatedAt`: metadata persistencia (cambia con cada save)
 * - `gallery` (v8.3): se gestiona por APIs de patch separadas (GalleryScreen,
 *   engine autosave) y NO debe disparar un autosave de ConfigScreen cuando llega
 *   un snapshot externo con gallery actualizada. La defensa-en-profundidad de
 *   `tenantService.update` (strip de `gallery`) garantiza que aunque se
 *   disparara, no habría overwrite. (Branch no tiene gallery; el filter es
 *   no-op para ese caso.)
 */
const VOLATILE_KEYS = new Set(["id", "updatedAt", "createdAt", "gallery"]);

export function stableHash(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const filtered = Object.fromEntries(
    Object.entries(obj).filter(([k]) => !VOLATILE_KEYS.has(k)),
  );
  return JSON.stringify(filtered, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}
