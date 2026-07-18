"use client";

/**
 * RangeCalendar — calendario mensual para elegir UNA fecha (`single`) o un RANGO
 * (`range`) en UN SOLO componente (sin dos inputs). Sin librerías: el grid se arma con
 * aritmética de `Date`, pero los valores viajan como strings ISO "YYYY-MM-DD"
 * ("" = vacío) — comparables lexicográficamente, sin husos.
 *
 * Navegación COMPLETA (3 vistas): días → click al título → meses → click al año → años
 * (bloque de 12). Elegir un año baja a meses; elegir un mes baja a días. Las flechas son
 * contextuales (mes / año / bloque de 12 años).
 *
 * Selección (range): DOS formas, intercambiables —
 *  - tap-tap: 1er tap fija el inicio (emite from, ""); 2º tap fija el otro extremo
 *    (ordena min/max); un 3er tap (con rango completo) reinicia.
 *  - arrastre (mouse o touch): presiona un día y arrastra → el rango se pinta en vivo
 *    hasta donde llegues; al soltar queda fijo. Pointer Events + `elementFromPoint`
 *    (en touch los enter/leave no disparan, así que se resuelve el día por coordenada).
 * En `single` un tap fija el día (o arrastra y suelta donde quieras).
 *
 * Lunes-primero (es-PE). El padre deriva el MODO del valor y siembra al cambiarlo
 * (espejo de `ScheduleEditor`); este componente es controlado y solo navega la vista.
 */
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;
const YEAR_BLOCK = 12; // años por pantalla en la vista de años

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
/** Posición del 1º del mes con LUNES=0 … DOMINGO=6. */
const firstWeekdayMon = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** Día (ISO) bajo una coordenada — para seguir el dedo/cursor durante el arrastre. */
function isoAtPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return el?.closest<HTMLElement>("[data-iso]")?.dataset.iso ?? null;
}

/** Click-click puro: dado el estado y el día tocado, devuelve el nuevo [from, until].
 *  single → ese día; range sin inicio o ya completo → reinicia inicio; con inicio → fija fin
 *  ordenado. Compartido por el tap de puntero y el de teclado (una sola fuente de verdad). */
function tapResult(mode: "single" | "range", from: string, until: string, iso: string): [string, string] {
  if (mode === "single") return [iso, iso];
  if (!from || (from && until)) return [iso, ""];
  return iso < from ? [iso, from] : [from, iso];
}

interface Props {
  mode: "single" | "range";
  from: string;
  until: string;
  onChange: (from: string, until: string) => void;
  /** "Hoy" en ISO "YYYY-MM-DD", ya resuelto por el caller (ej. TZ del negocio vía
   *  `businessDateKey`). Opcional — sin él, cae al reloj del dispositivo (agnóstico,
   *  comportamiento histórico intacto para callers que no conocen el país). */
  today?: string;
}

type ViewMode = "days" | "months" | "years";

