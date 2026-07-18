"use client";

/**
 * Versión BASE (sin lógica de negocio): passthrough directo del src.
 *
 * En digital-presence-for-clients-b01 este hook resuelve las imágenes vía el
 * ImageManager (caché en RAM + invalidación). Aquí no hay infraestructura de
 * caché conectada, así que devuelve el `src` tal cual. La firma es idéntica, de
 * modo que ItemThumb/PhotoGrid y cualquier consumidor funcionan sin cambios y,
 * cuando se conecte el ImageManager, solo cambia este archivo.
 */
export function useImage(src: string | null | undefined): string | null {
  return src ?? null;
}
