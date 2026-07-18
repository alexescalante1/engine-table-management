"use client";

/**
 * DayTimeline — editor VISUAL de las franjas de UN día. AGNÓSTICO: entrada `windows`
 * ("HH:MM-HH:MM"), salida `onChange(next)`. Dos MODOS de interacción sobre el MISMO dato:
 *
 *  - mode="intervals" (default · categorías): N intervalos SEPARADOS e independientes.
 *      "+ Agregar intervalo" agrega otro · ✕ borra. Hasta `maxWindows`.
 *  - mode="work" (config/engine): UN intervalo de TRABAJO (apertura–cierre) con receso
 *      OPCIONAL cortado adentro. "Agregar/Quitar receso" parte/rellena el span. 1 o 2 ventanas.
 *
 * CRUCE DE MEDIANOCHE (wrap): el cierre del ÚLTIMO segmento (mayor `start`) puede pasar al
 * inicio del timeline → se guarda como `end < start` (ventana "18:00-02:00"). Al arrastrar el
 * handle de cierre al borde derecho y seguir, la bolita "revienta" y la cola aparece a la
 * izquierda (madrugada del día siguiente). Drag de ese handle = DELTA-based en espacio
 * EXTENDIDO (E > 1440 ⇒ wrap; realEnd = E − 1440) → continuo a través del cruce. El dato,
 * el render y los steppers usan valores reales. work+receso NO permite wrap (diferido).
 *
 * Cada borde es un HANDLE: arrastrable con mouse/touch y navegable con teclado (Tab + ←/→).
 * Steppers/teclado del cierre wrap-capable van por `moveWrapEnd` (E extendido); los demás por
 * `clampEdge` (snap 30 + clamp a vecinos/piso/hueco). Autocontenido (parse inline).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Coffee, Plus, Trash2 } from "lucide-react";
import { SCHEDULE_LIMITS } from "@/domain/entities/schedule";

interface DayTimelineProps {
  windows: readonly string[];
  onChange: (next: string[]) => void;
  /** Máx intervalos en mode="intervals" (default 3). Ignorado en mode="work" (1–2). */
  maxWindows?: number;
  /** Interacción: "intervals" (separados, default) | "work" (1 intervalo + receso opcional). */
  mode?: "intervals" | "work";
  /** Fuerza estilo dark (para contenedores dark-forzados como el onboarding). Default: system (`dark:`). */
  dark?: boolean;
  /**
   * Rango operativo del negocio para ESTE día (T2-4 categorías). Se dibuja como GUÍA visual
   * (naranja = fuera de horario, rayado = excede, ámbar = receso) — NO restrictiva: la selección
   * puede excederlo y al guardar el horario se amplía. Solo aplica a `mode="intervals"`; ausente
   * = sin guía (editor libre).
   */
  availableHours?: AvailableHours;
}

/** Rango operativo de un día (minutos). `wraps` ⇒ cruza medianoche (`end` real < `start`). */
interface AvailableHours {
  start: number;
  end: number;
  wraps: boolean;
  breaks?: readonly { start: number; end: number }[];
}

type Mode = "intervals" | "work";
type Edge = "start" | "end";

const STEP = SCHEDULE_LIMITS.WINDOW_STEP_MINUTES; // minutos por paso (stepper, drag-snap, teclado) — SSoT del motor temporal
const MIN_DUR = SCHEDULE_LIMITS.MIN_WINDOW_MINUTES; // duración mínima de una franja — misma SSoT que el reconcile
const DAY_END = 1440; // 24:00 en minutos
const MIN_LABEL_PX = 46; // ancho mínimo por label (cabe "12 AM") → densidad responsive
const LABEL_STEPS = [1, 2, 3, 4, 6, 12]; // intervalos candidatos (horas); todos dividen 24
const BURST_FRAC = 0.05; // resistencia de la bolita antes de "reventar" al wrap (fracción del ancho)

interface Seg {
  start: number;
  end: number;
}

function toMin(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}
function toHHMM(min: number): string {
  const v = Math.max(0, Math.min(DAY_END, min));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}
