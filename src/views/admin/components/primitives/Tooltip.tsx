"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface TooltipProps {
  /** Contenido del panel (texto / análisis a demanda). */
  content: ReactNode;
  /** Trigger visible (ej. ícono ⓘ). */
  children: ReactNode;
  /** Ancho del panel. Default `w-56`. */
  panelClassName?: string;
  /**
   * Borde del trigger al que se ancla el panel:
   * - `"right"` (default): el panel crece hacia la IZQUIERDA (trigger pegado al borde derecho).
   * - `"left"`: el panel crece hacia la DERECHA (trigger pegado al borde izquierdo).
   */
  align?: "left" | "right";
}

/**
 * Tooltip — panel informativo a demanda, sin librería de posicionamiento.
 *
 * `open = hovered || pinned`: abre en HOVER (desktop) y queda FIJO con click/tap
 * (móvil, donde no hay hover). Click-afuera o `Escape` lo despinean. El panel se
 * posiciona `absolute` debajo-derecha del trigger (no desborda a la derecha del form).
 */
export default function Tooltip({ content, children, panelClassName = "w-56", align = "right" }: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const open = hovered || pinned;

  // Solo cuando está fijado (click/tap) escuchamos afuera/Escape — el hover se
  // autocierra solo con mouseLeave (cero listeners en el caso desktop común).
  useEffect(() => {
    if (!pinned) return;
    function onPointer(e: PointerEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setPinned(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        // Fuera de la secuencia de Tab: es info SUPLEMENTARIA (la esencial vive en la
        // descripción). Evita la "caja" de foco al tabular; sigue activo por hover/click/tap.
        tabIndex={-1}
        aria-label="Más información"
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
        }}
        className="inline-flex items-center text-zinc-400 transition-colors hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:text-zinc-200"
      >
        {children}
      </button>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full z-50 mt-1.5 ${panelClassName} rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left font-normal normal-case leading-snug shadow-lg dark:border-zinc-700 dark:bg-zinc-800`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
