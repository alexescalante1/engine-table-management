"use client";

/**
 * Stepper — control numérico con el número TECLEABLE y clamp a [min, max]. AGNÓSTICO (no
 * conoce la unidad). Render-only. El consumidor pone la etiqueta y los presets alrededor.
 *
 * Dos disposiciones (`controls`):
 *  · "split" (default): [−] N [+] — simétrico, para contadores (Porciones/Personas).
 *  · "trailing": N a la IZQUIERDA + [−][+] juntos a la DERECHA — patrón number-input de
 *    formulario (Carbon/NN-g): el valor donde empieza el ojo, ± juntos = ajuste repetido
 *    sin cruzar el número (Fitts). Lo usa el Descuento de promos.
 *
 * `prefix`/`suffix` (ej. "−" / "%") se pintan con la MISMA tipografía/color del número,
 * pegados (el grupo "−12%" se lee como una cifra; el input se auto-ajusta por `size`).
 * `emptyLabel`: si `value === min`, placeholder ("—") = "sin valor".
 * `tone`: "emerald" = número/afijos esmeralda (descuento = ahorro); "amber" = alerta
 * (borde warning + número ámbar, ej. bajo costo). Default: número zinc, borde estándar.
 */
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { getWrapperBorderClasses, getBgClasses } from "./input-styles";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Si `value === min`, se muestra este placeholder ("—") = "sin valor". */
  emptyLabel?: string;
  /** Signo/etiqueta ANTES del número, misma letra (ej. "−"). */
  prefix?: string;
  /** Unidad DESPUÉS del número, misma letra (ej. "%"). */
  suffix?: string;
  /** Disposición de los ±: "split" = [−] N [+] (default) · "trailing" = N … [−][+]. */
  controls?: "split" | "trailing";
  /** "emerald" tiñe número+afijos (ahorro); "amber" alerta (borde warning + número ámbar). */
  tone?: "amber" | "emerald";
  ariaLabel?: string;
}

// h-7 → caja total ~38px = misma altura que las cajas de input (InputText/InputNumber).
const BTN =
  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

export default function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  emptyLabel,
  prefix,
  suffix,
  controls = "split",
  tone,
  ariaLabel,
}: StepperProps) {
  // `draft` = texto mientras se edita (puede quedar "" para vaciar y reescribir); null = no editando.
  // Se permite vaciar; el clamp del mínimo se aplica AL SALIR (blur), no en cada tecla → tecleable de verdad.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (v: number): void => onChange(Math.max(min, Math.min(max, v)));
  const isEmpty = emptyLabel != null && value === min;
  const editing = draft !== null;
  const shown = editing ? draft : isEmpty ? "" : String(value);

  // Borde/fondo/focus IDÉNTICOS a las cajas de input (helpers compartidos de input-styles):
  // idle zinc-300, focus sky + ring; "amber" mapea al tone "warning" del sistema (mismo ámbar).
  const boxTone = getWrapperBorderClasses({ tone: tone === "amber" ? "warning" : undefined });
  const numTone = tone === "amber"
    ? "text-amber-600 dark:text-amber-400"
    : tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-zinc-900 dark:text-zinc-100";

  // Con afijos el input se AUTO-AJUSTA al contenido (attr `size`) → "−12%" pegado, sin aire.
  const tight = prefix != null || suffix != null;
  const affixCls = `shrink-0 text-lg font-bold leading-none ${numTone}`;

  const minusBtn = (
    <button type="button" aria-label="restar" onClick={() => commit(value - step)} disabled={value <= min} className={BTN}>
      <Minus className="h-3.5 w-3.5" />
    </button>
  );
  const plusBtn = (
    <button type="button" aria-label="sumar" onClick={() => commit(value + step)} disabled={value >= max} className={BTN}>
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
  // Número + afijos agrupados SIN gap: se leen como UNA cifra (el gap-1 del contenedor
  // solo separa el grupo de los botones ±).
  // En "trailing" el grupo numérico ocupa el espacio libre y CENTRA la cifra (con un
  // mínimo de ancho para que el centrado se vea aun con 1 dígito).
  const numGroup = (
    <span className={`flex items-center px-1 ${controls === "trailing" ? "min-w-[3.25rem] flex-1 justify-center" : ""}`}>
      {prefix && <span className={affixCls}>{prefix}</span>}
      <input
        value={shown}
        placeholder={isEmpty && !editing ? emptyLabel : undefined}
        onFocus={() => setDraft(isEmpty ? "" : String(value))}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "");
          if (d === "") {
            setDraft(""); // permite dejar el campo vacío para reescribir
            return;
          }
          const n = Math.min(max, parseInt(d, 10)); // clamp del tope en vivo (no deja pasar > max)
          setDraft(String(n));
          commit(n);
        }}
        onBlur={() => {
          commit(draft == null || draft === "" ? min : parseInt(draft, 10)); // vacío al salir → mínimo
          setDraft(null);
        }}
        inputMode="numeric"
        aria-label={ariaLabel}
        // Con suffix: ancho fijo chico + text-right → el número pega con la unidad ("12%")
        // y el grupo entero se centra como UNA cifra. Sin afijos: centrado clásico.
        className={`bg-transparent text-lg font-bold tabular-nums placeholder:text-zinc-300 focus:outline-none dark:placeholder:text-zinc-600 ${tight ? "w-7 px-0 text-right" : "w-10 text-center"} ${numTone}`}
      />
      {suffix && <span className={affixCls}>{suffix}</span>}
    </span>
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // "trailing" = campo de formulario → caja a TODO el ancho (como cualquier input);
      // "split" = contador inline (Porciones) → abraza su contenido.
      className={`${controls === "trailing" ? "flex w-full" : "inline-flex"} items-center gap-1 rounded-lg border ${getBgClasses()} px-1.5 py-1 transition-colors duration-150 focus-within:outline-none focus-within:ring-2 ${boxTone}`}
    >
      {controls === "trailing" ? (
        <>
          {numGroup}
          {minusBtn}
          {plusBtn}
        </>
      ) : (
        <>
          {minusBtn}
          {numGroup}
          {plusBtn}
        </>
      )}
    </div>
  );
}