function parse(w: string): Seg {
  const [a, b] = w.split("-");
  return { start: toMin(a), end: toMin(b) };
}
function pct(min: number): number {
  return (min / DAY_END) * 100;
}
function tickLabel(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}
/** 540 → "9:00 AM"; 1440 → "12:00 AM". */
function label12(min: number): string {
  if (min >= DAY_END) return "12:00 AM";
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function byStart(a: string, b: string): number {
  return toMin(a.split("-")[0]) - toMin(b.split("-")[0]);
}
/** ¿El segmento cruza medianoche? (cola en el inicio del timeline). */
function isWrap(s: Seg): boolean {
  return s.end < s.start;
}
/** (R7 cola · R6 gate) Tope de la cola de madrugada del wrap: no pisa el primer segmento (segs ordenado por start). */
function wrapHeadMax(segs: Seg[]): number {
  return segs[0].start - STEP;
}
/**
 * (R5 + R6) Índice del segmento cuyo cierre PUEDE cruzar medianoche = el último (mayor start); work+receso lo
 * deshabilita (R9). Exige ADEMÁS lugar para una cola de madrugada con hueco (`wrapHeadMax ≥ STEP` ⇔ apertura ≥ 2·STEP):
 * si la apertura está pegada a medianoche, wrappear es imposible → el cierre vuelve a ser un handle normal hasta 24:00.
 * Esto permite marcar **24h** estable (sin el salto a 23:30 ni la bolita "fantasma" que reventaba sin wrappear).
 */
function wrapIndex(segs: Seg[], mode: Mode): number {
  const idx = mode === "work" ? (segs.length === 1 ? 0 : -1) : segs.length - 1;
  if (idx < 0) return -1;
  return wrapHeadMax(segs) >= STEP ? idx : -1;
}
/** Cierre en espacio EXTENDIDO: si el seg ya wrapea, su cierre real vive en [0,start) → +1440 para continuidad. */
function endExt(s: Seg): number {
  return s.end < s.start ? s.end + DAY_END : s.end;
}

/* ═══════════════════ INVARIANTES — reglas del componente, SIEMPRE verdaderas tras cualquier operación ═══════════════════
 * El componente es AGNÓSTICO pero GARANTIZA estas reglas sobre el dato que emite. TODA entrada (drag, stepper, teclado,
 * +intervalo, receso) pasa por una de estas fuentes → ningún estado inválido se puede construir desde la UI.
 * (Verificado por simulación exhaustiva: barrido de TODAS las ops sobre TODOS los estados + sweep del cierre wrap.)
 *
 *  R1  SNAP         · todo borde es múltiplo de STEP (30 min).               → clampEdge / moveWrapEnd (round(·/STEP)*STEP)
 *  R2  RANGO        · todo borde ∈ [0, 1440].                                → edgeBounds (min/max) + toHHMM (clamp)
 *  R3  DUR. MÍNIMA  · cada franja ≥ MIN_DUR (30). no-wrap: end−start≥30.     → edgeBounds (max=end−MIN, min=start+MIN)
 *                     wrap: noche [start,1440]≥30 (start≤1410) ∧
 *                     madrugada [0,end]≥30 (end≥STEP).                        → edgeBounds-wrap (max=1410, min=STEP) + moveWrapEnd.lo
 *  R4  HUECO        · franjas adyacentes separadas ≥ STEP (tocarse = 1).     → edgeBounds (gap) + addInterval (mid acotado)
 *  R5  UN WRAP      · solo el seg de MAYOR start cruza medianoche.           → wrapIndex (idx = último)
 *  R6  WRAP C/LUGAR · wrap-capable ⟺ wrapHeadMax≥STEP (apertura≥2·STEP).     → wrapIndex (gate); si no ⇒ cierre normal a 24:00 (24h)
 *  R7  NO-CRUCE     · wrap: apertura≥end+gap ∧ cola≤start−gap ⇒ hueco        → edgeBounds start-wrap (min) + wrapHeadMax (cola)
 *                     cerrado [end,start] ≥ gap (nunca colapsa/des-wrapea).
 *  R8  CIRCULAR     · con wrap, el 1er seg empieza ≥ wrap.end+gap            → edgeBounds start (i==0 ∧ lastWraps)
 *                     (su cola de madrugada no pisa el primer intervalo).
 *  R9  WORK         · 1 intervalo + receso opcional (≤2 segs); wrap SOLO     → wrapIndex (work: solo len 1) + WorkControls
 *                     con 1 seg (wrap+receso es data-ambiguo, diferido).
 *  R10 INTERVALS    · hasta maxWindows segs separados.                       → addInterval (guard de length)
 *  R11 ORDEN        · la salida sale ORDENADA por start.                     → emit (sort)
 *  R12 MEDIANOCHE   · cierre-medianoche llega como "24:00" (end=1440,        → contrato del consumidor
 *                     no-wrap); "00:00"-cierre sería wrap de cola vacía.       (shiftsToWindows / catálogo `sc` usan "24:00")
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Rango válido [min,max] de un borde según vecinos/piso/hueco — fuente única para clamp + ARIA. Aplica R2/R3/R4/R7/R8. */
function edgeBounds(segs: Seg[], i: number, edge: Edge): { min: number; max: number } {
  const floor = 0; // cualquier hora de apertura (incl. 24h y madrugada). El piso 5am era del hack viejo de calcTotalHours (retirado).
  const gap = STEP; // (R4) siempre ≥30 min entre franjas adyacentes (tocarse = serían una sola franja)
  const wrap = isWrap(segs[i]);
  const last = segs[segs.length - 1];
  const lastWraps = isWrap(last); // (R5) el último (mayor start) es el único que puede cruzar medianoche
  if (edge === "start") {
    let min = i > 0 ? segs[i - 1].end + gap : floor; // (R4) hueco con el vecino izquierdo
    if (wrap) {
      // (R7) Este segmento cruza medianoche: su apertura (noche) NO puede entrar en su propia cola
      // de madrugada → siempre queda un hueco cerrado [end, start] ≥ gap. Sin esto, el start
      // cruzaba el end y des-wrapeaba con comportamiento raro.
      min = Math.max(min, segs[i].end + gap);
    } else if (i === 0 && lastWraps) {
      // (R8) Primer segmento no-wrap: no puede empezar dentro de la cola del wrap (vecino circular).
      min = Math.max(min, last.end + gap);
    }
    const max = wrap ? DAY_END - MIN_DUR : segs[i].end - MIN_DUR; // (R3) wrap: noche≥30 ⇒ apertura ≤23:30; no-wrap: deja MIN_DUR al cierre
    return { min, max };
  }
  // edge === "end"
  if (wrap) return { min: STEP, max: wrapHeadMax(segs) }; // (R3 madrugada≥STEP · R7 cola) cola de madrugada [STEP, primer start − gap]
  return { min: segs[i].start + MIN_DUR, max: i < segs.length - 1 ? segs[i + 1].start - gap : DAY_END }; // (R3 dur≥MIN · R4 gap derecho)
}
/** (R1 snap + R2/R3/R4 clamp) Valor de un borde: snap a STEP + clamp al rango válido. Fuente única drag/teclado/steppers. */
function clampEdge(segs: Seg[], i: number, edge: Edge, value: number): number {
  const { min, max } = edgeBounds(segs, i, edge);
  return Math.max(min, Math.min(max, Math.round(value / STEP) * STEP));
}
/** Etiqueta accesible del handle según el modo. */
function handleLabel(i: number, edge: Edge, mode: Mode, isReceso: boolean): string {
  if (mode === "work") {
    if (isReceso) return edge === "end" ? "Inicio del receso" : "Fin del receso";
    return i === 0 && edge === "start" ? "Apertura" : "Cierre";
  }
  return `${edge === "start" ? "Inicio" : "Fin"} del intervalo ${i + 1}`;
}

/** Editor visual de las franjas de un día. Delega SIEMPRE en `FreeDayTimeline`; con
 *  `availableHours` (categorías T2-4) este superpone la GUÍA del horario (display-only, NO
 *  restrictiva). Wrapper SIN hooks → cumple rules-of-hooks. */
export default function DayTimeline(props: DayTimelineProps) {
  // FreeDayTimeline maneja AMBOS: editor libre + (con `availableHours` en mode="intervals") la GUÍA
  // del horario del negocio, NO-restrictiva. Cruza medianoche en todos los casos (sistema de wrap
  // verificado). config/productos/promos NO pasan `availableHours` ⇒ comportamiento idéntico al previo.
  return <FreeDayTimeline {...props} />;
}

function FreeDayTimeline({ windows, onChange, maxWindows = 3, mode = "intervals", dark = false, availableHours }: DayTimelineProps) {
  // Ordenadas → barra, vecinos de los handles/steppers y filas quedan consistentes.
  const segs: Seg[] = [...windows].sort(byStart).map(parse);
  const wIdx = wrapIndex(segs, mode); // el cierre de este seg puede cruzar medianoche

  // Densidad RESPONSIVE: mide el ancho real del ruler y elige el intervalo de labels más fino.
  const rulerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const labelStep = useMemo(() => {
    if (width === 0) return 6; // pre-medición / SSR: fallback seguro
    return LABEL_STEPS.find((iv) => (24 / iv + 1) * MIN_LABEL_PX <= width) ?? 12;
  }, [width]);

  function emit(next: Seg[]) {
    // (R11) ordena por start + (R2) toHHMM clampa a [0,1440] antes de salir.
    onChange([...next].sort((a, b) => a.start - b.start).map((s) => `${toHHMM(s.start)}-${toHHMM(s.end)}`));
  }
  /** Cierre del segmento wrap-capable, en espacio EXTENDIDO (E). E>1440 ⇒ wrap (realEnd=E−1440). */
  function moveWrapEnd(i: number, E: number) {
    const s = segs[i];
    const lo = s.start + MIN_DUR; // (R3) el cierre no baja de start+MIN_DUR (dur mínima)
    const hi = DAY_END + wrapHeadMax(segs); // (R7) tope extendido: realEnd ≤ wrapHeadMax (cola con hueco)
    const Ec = Math.max(lo, Math.min(hi, Math.round(E / STEP) * STEP));
    const next = segs.map((x) => ({ ...x }));
    next[i].end = Ec > DAY_END ? Ec - DAY_END : Ec;
    emit(next);
  }
  /** Mueve UN borde. El cierre wrap-capable recibe `value` como E EXTENDIDO; el resto, valor real. */
  function moveEdge(i: number, edge: Edge, value: number) {
    if (edge === "end" && i === wIdx) {
      moveWrapEnd(i, value);
      return;
    }
    const next = segs.map((s) => ({ ...s }));
    next[i][edge] = clampEdge(segs, i, edge, value);
    emit(next);
  }
  /** Drag del borde. El cierre wrap-capable usa tracking DELTA-extendido + bolita; el resto, absoluto. */
  function startDrag(i: number, edge: Edge, e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.focus();
    const bar = handle.parentElement; // el knob es hijo directo de la barra
    if (!bar) return;
    const rect = bar.getBoundingClientRect();

    if (edge === "end" && i === wIdx) {
      // Cierre que puede cruzar medianoche: E (extendido) = E0 + delta del puntero → continuo.
      const s = segs[i];
      const E0 = endExt(s);
      const x0 = e.clientX;
      const burstPx = rect.width * BURST_FRAC;
      const lo = s.start + MIN_DUR;
      const hi = DAY_END + wrapHeadMax(segs);
      let lastReal = s.end;
      const onMove = (ev: PointerEvent) => {
        let E = E0 + ((ev.clientX - x0) / rect.width) * DAY_END;
        // Resistencia + crecida de la bolita antes de "reventar" al wrap (solo si arrancó no-wrap).
        if (E0 <= DAY_END && E > DAY_END) {
          const overPx = ((E - DAY_END) / DAY_END) * rect.width;
          if (overPx < burstPx) {
            // Solo `scale`: la clase `-translate-*` (propiedad `translate` en TW v4) ya centra.
            // Meter `translate(-50%,-50%)` acá lo duplicaría → el knob se iría arriba al crecer.
            handle.style.transform = `scale(${(1 + (overPx / burstPx) * 0.6).toFixed(3)})`;
            handle.style.borderColor = "#a78bfa"; // violet-400: "a punto de cruzar medianoche"
            E = DAY_END; // resiste en medianoche mientras la bolita crece
          } else {
            handle.style.transform = "";
            handle.style.borderColor = "";
          }
        } else {
          handle.style.transform = "";
          handle.style.borderColor = "";
        }
        const Ec = Math.max(lo, Math.min(hi, Math.round(E / STEP) * STEP));
        const realEnd = Ec > DAY_END ? Ec - DAY_END : Ec;
        if (realEnd === lastReal) return;
        lastReal = realEnd;
        const next = segs.map((x) => ({ ...x }));
        next[i].end = realEnd;
        emit(next);
      };
      const onUp = () => {
        handle.style.transform = "";
        handle.style.borderColor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }

    // Handle normal: mapeo absoluto (byte-idéntico al comportamiento previo).
    let lastV = segs[i][edge];
    const onMove = (ev: PointerEvent) => {
      const v = clampEdge(segs, i, edge, ((ev.clientX - rect.left) / rect.width) * DAY_END);
      if (v === lastV) return; // evita re-emisiones redundantes dentro del mismo paso
      lastV = v;
      const next = segs.map((s) => ({ ...s }));
      next[i][edge] = v;
      emit(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  /** Teclado: ←/↓ retrocede un paso, →/↑ avanza un paso. El cierre wrap-capable avanza en E extendido. */
  function onHandleKey(i: number, edge: Edge, e: React.KeyboardEvent<HTMLButtonElement>) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    if (edge === "end" && i === wIdx) moveWrapEnd(i, endExt(segs[i]) + dir * STEP);
    else moveEdge(i, edge, segs[i][edge] + dir * STEP);
  }

  // (R9) mode="work" con receso = hueco interno (ámbar) entre las 2 ventanas (nunca con wrap).
  const workBreak = mode === "work" && segs.length === 2 ? { start: segs[0].end, end: segs[1].start } : null;

  // ── GUÍA del horario del negocio (T2-4 categorías) — display-only, NO restrictivo ──
  // Naranja = fuera del horario operativo (al guardar el horario se AMPLÍA para cubrir, no bloquea);
  // rayado naranja = tramo de disponibilidad que excede; ámbar = receso. Espacio real (pct). Solo
  // se activa en mode="intervals" con `availableHours`; ausente ⇒ editor libre idéntico (config/
  // productos/promos). La edición sigue siendo libre (cruza medianoche): la guía solo informa.
  const guide = mode === "intervals" ? availableHours : undefined;
  const guideBlocked = guide
    ? guide.wraps
      ? [{ start: guide.end, end: guide.start }] // wrap → el medio cerrado [cierre, apertura]
      : [{ start: 0, end: guide.start }, { start: guide.end, end: DAY_END }] // no-wrap → los bordes
    : [];
  const guideBreaks = guide?.breaks ?? [];

  return (
    <div className="space-y-3">
      {/* ── Barra visual 00–24h con handles arrastrables (compartida) ── */}
      {/* px horizontal: deja aire para que los handles en los extremos (0%/100%) no se corten
          (el knob está centrado sobre su posición → su mitad sobresale del track). */}
      <div className="px-2.5">
        <div className={`relative h-2.5 rounded-full ${dark ? "bg-zinc-700" : "bg-zinc-200 dark:bg-zinc-700"}`}>
          {/* Guía: zona fuera del horario del negocio (naranja suave, BAJO el verde). Solo informa. */}
          {guideBlocked.map((b, i) =>
            b.end > b.start ? (
              <div key={`bl-${i}`} className="absolute inset-y-0" style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%`, background: "rgba(249,115,22,0.15)" }} />
            ) : null,
          )}
          {segs.flatMap((s, i) => {
            const cls = `absolute inset-y-0 rounded-full ${dark ? "bg-emerald-400" : "bg-emerald-500 dark:bg-emerald-400"}`;
            if (!isWrap(s)) {
              const style = { left: `${pct(s.start)}%`, width: `${Math.max(pct(s.end) - pct(s.start), 0.5)}%` };
              return [<div key={i} className={cls} style={style} />];
            }
            // Wrap: 2 piezas → [start → 24:00] (noche) + [0 → end] (madrugada).
            return [
              <div key={`${i}-pm`} className={cls} style={{ left: `${pct(s.start)}%`, width: `${Math.max(100 - pct(s.start), 0.5)}%` }} />,
              <div key={`${i}-am`} className={cls} style={{ left: "0%", width: `${Math.max(pct(s.end), 0.5)}%` }} />,
            ];
          })}
          {/* Guía: disponibilidad que EXCEDE el horario (rayado naranja, SOBRE el verde). NO bloquea. */}
          {guideBlocked.map((b, i) =>
            b.end > b.start ? (
              <div key={`ov-${i}`} className="absolute inset-y-0" style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%`, background: "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(249,115,22,0.55) 3px, rgba(249,115,22,0.55) 6px)" }} />
            ) : null,
          )}
          {/* Guía: receso del negocio (ámbar rayado, solo visual). */}
          {guideBreaks.map((b, i) => (
            <div key={`br-${i}`} className="absolute inset-y-0" style={{ left: `${pct(b.start)}%`, width: `${Math.max(pct(b.end) - pct(b.start), 0.5)}%`, background: "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(251,191,36,0.6) 2px, rgba(251,191,36,0.6) 4px)" }} />
          ))}
          {workBreak && (
            // Receso = hueco rayado ámbar dentro del intervalo de trabajo (posición dinámica).
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${pct(workBreak.start)}%`,
                width: `${Math.max(pct(workBreak.end) - pct(workBreak.start), 0.5)}%`,
                background:
                  "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(251,191,36,0.4) 2px, rgba(251,191,36,0.4) 4px)",
              }}
            />
          )}
          {/* Handles: un knob por borde, arrastrable (mouse/touch) y por teclado (Tab + ←/→). */}
          {segs.flatMap((s, i) =>
            (["start", "end"] as const).map((edge) => {
              const value = s[edge];
              const isReceso = mode === "work" && segs.length === 2 && ((i === 0 && edge === "end") || (i === 1 && edge === "start"));
              const b = edgeBounds(segs, i, edge);
              return (
                <button
                  key={`${i}-${edge}`}
                  type="button"
                  role="slider"
                  aria-label={handleLabel(i, edge, mode, isReceso)}
                  aria-orientation="horizontal"
                  aria-valuemin={b.min}
                  aria-valuemax={b.max}
                  aria-valuenow={value}
                  aria-valuetext={label12(value)}
                  onPointerDown={(e) => startDrag(i, edge, e)}
                  onKeyDown={(e) => onHandleKey(i, edge, e)}
                  // left dinámico = posición del borde en la línea del tiempo.
                  style={{ left: `${pct(value)}%` }}
                  className={`absolute top-1/2 h-4 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-md border-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    dark ? "bg-zinc-900 focus:ring-offset-zinc-900" : "bg-white dark:bg-zinc-900 dark:focus:ring-offset-zinc-900"
                  } ${
                    isReceso
                      ? "border-amber-500 hover:border-amber-600 focus:ring-amber-400"
                      : "border-emerald-500 hover:border-emerald-600 focus:ring-emerald-400"
                  }`}
                />
              );
            }),
          )}
        </div>
        {/* Regla responsive: hora con label (mayor) · hora (media) · media hora (chica). */}
        <div ref={rulerRef} className="relative mt-1.5 h-6">
          {Array.from({ length: 49 }, (_, k) => {
            const min = k * 30; // 0, 30, 60 … 1440 (cada media hora)
            const isHour = min % 60 === 0;
            const h = min / 60;
            const major = isHour && h % labelStep === 0;
            const isFirst = k === 0;
            const isLast = k === 48;
            const tickStyle = {
              left: `${(min / DAY_END) * 100}%`,
              transform: isFirst ? "none" : isLast ? "translateX(-100%)" : "translateX(-50%)",
            };
            const tickCls = major
              ? `h-2.5 ${dark ? "bg-zinc-300" : "bg-zinc-500 dark:bg-zinc-300"}`
              : isHour
                ? `h-2 ${dark ? "bg-zinc-500" : "bg-zinc-300 dark:bg-zinc-500"}`
                : `h-1 ${dark ? "bg-zinc-600" : "bg-zinc-200 dark:bg-zinc-600"}`;
            return (
              <div
                key={k}
                className={`absolute top-0 flex flex-col ${isFirst ? "items-start" : isLast ? "items-end" : "items-center"}`}
                style={tickStyle}
              >
                <span className={`w-px ${tickCls}`} />
                {major && (
                  <span className={`mt-0.5 whitespace-nowrap text-[9px] leading-none ${dark ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {tickLabel(h)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Controles según el modo ── */}
      {mode === "work" ? (
        <WorkControls segs={segs} emit={emit} moveEdge={moveEdge} wIdx={wIdx} dark={dark} />
      ) : (
        <IntervalControls segs={segs} emit={emit} moveEdge={moveEdge} wIdx={wIdx} maxWindows={maxWindows} />
      )}
    </div>
  );
}

/* ── mode="intervals" (categorías): intervalos SEPARADOS ── */
function IntervalControls({
  segs,
  emit,
  moveEdge,
  wIdx,
  maxWindows,
}: {
  segs: Seg[];
  emit: (next: Seg[]) => void;
  moveEdge: (i: number, edge: Edge, value: number) => void;
  wIdx: number;
  maxWindows: number;
}) {
  function removeWindow(i: number) {
    emit(segs.filter((_, j) => j !== i));
  }
  /** Cierre del intervalo: el último (wrap-capable) avanza en E extendido (cruza medianoche). */
  function stepEnd(i: number, dir: number) {
    moveEdge(i, "end", i === wIdx ? endExt(segs[i]) + dir * STEP : segs[i].end + dir * STEP);
  }
  /** "+ Intervalo" (R10): parte la franja más larga en dos con hueco de 1 paso. El wrap (dur. negativa) nunca se elige. */
  function addInterval() {
    if (segs.length >= maxWindows) return; // R10: tope de intervalos
    let idx = 0;
    segs.forEach((s, i) => {
      if (s.end - s.start > segs[idx].end - segs[idx].start) idx = i;
    });
    const s = segs[idx];
    if (s.end - s.start < MIN_DUR * 2 + STEP) return; // sin lugar para 2 franjas ≥MIN_DUR + hueco
    // mid acotado a [start+MIN_DUR, end−MIN_DUR−STEP] ⇒ left≥MIN_DUR ∧ right≥MIN_DUR ∧ hueco=STEP (R3+R4).
    // Sin el clamp, en franjas ~90 min el redondeo de `mid` subía y colapsaba el hueco a 0 → franjas pegadas.
    const mid = Math.min(Math.max(Math.round((s.start + s.end) / 2 / STEP) * STEP, s.start + MIN_DUR), s.end - MIN_DUR - STEP);
    const left: Seg = { start: s.start, end: mid };
    const right: Seg = { start: mid + STEP, end: s.end };
    emit([...segs.filter((_, j) => j !== idx), left, right]);
  }
  const canSplit = segs.length < maxWindows && segs.some((s) => s.end - s.start >= MIN_DUR * 2 + STEP);
  // Botón en su límite (el clamp lo dejaría igual) → aspecto bloqueado. Mismo origen que el clamp.
  const startCan = (i: number) => { const b = edgeBounds(segs, i, "start"); const v = segs[i].start; return { dec: v > b.min, inc: v < b.max }; };
  const endCan = (i: number) => {
    if (i === wIdx) { const E = endExt(segs[i]); return { dec: E > segs[i].start + MIN_DUR, inc: E < DAY_END + wrapHeadMax(segs) }; }
    const b = edgeBounds(segs, i, "end"); const v = segs[i].end; return { dec: v > b.min, inc: v < b.max };
  };

  return (
    <>
      <div className="space-y-1.5">
        {segs.map((s, i) => {
          const cs = startCan(i), ce = endCan(i);
          return (
            <div
              key={i}
              className="relative flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/40"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <Stepper label={label12(s.start)} canDec={cs.dec} canInc={cs.inc} onDec={() => moveEdge(i, "start", s.start - STEP)} onInc={() => moveEdge(i, "start", s.start + STEP)} />
              <span className="text-xs text-zinc-400">a</span>
              <Stepper label={label12(s.end)} canDec={ce.dec} canInc={ce.inc} onDec={() => stepEnd(i, -1)} onInc={() => stepEnd(i, 1)} />
              {segs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWindow(i)}
                  aria-label="Quitar intervalo"
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={addInterval}
          disabled={!canSplit}
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
            canSplit ? "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300" : "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
          }`}
        >
          <Plus className="h-3 w-3" /> Agregar intervalo ({segs.length}/{maxWindows})
        </button>
      </div>
    </>
  );
}

/* ── mode="work" (config/engine): UN intervalo de trabajo + receso OPCIONAL ── */
function WorkControls({
  segs,
  emit,
  moveEdge,
  wIdx,
  dark,
}: {
  segs: Seg[];
  emit: (next: Seg[]) => void;
  moveEdge: (i: number, edge: Edge, value: number) => void;
  wIdx: number;
  dark: boolean;
}) {
  if (segs.length === 0) return null; // work siempre recibe ≥1 ventana (default del consumidor)

  const hasBreak = segs.length >= 2;
  const open = segs[0].start;
  const close = hasBreak ? segs[1].end : segs[0].end;
  const brkStart = hasBreak ? segs[0].end : 0;
  const brkEnd = hasBreak ? segs[1].start : 0;
  const lastEnd = hasBreak ? 1 : 0; // índice del seg cuyo "end" = cierre
  const wrapped = !hasBreak && isWrap(segs[0]); // cierre cruzó medianoche
  const is24h = !hasBreak && open === 0 && close === DAY_END; // día completo 00:00–24:00

  /** Cierre: si es wrap-capable, avanza en E extendido (puede cruzar medianoche). */
  function stepClose(dir: number) {
    moveEdge(lastEnd, "end", lastEnd === wIdx ? endExt(segs[lastEnd]) + dir * STEP : close + dir * STEP);
  }

  function toggleBreak() {
    // (No disponible cuando el intervalo cruza medianoche — el botón se oculta.)
    const mid = Math.floor((open + close) / 2 / STEP) * STEP;
    const bs = Math.max(open + STEP, mid);
    const be = Math.min(close - STEP, bs + 60); // receso inicial de 1h (como config)
    if (be <= bs) return;
    emit([
      { start: open, end: bs },
      { start: be, end: close },
    ]);
  }

  // Botón en su límite (el clamp lo dejaría igual) → aspecto bloqueado. Mismo origen que el clamp.
  const ob = edgeBounds(segs, 0, "start");
  const openCan = { dec: open > ob.min, inc: open < ob.max };
  const closeCan = lastEnd === wIdx
    ? (() => { const E = endExt(segs[lastEnd]); return { dec: E > segs[lastEnd].start + MIN_DUR, inc: E < DAY_END + wrapHeadMax(segs) }; })()
    : (() => { const b = edgeBounds(segs, lastEnd, "end"); return { dec: close > b.min, inc: close < b.max }; })();
  const brkStartCan = hasBreak ? (() => { const b = edgeBounds(segs, 0, "end"); return { dec: brkStart > b.min, inc: brkStart < b.max }; })() : { dec: false, inc: false };
  const brkEndCan = hasBreak ? (() => { const b = edgeBounds(segs, 1, "start"); return { dec: brkEnd > b.min, inc: brkEnd < b.max }; })() : { dec: false, inc: false };

  return (
    <>
      {/* Apertura — Cierre (bordes del ÚNICO intervalo de trabajo). 24h: label claro en vez de "12 AM — 12 AM"
          (para ajustar se arrastra un handle hacia adentro en la línea del tiempo → sale del modo 24h). */}
      <div className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 ${dark ? "border-zinc-700 bg-zinc-800/40" : "border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/40"}`}>
        <Clock className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}`} />
        {is24h ? (
          <span className={`text-xs font-semibold ${dark ? "text-zinc-200" : "text-zinc-800 dark:text-zinc-200"}`}>Abierto las 24 h</span>
        ) : (
          <>
            <Stepper label={label12(open)} dark={dark} canDec={openCan.dec} canInc={openCan.inc} onDec={() => moveEdge(0, "start", open - STEP)} onInc={() => moveEdge(0, "start", open + STEP)} />
            <span className="text-xs text-zinc-400">—</span>
            <Stepper label={label12(close)} dark={dark} canDec={closeCan.dec} canInc={closeCan.inc} onDec={() => stepClose(-1)} onInc={() => stepClose(1)} />
          </>
        )}
      </div>

      {/* Receso (hueco interno) — solo si tiene. La ✕ a la derecha lo retira (mismo patrón que categorías). */}
      {hasBreak && (
        <div className={`relative flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 ${dark ? "border-amber-800 bg-amber-900/10" : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"}`}>
          <Coffee className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-amber-400" : "text-amber-600 dark:text-amber-400"}`} />
          <Stepper label={label12(brkStart)} tone="amber" dark={dark} canDec={brkStartCan.dec} canInc={brkStartCan.inc} onDec={() => moveEdge(0, "end", brkStart - STEP)} onInc={() => moveEdge(0, "end", brkStart + STEP)} />
          <span className="text-xs text-amber-400">—</span>
          <Stepper label={label12(brkEnd)} tone="amber" dark={dark} canDec={brkEndCan.dec} canInc={brkEndCan.inc} onDec={() => moveEdge(1, "start", brkEnd - STEP)} onInc={() => moveEdge(1, "start", brkEnd + STEP)} />
          <button
            type="button"
            onClick={() => emit([{ start: open, end: close }])}
            aria-label="Quitar receso"
            className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-red-500 transition-colors ${dark ? "hover:bg-red-950/30" : "hover:bg-red-50 dark:hover:bg-red-950/30"}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* "Agregar receso" SOLO cuando no hay (para quitarlo está la ✕ en la fila ámbar, como categorías).
          NO disponible cuando el intervalo cruza medianoche: un span nocturno con receso es data-ambiguo
          (los 2 turnos no distinguen el span del cierre en el borde de medianoche) → se muestra explícito. */}
      {wrapped ? (
        <p className={`flex items-center justify-center gap-1.5 text-[11px] ${dark ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-500"}`}>
          <Coffee className="h-3 w-3 shrink-0" />
          Sin receso disponible cuando el horario cruza medianoche.
        </p>
      ) : !hasBreak ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggleBreak}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${dark ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"}`}
          >
            <Coffee className="h-3 w-3" />
            Agregar receso
          </button>
        </div>
      ) : null}
    </>
  );
}

function Stepper({ label, onDec, onInc, tone, dark = false, canDec = true, canInc = true }: { label: string; onDec: () => void; onInc: () => void; tone?: "amber"; dark?: boolean; canDec?: boolean; canInc?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      <StepBtn dir="left" onClick={onDec} dark={dark} disabled={!canDec} />
      <span
        className={`min-w-[64px] text-center text-xs font-semibold ${
          tone === "amber"
            ? dark ? "text-amber-300" : "text-amber-700 dark:text-amber-300"
            : dark ? "text-zinc-200" : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {label}
      </span>
      <StepBtn dir="right" onClick={onInc} dark={dark} disabled={!canInc} />
    </div>
  );
}

function StepBtn({ dir, onClick, dark = false, disabled = false }: { dir: "left" | "right"; onClick: () => void; dark?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // disabled = el borde ya está en su límite (el clamp lo dejaría igual): aspecto bloqueado.
      className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
        disabled
          ? `cursor-not-allowed ${dark ? "border-zinc-700/60 bg-zinc-800/40 text-zinc-600" : "border-zinc-200 bg-zinc-100 text-zinc-300 dark:border-zinc-700/60 dark:bg-zinc-800/40 dark:text-zinc-600"}`
          : dark ? "border-zinc-600 bg-zinc-800 text-zinc-300 active:bg-zinc-700" : "border-zinc-300 bg-white text-zinc-600 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:active:bg-zinc-700"
      }`}
    >
      {dir === "left" ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    </button>
  );
}
