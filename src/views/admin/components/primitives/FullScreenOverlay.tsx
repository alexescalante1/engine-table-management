"use client";

import { useEffect, useRef, useState, useId } from "react";
import { X } from "lucide-react";

interface FullScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * FullScreenOverlay — primitiva del frontier admin para presentar features
 * completas como overlay de pantalla completa (desktop y mobile).
 *
 * Animación replicada del Modal del admin en modo fullscreen-mobile:
 *   - timing: cubic-bezier(0.32, 0.72, 0, 1)
 *   - duración: 450ms
 *   - entrada: translate-y-16 + opacity-0 → translate-y-0 + opacity-100
 *   - backdrop: transparente en mobile, bg-black/25 en desktop
 *
 * Distinción vs Modal:
 *   - Modal centrado en desktop (md:max-w-lg). FullScreenOverlay es 100% pantalla
 *     en AMBOS breakpoints — sirve como contenedor de feature completa.
 *   - Modal soporta `sheet` (bottom sheet mobile). FullScreenOverlay siempre full.
 *
 * Distinción vs SlidePanel:
 *   - SlidePanel = panel lateral 420px desktop / fullscreen mobile.
 *   - FullScreenOverlay = fullscreen en ambos breakpoints.
 *
 * Z-index: usa <dialog>.showModal() que aplica top-layer nativo del browser.
 * SlidePanels (z-50) y Modales internos (también <dialog>.showModal()) abren
 * encima sin problema porque cada showModal() crea su propio top-layer stack.
 *
 * Cierre: botón [X], ESC nativo del <dialog>, click en backdrop.
 */
export default function FullScreenOverlay({
  open,
  onClose,
  title,
  children,
}: FullScreenOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  // Ajuste de estado al cambiar `open` DURANTE el render (patrón recomendado de React en vez de
  // setState síncrono dentro del effect): montar al abrir, disparar la animación de salida al cerrar.
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      const timeout = setTimeout(() => {
        setMounted(false);
        if (dialog.open) dialog.close();
      }, 450);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Solo cierra si el press Y el release fueron en el backdrop → evita el falso-cierre
  // al arrastrar desde dentro y soltar fuera.
  const pressOnBackdrop = useRef(false);
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current && pressOnBackdrop.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => { pressOnBackdrop.current = e.target === dialogRef.current; }}
      onClick={handleBackdropClick}
      className={`
        fixed inset-0 m-0 h-full max-h-full w-full max-w-full p-0
        bg-white shadow-xl dark:bg-zinc-950
        transition-[translate,opacity] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
        max-md:backdrop:bg-transparent
        backdrop:transition-[background-color] backdrop:duration-450 backdrop:[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
        ${visible
          ? "duration-450 translate-y-0 opacity-100 md:backdrop:bg-black/25 dark:md:backdrop:bg-white/25"
          : "duration-450 translate-y-16 opacity-0 backdrop:bg-black/0 dark:backdrop:bg-white/0"
        }
      `}
    >
      {mounted && (
        <div className="flex h-full select-none flex-col">
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between bg-white px-4 py-3 dark:bg-zinc-950">
            <h2
              id={titleId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="scrollbar-elegant flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
