"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ImageViewerImage {
  src: string;
  alt?: string;
}

interface ImageViewerProps {
  open: boolean;
  images: ImageViewerImage[];
  startIndex?: number;
  onClose: () => void;
}

/**
 * Fullscreen image viewer dialog.
 * Same visual style as ImageCropper — dark overlay, slide-up animation,
 * native <dialog> with showModal().
 * Supports single image or navigable gallery with arrows + keyboard.
 */
export default function ImageViewer({ open, images, startIndex = 0, onClose }: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const translateRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const count = images.length;
  const multi = count > 1;
  const current = images[index] ?? images[0];

  // Sync startIndex when opening
  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  // Dialog open/close with animation
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

  // Reset zoom/pan on image change
  useEffect(() => {
    setZoom(1);
    translateRef.current = { x: 0, y: 0 };
    if (imgRef.current) imgRef.current.style.transform = "scale(1) translate(0px, 0px)";
  }, [index]);

  const goPrev = useCallback(() => {
    if (multi) setIndex((i) => (i - 1 + count) % count);
  }, [multi, count]);

  const goNext = useCallback(() => {
    if (multi) setIndex((i) => (i + 1) % count);
  }, [multi, count]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onClose]);

  /** Apply current zoom + translate directly to DOM (no React re-render) */
  function applyTransform(z: number, t = translateRef.current) {
    if (!imgRef.current) return;
    imgRef.current.style.transform = `scale(${z}) translate(${t.x / z}px, ${t.y / z}px)`;
  }

  // Scroll to zoom
  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation();
    const next = Math.min(5, Math.max(1, zoom - e.deltaY * 0.002));
    if (next <= 1) translateRef.current = { x: 0, y: 0 };
    setZoom(next);
    applyTransform(next);
  }

  // Pan when zoomed — direct DOM updates, no React re-renders
  function handlePointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translateRef.current.x, ty: translateRef.current.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    translateRef.current = {
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    };
    applyTransform(zoom);
  }

  function handlePointerUp() {
    setDragging(false);
  }

  // Double-click to toggle zoom
  function handleDoubleClick() {
    if (zoom > 1) {
      setZoom(1);
      translateRef.current = { x: 0, y: 0 };
      applyTransform(1, { x: 0, y: 0 });
    } else {
      setZoom(2.5);
      applyTransform(2.5);
    }
  }

  function handleClose() {
    setZoom(1);
    translateRef.current = { x: 0, y: 0 };
    onClose();
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
      {open && current && (
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              {current.alt && (
                <h2 className="text-base font-semibold text-white">{current.alt}</h2>
              )}
              {multi && (
                <span className="text-sm text-white/50">
                  {index + 1} / {count}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="rounded-lg p-1 text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image area */}
          <div
            className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden select-none"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default", touchAction: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- src dinámico (data/blob URL); next/image no aplica */}
            <img
              ref={imgRef}
              src={current.src}
              alt={current.alt ?? ""}
              className="max-h-full max-w-full object-contain will-change-transform"
              style={{ transform: `scale(${zoom}) translate(0px, 0px)` }}
              draggable={false}
            />

            {/* Nav arrows */}
            {multi && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Footer — zoom control */}
          <div className="shrink-0 border-t border-white/10 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  if (z <= 1) translateRef.current = { x: 0, y: 0 };
                  setZoom(z);
                  applyTransform(z);
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
              />
              <span className="text-xs text-white/50 shrink-0 w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
