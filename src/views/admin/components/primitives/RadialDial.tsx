"use client";

/**
 * RadialDial — selector RADIAL (perilla/reloj) de un valor numérico. El handle recorre
 * el anillo; click o arrastre sobre el anillo fija el valor por ÁNGULO, snapeado a `step`
 * y clampeado a [min, max]. Una vuelta completa = [min, max]; arranca en las 12 en punto.
 *
 * AGNÓSTICO: no conoce la unidad ("minutos", "personas"…). El consumidor pinta el centro
 * vía `children` (número editable, etiqueta) y aporta el copy accesible (`ariaLabel`/
 * `ariaValueText`). Reusable para cualquier valor radial.
 *
 * §14.2 primitivo de interacción densa (igual que StepTimeline/DayTimeline). La geometría va
 * por ATRIBUTOS SVG (cx/cy/stroke-dashoffset) — sin `style` inline ni clases computadas.
 *
 * Seam-guard del arrastre: cruzar el tope (max↔min por la costura de las 12) NO salta — el
 * valor "pega" en el extremo (perilla, no rueda infinita). El click inicial sí salta libre.
 */
import { useRef } from "react";

interface RadialDialProps {
  value: number;
  onChange: (value: number) => void;
  /** Valor en las 12 en punto (inicio). Default 0. */
  min?: number;
  /** Valor en una vuelta completa. */
  max: number;
  /** Incremento de snap. Default 1. */
  step?: number;
  /** Diámetro en px. Default 160. */
  size?: number;
  /** Grosor del anillo en px. Default 10. */
  stroke?: number;
  ariaLabel?: string;
  /** Texto humano del valor para lectores (el consumidor formatea). */
  ariaValueText?: string;
  disabled?: boolean;
  /** Contenido del centro (el consumidor lo provee — agnóstico). */
  children?: React.ReactNode;
}

export default function RadialDial({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  size = 160,
  stroke = 10,
  ariaLabel,
  ariaValueText,
  disabled = false,
  children,
}: RadialDialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const range = max - min;
  const c = size / 2;
  const handleR = stroke * 0.72;
  const r = c - handleR - 3; // el anillo cede sitio al handle (radio + borde) → no se recorta en el borde del SVG
  const circ = 2 * Math.PI * r;

  const clamped = Math.max(min, Math.min(max, value));
  const progress = range > 0 ? (clamped - min) / range : 0;
  const ang = progress * 2 * Math.PI - Math.PI / 2; // desde las 12, horario
  const hx = c + r * Math.cos(ang);
  const hy = c + r * Math.sin(ang);

  /** Puntero (cliente) → valor snapeado y clampeado, por ángulo desde el centro real del SVG. */
  function valueFromPointer(clientX: number, clientY: number): number {
    const el = svgRef.current;
    if (!el || range <= 0) return clamped;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0 = arriba, horario
    if (deg < 0) deg += 360;
    const raw = min + (deg / 360) * range;
    const snapped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, snapped));
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>): void {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.focus();
    // Click inicial: salta libre. `last` (local al arrastre, ≠ closure stale) ancla el seam-guard.
    let last = valueFromPointer(e.clientX, e.clientY);
    if (last !== clamped) onChange(last);
    const onMove = (ev: PointerEvent): void => {
      const v = valueFromPointer(ev.clientX, ev.clientY);
      if (Math.abs(v - last) > range / 2) return; // costura max↔min: no saltar
      if (v !== last) {
        last = v;
        onChange(v);
      }
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>): void {
    if (disabled) return;
    let next = clamped;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        next = clamped + step;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        next = clamped - step;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    next = Math.max(min, Math.min(max, next));
    if (next !== clamped) onChange(next);
  }

  return (
    <div className="relative inline-flex select-none">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={ariaValueText}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={`touch-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
          disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        {/* pista */}
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-zinc-200 dark:stroke-zinc-700" />
        {/* relleno (arco) — rota -90 para arrancar en las 12 */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          transform={`rotate(-90 ${c} ${c})`}
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-150"
        />
        {/* handle */}
        <circle cx={hx} cy={hy} r={handleR} strokeWidth={3} className="fill-white stroke-emerald-500 dark:fill-zinc-900" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}
