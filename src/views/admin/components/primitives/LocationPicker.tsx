"use client";

import { useState, useCallback } from "react";
import { Map, Marker } from "pigeon-maps";
import { MapPin, Plus, Minus, LocateFixed, Loader2 } from "lucide-react";
import { useIsMobile } from "@/views/admin/hooks";
import { useToast, ToastVariant } from "@/views/admin/providers/Toast";

interface LocationPickerProps {
  center: [number, number];
  marker: [number, number] | null;
  onMarkerChange: (coords: [number, number]) => void;
}

export default function LocationPicker({ center, marker, onMarkerChange }: LocationPickerProps) {
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const [zoom, setZoom] = useState(marker ? 15 : 12);
  const [locating, setLocating] = useState(false);

  const handleClick = useCallback(
    ({ latLng }: { latLng: [number, number] }) => {
      onMarkerChange(latLng);
    },
    [onMarkerChange],
  );

  const handleBoundsChanged = useCallback(
    ({ zoom: newZoom }: { zoom: number }) => {
      setZoom(newZoom);
    },
    [],
  );

  const handleLocate = useCallback(async () => {
    if (!navigator.geolocation || locating) return;

    // Check permission state first for better error messages
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state === "denied") {
          showToast("Ubicación bloqueada. Ve a Configuración del navegador → Permisos → Ubicación", ToastVariant.ERROR);
          return;
        }
      } catch {}
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        onMarkerChange(coords);
        setZoom(15);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: "Permite el acceso a ubicación en el popup del navegador",
          [err.POSITION_UNAVAILABLE]: "Activa la ubicación en la configuración de tu dispositivo",
          [err.TIMEOUT]: "No se pudo obtener tu ubicación, intenta de nuevo",
        };
        showToast(messages[err.code] ?? "No se pudo obtener tu ubicación", ToastVariant.ERROR);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locating, onMarkerChange, showToast]);

  const supportsGeo = typeof navigator !== "undefined" && !!navigator.geolocation;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>Toca el mapa o usa tu ubicación</span>
        </div>
        {supportsGeo && !marker && (
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {locating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <LocateFixed size={12} />
            )}
            Mi ubicación
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600">
        <div className="relative">
          <Map
            center={marker ?? center}
            zoom={zoom}
            height={280}
            onClick={handleClick}
            onBoundsChanged={handleBoundsChanged}
            attribution={false}
            twoFingerDrag={isMobile}
            twoFingerDragWarning="Usa dos dedos para mover el mapa"
          >
            {marker && (
              <Marker anchor={marker} color="#ef4444" width={40} />
            )}
          </Map>
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            {supportsGeo && (
              <button
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-md active:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-800 dark:active:bg-zinc-700"
              >
                {locating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LocateFixed size={14} />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 1, 18))}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-md active:bg-zinc-100 dark:bg-zinc-800 dark:active:bg-zinc-700"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 1, 3))}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-md active:bg-zinc-100 dark:bg-zinc-800 dark:active:bg-zinc-700"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      </div>
      {marker && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {marker[0].toFixed(6)}, {marker[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}