export default function RangeCalendar({ mode, from, until, onChange, today: todayProp }: Props) {
  // Mes/año visible: el del valor existente, si no el actual (solo navegación/visual).
  const [view, setView] = useState(() => {
    const base = from || until;
    if (base) {
      const [y, m] = base.split("-").map(Number);
      return { y, m: m - 1 };
    }
    if (todayProp) {
      const [y, m] = todayProp.split("-").map(Number);
      return { y, m: m - 1 };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [viewMode, setViewMode] = useState<ViewMode>("days");

  // Estado del arrastre: `dragging` (monta/desmonta los listeners globales) + refs para
  // acceso síncrono dentro de ellos (sin re-suscribir). `stateRef`/`onChangeRef` dan el
  // valor MÁS RECIENTE a los listeners (que se montan una vez por gesto).
  const [dragging, setDragging] = useState(false);
  const anchorRef = useRef("");
  const movedRef = useRef(false);
  const lastIsoRef = useRef<string | null>(null);
  const stateRef = useRef({ mode, from, until });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    stateRef.current = { mode, from, until };
    onChangeRef.current = onChange;
  }, [mode, from, until, onChange]);

  const now = new Date();
  const todayISO = todayProp ?? toISO(now.getFullYear(), now.getMonth(), now.getDate());
  const [todayY, todayM] = todayProp
    ? (() => { const [y, m] = todayProp.split("-").map(Number); return [y, m - 1]; })()
    : [now.getFullYear(), now.getMonth()];

  /** Flecha ‹ ›: contextual al modo de vista (mes / año / bloque de 12 años). */
  function nav(delta: number) {
    if (viewMode === "days") {
      setView((v) => {
        const m = v.m + delta;
        return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
      });
    } else if (viewMode === "months") {
      setView((v) => ({ ...v, y: v.y + delta }));
    } else {
      setView((v) => ({ ...v, y: v.y + delta * YEAR_BLOCK }));
    }
  }

  /** Tap (sin arrastre) por teclado/puntero: aplica el click-click ordenado. */
  function tap(iso: string) {
    const [f, u] = tapResult(mode, from, until, iso);
    onChange(f, u);
  }

  function startDrag(iso: string, e: React.PointerEvent) {
    e.preventDefault();
    anchorRef.current = iso;
    movedRef.current = false;
    lastIsoRef.current = iso;
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const iso = isoAtPoint(e.clientX, e.clientY);
      if (!iso || iso === lastIsoRef.current) return; // mismo día o fuera del grid
      lastIsoRef.current = iso;
      movedRef.current = true; // salió del día ancla → es arrastre, no tap
      const { mode } = stateRef.current;
      const a = anchorRef.current;
      if (mode === "single") onChangeRef.current(iso, iso); // single sigue el dedo
      else if (iso === a) onChangeRef.current(a, ""); // volvió al ancla → inicio (no colapsa a "un día")
      else onChangeRef.current(iso < a ? iso : a, iso < a ? a : iso);
    };
    const up = () => {
      if (!movedRef.current) {
        // Tap puro (no se arrastró): aplica el click-click sobre el estado ACTUAL (intacto,
        // porque el arrastre no emite hasta moverse). Misma fuente que el tap de teclado.
        const s = stateRef.current;
        const [f, u] = tapResult(s.mode, s.from, s.until, anchorRef.current);
        onChangeRef.current(f, u);
      }
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging]);

  const offset = firstWeekdayMon(view.y, view.m);
  const total = daysInMonth(view.y, view.m);
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  const hasRange = !!(from && until && from !== until);
  const yearBlockStart = Math.floor(view.y / YEAR_BLOCK) * YEAR_BLOCK;

  const headerTitle =
    viewMode === "days" ? `${MONTHS[view.m]} ${view.y}`
      : viewMode === "months" ? `${view.y}`
        : `${yearBlockStart} – ${yearBlockStart + YEAR_BLOCK - 1}`;
  // Labels accesibles contextuales (la flecha/el título cambian de unidad según la vista).
  const prevLabel = viewMode === "days" ? "Mes anterior" : viewMode === "months" ? "Año anterior" : "Años anteriores";
  const nextLabel = viewMode === "days" ? "Mes siguiente" : viewMode === "months" ? "Año siguiente" : "Años siguientes";

  // Clase de un botón de mes/año (navegación, no selección de rango): activo (la vista
  // actual) sólido; hoy con anillo gris; resto neutro con hover.
  const navCellCls = (active: boolean, isNow: boolean) =>
    active
      ? "bg-emerald-500 font-semibold text-white"
      : isNow
        ? "ring-1 ring-inset ring-zinc-400 font-semibold text-zinc-600 hover:bg-zinc-100 dark:ring-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div className="select-none rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      {/* Cabecera: ‹ Título › — el título sube de nivel (días→meses→años). */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          aria-label={prevLabel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {viewMode === "years" ? (
          <span className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{headerTitle}</span>
        ) : (
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "days" ? "months" : "years")}
            aria-label={viewMode === "days" ? "Elegir mes y año" : "Elegir año"}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {headerTitle}
          </button>
        )}
        <button
          type="button"
          onClick={() => nav(1)}
          aria-label={nextLabel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Altura fija → no salta al cambiar de vista ni entre meses de 5/6 semanas. */}
      <div className="min-h-[260px]">
      {/* ── Vista AÑOS: bloque de 12 ── */}
      {viewMode === "years" && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: YEAR_BLOCK }, (_, k) => yearBlockStart + k).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => { setView((v) => ({ ...v, y })); setViewMode("months"); }}
              className={`flex h-12 items-center justify-center rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${navCellCls(y === view.y, y === todayY)}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Vista MESES: los 12 del año visible ── */}
      {viewMode === "months" && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_SHORT.map((mn, m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setView((v) => ({ ...v, m })); setViewMode("days"); }}
              className={`flex h-12 items-center justify-center rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${navCellCls(m === view.m, view.y === todayY && m === todayM)}`}
            >
              {mn}
            </button>
          ))}
        </div>
      )}

      {/* ── Vista DÍAS ── */}
      {viewMode === "days" && (
        <>
          {/* Encabezado de días (lunes-primero) */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="py-1 text-center text-[11px] font-medium text-zinc-400">
                {w}
              </span>
            ))}
          </div>

          {/* Grid de días — gap vertical: cada tramo de semana del rango es una píldora redondeada. */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="h-9" />;
              const iso = toISO(view.y, view.m, d);
              const isStart = iso === from && from !== "";
              const isEnd = iso === until && until !== "";
              const isEndpoint = isStart || isEnd;
              const inRange = hasRange && iso > from && iso < until;
              const past = iso < todayISO; // ya pasó → plomo / rojo
              const today = iso === todayISO;
              const soloInicio = isStart && !hasRange; // un día (single) o inicio a-medias
              // Redondeo de esquinas: cierra cada SEGMENTO DE FILA (primer/último día de la semana)
              // además de los extremos reales → cada tramo del rango se ve como píldora redondeada.
              const col = i % 7;
              const edgeL = isStart || col === 0; // extremo IZQUIERDO del segmento de fila
              const edgeR = isEnd || col === 6; // extremo DERECHO
              const roundL = edgeL ? "rounded-l-lg" : "";
              const roundR = edgeR ? "rounded-r-lg" : "";
              // Aire lateral: en los extremos de cada segmento del rango y en los días sueltos;
              // el interior del rango va SIN margen → la banda sigue continua (sin huecos).
              const inBand = isEndpoint || inRange;
              const ml = !inBand || edgeL ? "ml-0.5" : "";
              const mr = !inBand || edgeR ? "mr-0.5" : "";

              // Color por VIGENCIA del propio día: pasado → rojo, hoy/futuro → verde. Un rango a
              // medio transcurrir se ve rojo→verde con el corte en "hoy".
              let cls: string;
              if (isEndpoint) {
                // Extremo (un día, o inicio/fin del rango) = rectángulo SÓLIDO, número blanco.
                const solid = past ? "bg-rose-500" : "bg-emerald-500";
                cls = `${solid} font-semibold text-white ${soloInicio ? "rounded-lg" : `${roundL} ${roundR}`}`;
              } else if (inRange) {
                // Interior del rango = FONDO relleno; redondea en los cortes de fila.
                // Dark: el `-900/30` se perdía sobre el negro (sobre todo el verde). Usar el tono
                // MEDIO (-500) con baja opacidad da un tinte perceptible que combina con el extremo sólido.
                const band = past
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200";
                cls = `${band} font-medium ${roundL} ${roundR}`;
              } else if (today) {
                cls = "rounded-lg ring-1 ring-inset ring-zinc-400 font-semibold text-zinc-600 hover:bg-zinc-100 dark:ring-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800";
              } else if (past) {
                cls = "rounded-lg text-zinc-300 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:bg-zinc-800";
              } else {
                cls = "rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";
              }

              // `data-iso` + `touch-none`: el arrastre se resuelve por coordenada (toda la celda) y
              // no dispara scroll táctil. El día llena la celda → todo el rectángulo es el target.
              return (
                <button
                  key={i}
                  type="button"
                  data-iso={iso}
                  aria-label={`${d} de ${MONTHS[view.m]} ${view.y}`}
                  aria-pressed={isEndpoint || inRange}
                  aria-current={today ? "date" : undefined}
                  onPointerDown={(e) => startDrag(iso, e)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(iso); } }}
                  className={`flex h-9 touch-none items-center justify-center text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${ml} ${mr} ${cls}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
