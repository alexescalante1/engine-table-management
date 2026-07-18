"use client";

/**
 * DateWindowPicker — selector de VENTANA DE FECHAS con 3 modos (Siempre / Un día /
 * Rango), espejo del patrón de DISPONIBILIDAD (ScheduleEditor). El modo se DERIVA de
 * las fechas; al cambiarlo se SIEMBRA. El esquema (from/until, "YYYY-MM-DD" | "")
 * cubre los 3 sin campos extra.
 *
 * Presentacional y agnóstico del dominio: sirve a la vigencia del combo, la ventana de
 * oferta, y futuras (promos). El copy (intro + aviso de vencido) es inyectable.
 */
import RangeCalendar from "./RangeCalendar";

/** Fecha de HOY en ISO local "YYYY-MM-DD" — semilla al cambiar a "un día"/"rango". */
function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

interface Props {
  /** Fecha inicio "YYYY-MM-DD" | "" (sin fecha). */
  from: string;
  /** Fecha fin "YYYY-MM-DD" | "" (sin fecha). */
  until: string;
  /** Emite el par (from, until); "" = sin fecha. */
  onChange: (from: string, until: string) => void;
  /** Texto guía arriba de los radios (contexto de qué programa la ventana). */
  intro?: string;
  /** Aviso cuando la ventana YA venció. Recibe modo + fecha dd/mm/yyyy. */
  expired?: (mode: "single" | "range", date: string) => string;
  /** "Hoy" en ISO, ya resuelto por el caller (ej. TZ del negocio). Opcional — sin
   *  él, cae al reloj del dispositivo (agnóstico, comportamiento histórico intacto). */
  today?: string;
}

export default function DateWindowPicker({ from, until, onChange, intro, expired, today: todayProp }: Props) {
  const mode: "always" | "single" | "range" =
    !from && !until ? "always" : from && from === until ? "single" : "range";
  const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
  const today = todayProp ?? todayISO();
  const isExpired = mode === "single" ? !!from && from < today : mode === "range" ? !!until && until < today : false;
  // Microcopy: instrucción mientras falta elegir, o aviso si ya venció.
  const hint = isExpired && mode !== "always"
    ? (expired ? expired(mode, mode === "single" ? fmt(from) : fmt(until)) : "")
    : mode === "single" ? (from ? "" : "Elige el día.")
      : mode === "range" ? (!from ? "Elige la fecha de inicio." : !until ? "Ahora elige la fecha de fin." : "")
        : "";
  const OPTS = [
    { key: "always" as const, label: "Siempre", onSelect: () => onChange("", "") },
    { key: "single" as const, label: "Un día", onSelect: () => { const d = from || until || todayISO(); onChange(d, d); } },
    { key: "range" as const, label: "Rango de fechas", onSelect: () => { if (mode === "range") return; onChange(from || until || todayISO(), ""); } },
  ];

  return (
    <div className="space-y-3">
      {intro && <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{intro}</p>}
      {/* Radios — mismo patrón que Disponibilidad (ScheduleEditor) */}
      <div role="radiogroup" className="flex items-center justify-between gap-2">
        {OPTS.map((o) => {
          const sel = mode === o.key;
          return (
            <button key={o.key} type="button" role="radio" aria-checked={sel} onClick={o.onSelect} className="group flex items-center gap-2 py-1 text-sm focus:outline-none">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all group-focus-visible:ring-2 group-focus-visible:ring-emerald-400/60 group-focus-visible:ring-offset-1 group-focus-visible:ring-offset-white dark:group-focus-visible:ring-offset-zinc-900 ${sel ? "border-emerald-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                {sel && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </span>
              <span className={sel ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}>{o.label}</span>
            </button>
          );
        })}
      </div>
      {/* Un solo calendario inline (single o range) */}
      {mode !== "always" && (
        <>
          <RangeCalendar mode={mode} from={from} until={until} onChange={onChange} today={today} />
          {hint && (
            <p className={`text-[11px] ${isExpired ? "text-rose-500 dark:text-rose-400" : "text-zinc-400 dark:text-zinc-500"}`}>
              {hint}
            </p>
          )}
        </>
      )}
    </div>
  );
}
