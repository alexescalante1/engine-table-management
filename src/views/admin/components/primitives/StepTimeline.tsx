"use client";

/**
 * StepTimeline — selector "línea de tiempo" tipo SLIDER de pasos discretos. N opciones
 * sobre un eje; la elegida es un handle que se rellena y la pista se pinta hasta él.
 * AGNÓSTICO al número de opciones — la posición de cada nodo es `índice / (n − 1)`.
 *
 * Interacción: TODO el componente (pista + etiquetas) es UN solo control por PROXIMIDAD
 * — click o arrastre en cualquier punto (incluido sobre el texto) salta al nodo más
 * cercano; teclado con ←/→. Por eso es `role="slider"` y los nodos/labels son visuales.
 *
 * §14.2 primitive de interacción densa (timeline, igual que `DayTimeline`): la posición
 * es un PORCENTAJE calculado → `left`/`width` van por `style` inline (Tailwind no genera
 * clases arbitrarias computadas; es la única vía). Acotado a esas props y documentado.
 */
import { useRef } from "react";

export interface StepTimelineOption {
  value: string;
  label: string;
}

interface StepTimelineProps {
  options: readonly StepTimelineOption[];
  value: string;
  onChange: (value: string) => void;
  /** Etiqueta accesible del slider (copy del consumidor — el primitivo es agnóstico). */
  ariaLabel?: string;
}

export default function StepTimeline({ options, value, onChange, ariaLabel }: StepTimelineProps) {
  const n = options.length;
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const posPct = (i: number): number => (n > 1 ? (i / (n - 1)) * 100 : 0);
  const trackRef = useRef<HTMLDivElement>(null);

  /** Índice del nodo más cercano a la X del puntero (sobre el ancho real de la pista). */
  function indexFromX(clientX: number): number {
    const el = trackRef.current;
    if (!el || n <= 1) return selectedIndex;
    const rect = el.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
  }
  /**
   * Click + arrastre: salta al nodo más cercano. Compara con el ÚLTIMO índice aplicado
   * (`last`, local al arrastre) — NO con `value` del closure del pointerdown, que quedaba
   * STALE y bloqueaba volver al nodo inicial al jalar de regreso.
   */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.currentTarget.focus();
    let last = selectedIndex;
    const apply = (clientX: number): void => {
      const idx = indexFromX(clientX);
      if (idx !== last) {
        last = idx;
        onChange(options[idx].value);
      }
    };
    apply(e.clientX);
    const onMove = (ev: PointerEvent): void => apply(ev.clientX);
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const idx = Math.max(0, Math.min(n - 1, selectedIndex + dir));
    if (options[idx].value !== value) onChange(options[idx].value);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      aria-valuenow={selectedIndex}
      aria-valuetext={options[selectedIndex]?.label}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      // `px-8`: achica el ancho interno (pista + nodos + labels) → los nodos extremos
      // quedan hacia adentro y sus labels CENTRADOS (1º y último) no se cortan en el borde.
      className="group cursor-grab touch-none select-none px-8 py-1 focus:outline-none active:cursor-grabbing"
    >
      {/* Pista + relleno + nodos (todo VISUAL; el contenedor de arriba captura el puntero). */}
      <div ref={trackRef} className="pointer-events-none relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-emerald-500 transition-[width] duration-150"
          // ancho dinámico del relleno (timeline §14.2)
          style={{ width: `${posPct(selectedIndex)}%` }}
        />
        {options.map((opt, i) => {
          const selected = i === selectedIndex;
          const reached = i <= selectedIndex;
          return (
            <span
              key={opt.value || `step-${i}`}
              // posición dinámica del nodo (timeline §14.2)
              style={{ left: `${posPct(i)}%` }}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
                selected
                  ? "h-4 w-4 bg-emerald-500 shadow ring-4 ring-emerald-500/20 group-focus-visible:ring-emerald-400/70"
                  : reached
                    ? "h-2.5 w-2.5 bg-emerald-500"
                    : "h-2.5 w-2.5 border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
              }`}
            />
          );
        })}
      </div>

      {/* Etiquetas: VISUALES (resaltan según el nodo elegido; seleccionables por proximidad
          desde el slider de arriba). TODAS centradas en su nodo; el `px-8` del contenedor
          reserva el aire para que las extremas (1ª/última) no se corten. */}
      <div className="pointer-events-none relative mt-2 h-4">
        {options.map((opt, i) => {
          const selected = i === selectedIndex;
          return (
            <span
              key={opt.value || `lbl-${i}`}
              // posición dinámica del label (timeline §14.2)
              style={{ left: `${posPct(i)}%` }}
              className={`absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] leading-none transition-colors ${
                selected ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {opt.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
