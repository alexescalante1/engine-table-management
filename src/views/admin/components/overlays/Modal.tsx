"use client";

import { useEffect, useRef, useState, useId } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  bottomContent?: React.ReactNode;
  /** Mobile: bottom sheet en vez de full-screen. Usar para contenido pequeño (1-2 inputs). */
  sheet?: boolean;
  /** Fuerza tema dark independientemente de prefers-color-scheme. */
  forceDark?: boolean;
  /** ARIA role. Default "dialog"; usar "alertdialog" para confirmaciones destructivas. */
  role?: "dialog" | "alertdialog";
  /**
   * Al CERRAR, saltar la animación de salida (desaparece instantáneo). Usar SOLO
   * cuando otro modal se abre de inmediato después (transición sheet→body): evita
   * ver dos modales animándose a la vez. El backdrop conserva su cross-fade.
   */
  noExitAnimation?: boolean;
}

export default function Modal({ open, onClose, title, children, bottomContent, sheet, forceDark, role = "dialog", noExitAnimation }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  // Ajuste de estado al cambiar `open` DURANTE el render (patrón recomendado de React en vez de
  // setState síncrono dentro del effect): montar el contenido al abrir, disparar la animación de
  // salida al cerrar. El effect queda solo para el DOM imperativo + los frames async.
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      // `showModal()` autoenfoca el 1er focusable (el ✕). Movemos el foco al <dialog>
      // mismo → ningún control pre-seleccionado y, en mobile, no salta el teclado.
      dialog.focus();
      // 2 frames → la animación de entrada arranca desde el estado cerrado.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      // Cierra el dialog de INMEDIATO: showModal() deja toda la página `inert`
      // (bloqueo nativo del navegador); retrasar .close() 450ms hacía que el fondo
      // quedara no clickeable durante el fade. Cerrar ya levanta el inert al instante.
      // La animación de salida la conserva CSS: `transition-discrete` sobre
      // display/overlay mantiene el dialog visible en el top-layer durante el fade.
      if (dialog.open) dialog.close();
      const timeout = setTimeout(() => setMounted(false), 450);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Solo cierra si el press Y el release fueron en el backdrop (el <dialog> mismo) → evita el
  // falso-cierre al arrastrar desde dentro (texto, handles del timeline) y soltar fuera.
  const pressOnBackdrop = useRef(false);
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current && pressOnBackdrop.current) {
      onClose();
    }
  }

  const mobileLayout = sheet
    ? "max-md:mt-auto max-md:mb-0 max-md:mx-0 max-md:w-full max-md:max-w-full max-md:max-h-[85dvh] max-md:rounded-t-2xl"
    : "max-md:h-full max-md:w-full max-md:max-h-full max-md:max-w-full max-md:rounded-none max-md:border-none";

  const mobileBackdrop = sheet
    ? ""
    : "max-md:backdrop:bg-transparent";

  const hiddenTranslate = sheet
    ? "max-md:translate-y-full md:translate-y-4"
    : "translate-y-16";

  // Theme classes — forceDark bypasses prefers-color-scheme
  const bg = forceDark ? "bg-black" : "bg-white dark:bg-black";
  const titleText = forceDark ? "text-zinc-100" : "text-zinc-900 dark:text-zinc-100";
  const closeBtn = forceDark
    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 focus-visible:bg-zinc-800 focus-visible:text-zinc-300"
    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:bg-zinc-100 focus-visible:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 dark:focus-visible:bg-zinc-800 dark:focus-visible:text-zinc-300";
  const handleColor = forceDark ? "bg-zinc-600" : "bg-zinc-300 dark:bg-zinc-600";
  const mdBorder = forceDark ? "md:border-zinc-700" : "md:border-zinc-200 dark:md:border-zinc-700";
  const backdropSheet = forceDark
    ? "backdrop:bg-white/20 backdrop:backdrop-blur-[2px]"
    : "backdrop:bg-black/25 dark:backdrop:bg-white/25 backdrop:backdrop-blur-[2px]";
  const backdropFull = forceDark
    ? "md:backdrop:bg-white/20 md:backdrop:backdrop-blur-[2px]"
    : "md:backdrop:bg-black/25 dark:md:backdrop:bg-white/25 md:backdrop:backdrop-blur-[2px]";
  const backdropHidden = forceDark
    ? "backdrop:bg-white/0 backdrop:backdrop-blur-[0px]"
    : "backdrop:bg-black/0 dark:backdrop:bg-white/0 backdrop:backdrop-blur-[0px]";

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-modal="true"
      tabIndex={-1}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onPointerDown={(e) => { pressOnBackdrop.current = e.target === dialogRef.current; }}
      onClick={handleBackdropClick}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "Modal"}
      className={`
        fixed inset-0 p-0 ${bg} shadow-xl outline-none
        ${!open && noExitAnimation
          ? "transition-none"
          : "transition-[translate,opacity,display,overlay] transition-discrete [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]"}
        ${mobileBackdrop} backdrop:transition-[background-color,backdrop-filter] backdrop:duration-450 backdrop:[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
        md:m-auto md:w-[calc(100%-2rem)] md:max-w-lg md:rounded-xl md:border ${mdBorder}
        ${mobileLayout}
        ${visible
          ? `pointer-events-auto duration-450 translate-y-0 opacity-100 ${sheet ? backdropSheet : backdropFull}`
          : `pointer-events-none backdrop:pointer-events-none duration-450 ${hiddenTranslate} opacity-0 ${backdropHidden}`
        }
      `}
    >
      {mounted && (
        <div className={`flex select-none flex-col ${sheet ? "max-md:max-h-[85dvh]" : "max-md:h-full"}`}>
          {sheet && (
            <div className="flex shrink-0 justify-center pt-3 pb-1 md:hidden">
              <div className={`h-1 w-10 rounded-full ${handleColor}`} />
            </div>
          )}
          {title && (
            <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-2">
              <h2 id={titleId} className={`text-lg font-semibold tracking-tight ${titleText}`}>{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className={`rounded-lg p-1 transition-colors duration-150 focus:outline-none ${closeBtn}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className={`scrollbar-elegant flex-1 overflow-y-auto p-6 ${sheet ? "max-md:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" : ""}`}>{children}</div>
          {bottomContent && (
            <div className="flex shrink-0 items-center justify-end gap-3 px-6 py-4 max-md:[&>*]:w-full">
              {bottomContent}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
