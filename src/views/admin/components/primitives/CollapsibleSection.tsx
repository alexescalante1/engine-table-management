"use client";

/**
 * CollapsibleSection — sección colapsable para forms largos (progressive disclosure).
 *
 * Diseñada para los modales de carga (productos/combos): las secciones opcionales
 * colapsan por defecto y muestran un RESUMEN vivo en el header (la data nunca se
 * esconde, solo se compacta). El contenido queda SIEMPRE montado (oculto por CSS):
 * los children conservan su estado local (inputs a medio tipear) al colapsar.
 *
 * `forceOpen` (errores de validación) abre por encima del estado del usuario sin
 * pisarlo: al volver a false, la sección regresa a como el usuario la dejó.
 * El reset a `defaultOpen` ocurre solo por remount (el Modal desmonta al cerrar).
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Modo FLUSH: en forms donde las secciones se apilan SIN `space-y` en el padre (el
 * `border-t` es el único separador), el header usa padding simétrico arriba+abajo →
 * toda la fila colapsada es UN área clickeable de borde a borde (no queda margin muerto
 * abajo). Se activa envolviendo el form en `<FlushCollapsibles>`; los consumidores que
 * NO lo proveen (combos/promos con `space-y`) conservan el layout actual.
 */
const FlushContext = createContext(false);

export function FlushCollapsibles({ children }: { children: ReactNode }) {
  return <FlushContext.Provider value={true}>{children}</FlushContext.Provider>;
}

interface CollapsibleSectionProps {
  title: string;
  /** Resumen del contenido — visible SOLO colapsada. */
  summary?: ReactNode;
  /** Nodo a la derecha del título (contador "2/6"), visible siempre. */
  counter?: ReactNode;
  defaultOpen?: boolean;
  /** Apertura forzada (p. ej. sección con error al guardar). */
  forceOpen?: boolean;
  /**
   * Estilo del contenedor:
   * - `"divider"` (default): línea `border-t`, para apilar secciones en un form largo.
   * - `"card"`: panel redondeado con borde + hover, se lee como un control tappable.
   */
  variant?: "divider" | "card";
  /**
   * Modo CONTROLADO (opcional): si se pasa `open`, el padre maneja la apertura — útil
   * para un acordeón exclusivo donde abrir uno cierra los otros. Omitir = estado interno.
   */
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  summary,
  counter,
  defaultOpen = false,
  forceOpen = false,
  variant = "divider",
  open: openProp,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const flush = useContext(FlushContext);
  const [userOpen, setUserOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = forceOpen || (openProp ?? userOpen);
  const isCard = variant === "card";

  // Overflow: clipa durante la animación (reveal limpio) y al cerrar; pero cuando la
  // sección ya está ABIERTA y asentada (fin de la transición), pasa a `overflow-visible`
  // → los tooltips/popovers de adentro NO se recortan por el contenedor de la animación.
  // Reset al cerrar vía patrón "derived state" en render (sin effect, guardado por `prevOpen`).
  const [overflowVisible, setOverflowVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setOverflowVisible(false); // al cerrar, recorta de inmediato
  }

  function toggle(): void {
    if (isControlled) onToggle?.();
    // Invierte lo MOSTRADO (`open`), no `userOpen`: si `forceOpen` abrió la sección sin
    // tocar `userOpen`, basarse en `prev` pedía 2 clics (el 1º re-sincronizaba sin verse).
    else setUserOpen(!open);
  }

  // Padding del header (área clickeable). Ancho EXACTO del contenedor (sin `-mx`, que hacía
  // sobresalir el hover/focus-ring 8px a cada lado → se veía "más ancho" que la sección):
  //  · card     → `py-3` dentro del panel.
  //  · flush    → `py-3` simétrico: el padre NO tiene `space-y`, así que TODO el alto de la
  //               fila colapsada es el botón → clickeable arriba Y abajo (sin margin muerto).
  //  · divider  → `pt-4 pb-1`: el padre aporta `space-y` abajo (no clickeable); compat. actual.
  const headerPad = isCard
    ? "px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    : flush
      ? "py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      : "pb-1 pt-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40";

  return (
    <section className={isCard ? "rounded-xl border border-zinc-200 dark:border-zinc-700" : "border-t border-zinc-200 dark:border-zinc-700"}>
      {/* Header = botón a TODO el ancho: el área tappable cubre la fila entera, no solo el
          texto. En `flush` (padre sin `space-y`) el `py-3` simétrico hace clickeable arriba
          y abajo de borde a borde. `cursor-pointer` + hover = afordancia en desktop. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg text-left transition-colors focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-800/40 ${headerPad}`}
      >
        <span className="flex shrink-0 items-center gap-2">
          {/* Título en verde cuando está EXPANDIDO → señal clara de qué secciones siguen
              abiertas en un form largo (el chevron rotado refuerza). Colapsado = gris.
              Foco por teclado (Tab) → DORADO (sin caja/ring): el `group-focus-visible` del
              botón tiñe el título; el fondo sutil refuerza. Pisa el verde/gris mientras enfoca. */}
          <h3 className={`text-xs font-semibold uppercase tracking-wider transition-colors ${open ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"} group-focus-visible:text-amber-500 dark:group-focus-visible:text-amber-400`}>
            {title}
          </h3>
          {counter != null && <span className="text-[10px] text-zinc-400">{counter}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          {!open && summary != null && (
            <span className="truncate text-xs text-zinc-400">{summary}</span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}
          />
        </span>
      </button>
      {/* Children SIEMPRE montados (no pierden estado local). Animación de alto con
          grid-rows 0fr→1fr (CSS puro, sin medir el contenido); `overflow-hidden`
          recorta durante la transición; `inert` saca lo colapsado del tab-order. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        onTransitionEnd={(e) => { if (e.propertyName === "grid-template-rows" && open) setOverflowVisible(true); }}
      >
        <div className={overflowVisible ? "overflow-visible" : "overflow-hidden"} inert={!open || undefined}>
          <div className={isCard ? "space-y-3 px-5 pb-4 pt-1" : "space-y-3 pb-3 pt-2"}>{children}</div>
        </div>
      </div>
    </section>
  );
}
