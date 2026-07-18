// Bounded context: schedule (horarios de disponibilidad).
//
// Value Object temporal rico (DOMAIN-LAYER.md §14.1): tipos + funciones puras
// del modelo de horarios. 100% puro — sin I/O, sin side effects, sin imports de
// otras capas. Es el hogar correcto de esta lógica (§2/§11.1 de VIEW-LAYER: los
// cálculos de negocio viven en el dominio, no en la vista). Lo consumen los
// widgets ScheduleEditor / DayTimeline de la capa de vistas.

/** Día de la semana ISO ("1"=lunes … "7"=domingo) o "0" = todos los días. */
export type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7";

/** Key del día general (config para todos los días). */
export const GENERAL_DAY: WeekdayKey = "0";

/** Horario de disponibilidad. `{}` = siempre disponible. */
export type Schedule = Readonly<Partial<Record<WeekdayKey, readonly string[]>>>;

export const SCHEDULE_LIMITS = {
  /** Ventanas máximas por día (desayuno/almuerzo/cena cubre el caso real). */
  MAX_WINDOWS_PER_DAY: 3,
  /** Granularidad temporal: bordes en múltiplos de 30' y franja mínima 30'. */
  WINDOW_STEP_MINUTES: 30,
  MIN_WINDOW_MINUTES: 30,
} as const;

/** Labels cortos por día — para chips/summaries. */
export const WEEKDAY_LABELS: Readonly<Record<WeekdayKey, string>> = {
  "0": "Todos los días",
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
  "6": "Sáb",
  "7": "Dom",
};

/** Labels completos por día — para el editor por-día. */
export const WEEKDAY_LABELS_FULL: Readonly<Record<WeekdayKey, string>> = {
  "0": "Todos los días",
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
  "7": "Domingo",
};

/** `{}` / undefined = sin horario (siempre disponible). */
export function isScheduleEmpty(s: Schedule | undefined): boolean {
  return s == null || Object.keys(s).length === 0;
}

/**
 * Rango operativo de UN día — para ACOTAR el editor: solo se eligen intervalos
 * dentro de `[start, end]`; los recesos se muestran (visual). `wraps` = cruza
 * medianoche (`close <= open`).
 */
export interface DayHoursConstraint {
  /** Apertura en minutos (0-1439). */
  readonly start: number;
  /** Cierre en minutos. `1440` = medianoche. Si `wraps`, es la hora real de cierre (< start). */
  readonly end: number;
  /** El rango cruza medianoche. */
  readonly wraps: boolean;
  /** Recesos (huecos entre turnos) — SOLO visual, no acotan la selección. */
  readonly breaks: readonly { start: number; end: number }[];
}

/**
 * Horas hábiles AGREGADAS de la semana — para acotar "Ciertas horas". Une la
 * cobertura de todos los rangos (consciente del cruce de medianoche) y devuelve
 * el arco hábil MÍNIMO: `null` (editor LIBRE) si cubre 24h; en otro caso el arco
 * de la primera a la última hora hábil, con los huecos internos como `breaks`.
 * Puro: sin I/O, solo cómputo de cobertura minuto a minuto.
 */
export function weeklyHoursEnvelope(
  constraints: readonly DayHoursConstraint[],
): DayHoursConstraint | null {
  if (constraints.length === 0) return null;
  const covered = new Array<boolean>(1440).fill(false);
  const mark = (s: number, e: number) => {
    for (let m = s; m < e; m++) covered[m] = true;
  };
  for (const c of constraints) {
    if (c.wraps) {
      mark(c.start, 1440);
      mark(0, c.end);
    } else {
      mark(c.start, c.end === 0 ? 1440 : c.end);
    }
  }
  if (covered.every(Boolean)) return null; // cubre 24h → LIBRE
  const runs: { start: number; len: number }[] = [];
  for (let i = 0; i < 1440; i++) {
    if (!covered[i] && covered[(i - 1 + 1440) % 1440]) {
      let len = 0;
      let j = i;
      while (!covered[j % 1440]) { len++; j++; }
      runs.push({ start: i, len });
    }
  }
  // Cobertura vacía (p.ej. rangos de longitud cero) sin cubrir 24h: no hay arco hábil.
  if (runs.length === 0) return null;
  let largest = runs[0];
  for (const r of runs) if (r.len > largest.len) largest = r;
  const start = (largest.start + largest.len) % 1440;
  const end = largest.start === 0 ? 1440 : largest.start;
  const breaks: { start: number; end: number }[] = [];
  for (const r of runs) {
    if (r === largest) continue;
    const e = r.start + r.len;
    if (e <= 1440) breaks.push({ start: r.start, end: e });
    else { breaks.push({ start: r.start, end: 1440 }); breaks.push({ start: 0, end: e - 1440 }); }
  }
  return { start, end, wraps: end <= start, breaks };
}
