"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedFile } from "@/utils/crop-image";
import { GALLERY_ASPECTS, type GalleryAspect } from "./gallery-aspects";
import AspectPicker from "./AspectPicker";

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  aspect?: number;
  /** Muestra un AspectPicker dentro del cropper para elegir la relación de aspecto. */
  allowAspectPicker?: boolean;
  /** Exporta WebP lossless (quality 1.0) para preservar transparencia. */
  lossless?: boolean;
  /** Si se pasa, el recorte se escala a EXACTAMENTE este tamaño. */
  outDim?: { width: number; height: number };
  onConfirm: (file: File) => void;
  onClose: () => void;
}

function aspectToRatio(value: GalleryAspect): number | undefined {
  const entry = GALLERY_ASPECTS.find((a) => a.value === value);
  if (!entry || entry.ratio <= 0) return undefined;
  return entry.ratio;
}

/** Convierte imagen a WebP sin recortar (para modo "Natural"). */
async function convertToWebP(imageSrc: string, lossless?: boolean): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imageSrc;
  });
  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const quality = lossless ? 1.0 : 0.98;
  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  return new File([blob], "photo.webp", { type: "image/webp" });
}

/**
 * Fullscreen dialog para recortar imágenes. Usa <dialog> con showModal().
 * Completamente agnóstico del contexto padre.
 *
 * Dos modos:
 * - `aspect` fijo: cropper con ratio fijo, sin selector.
 * - `allowAspectPicker`: selector de aspecto integrado, incluye "Natural" (sin recorte).
 */
export default function ImageCropper({ open, imageSrc, aspect, allowAspectPicker, lossless, outDim, onConfirm, onClose }: ImageCropperProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<GalleryAspect>("1:1");

  const isNatural = allowAspectPicker && selectedAspect === "auto";
  const effectiveAspect = allowAspectPicker ? aspectToRatio(selectedAspect) : aspect;

  useEffect(() => {
    if (open) setSelectedAspect("1:1");
  }, [open]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const handler = () => {
        if (dialog.open) dialog.close();
      };
      dialog.addEventListener("transitionend", handler, { once: true });
      const timeout = setTimeout(handler, 250);
      return () => {
        clearTimeout(timeout);
        dialog.removeEventListener("transitionend", handler);
      };
    }
  }, [open]);

  async function handleConfirm() {
    if (processing) return;
    setProcessing(true);
    try {
      if (isNatural) {
        const file = await convertToWebP(imageSrc, lossless);
        onConfirm(file);
      } else {
        if (!croppedArea) return;
        const file = await getCroppedFile(imageSrc, croppedArea, "cropped.webp", lossless, outDim);
        onConfirm(file);
      }
    } finally {
      setProcessing(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }

  function handleClose() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  }

  function handleAspectChange(v: GalleryAspect) {
    setSelectedAspect(v);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className={`
        fixed inset-0 m-0 h-dvh w-dvw max-h-dvh max-w-dvw border-none p-0
        transition-all [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
        backdrop:transition-all backdrop:[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
        ${visible
          ? "duration-400 backdrop:duration-400 translate-y-0 opacity-100 bg-zinc-900/95 backdrop:bg-black/60"
          : "duration-200 backdrop:duration-200 translate-y-16 opacity-0 bg-zinc-900/0 backdrop:bg-black/0"
        }
      `}
    >
      {open && (
        <div className="flex h-full w-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-base font-semibold text-white">
              {isNatural ? "Subir imagen" : "Recortar imagen"}
            </h2>
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="rounded-lg p-1 text-white/60 transition-colors duration-150 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 min-h-0">
            <div className={`absolute inset-0 transition-opacity duration-200 ${isNatural ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={effectiveAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className={`absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-200 ${isNatural ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- src dinámico (data/blob URL); next/image no aplica */}
              <img
                src={imageSrc}
                alt="Preview"
                className="max-h-full max-w-full rounded object-contain"
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-zinc-900 px-4 py-3 space-y-3">
            {allowAspectPicker && (
              <div className="space-y-1.5">
                <span className="text-xs text-white/50">Forma</span>
                <AspectPicker value={selectedAspect} onChange={handleAspectChange} variant="pills" />
              </div>
            )}

            {!isNatural && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={processing}
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                {processing ? "Procesando..." : isNatural ? "Subir sin recorte" : "Recortar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
