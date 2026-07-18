"use client";

/**
 * ScheduleEditor — editor de DISPONIBILIDAD por horario T2-4 (Schedule del dominio).
 *
 * Dos presentaciones según el prop `optional`:
 * - `optional` (categoría/producto/combo): 3 MODOS mutuamente excluyentes —
 *     1. Siempre disponible            → `{}` (vacío)
 *     2. Disponible ciertas horas      → `{ "0": [ventanas] }` (UN horario, todos los días)
 *     3. Disponible ciertos días       → per-día `{ "1":[…], "2":[…] … }` (toggle + horas por día)
 *   El modo se DERIVA del valor → sin la competencia "general vs excepciones".
 * - sin `optional` (promos): editor crudo "Todos los días" + ajustes por día. El
 *   schedule de una promo es obligatorio → no aplica el modo "siempre".
 *
 * Ambos emiten el MISMO `Schedule` del dominio (`Record<día, ventanas "HH:MM-HH:MM">`,
 * "0"=general, día específico pisa, []=cerrado). Reusan `WindowsEditor`, que soporta
 * ventanas que cruzan medianoche, cualquier hora y hasta 3 franjas. La validación
 * semántica (solapes, nunca-disponible) la hace el dominio al guardar (assertSchedule).
 */
import { useState, useMemo, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../overlays/Modal";
import Toggle from "./Toggle";
import DayTimeline from "./DayTimeline";
import {
  GENERAL_DAY,
  SCHEDULE_LIMITS,
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_FULL,
  isScheduleEmpty,
  weeklyHoursEnvelope,
  type Schedule,
  type WeekdayKey,
  type DayHoursConstraint,
} from "@/domain/entities/schedule";
import { useIsMobile } from "@/views/admin/hooks";

const DAY_KEYS: readonly WeekdayKey[] = ["1", "2", "3", "4", "5", "6", "7"];
const DEFAULT_WINDOW = "09:00-18:00";

interface ScheduleEditorProps {
  value: Schedule;
  onChange: (next: Schedule) => void;
  /**
   * Muestra los 3 modos (siempre / ciertas horas / ciertos días). Usar donde el
   * horario es OPCIONAL (categoría/producto/combo). Las promos NO lo usan (schedule
   * obligatorio → editor crudo general+excepciones).
   */
  optional?: boolean;
  /** Etiqueta del modo vacío. Default "Siempre disponible"; items que heredan: "Hereda de su categoría". */
  alwaysLabel?: string;
  /**
   * Horario operativo del negocio por día ISO (T2-4 categorías). Si se pasa, "Ciertos días"
   * muestra los 7 días (los que el negocio cierra van desactivados; activarlos lo abre ese día)
   * y cada `DayTimeline` dibuja el horario como GUÍA NO restrictiva. Ausente = sin guía
   * (categorías y productos lo pasan; combos/promos no).
   */
  businessHours?: Partial<Record<WeekdayKey, DayHoursConstraint>>;
  /** Si `false`, oculta el modo "Siempre" (schedule OBLIGATORIO no-vacío, ej. time-promo). Default true. */
  allowAlways?: boolean;
}

/** Setea/elimina la key de un día (undefined = sin override). */
function withDay(s: Schedule, day: WeekdayKey, windows: readonly string[] | undefined): Schedule {
  const next: Partial<Record<WeekdayKey, readonly string[]>> = { ...s };
  if (windows === undefined) delete next[day];
  else next[day] = windows;
  return next;
}

/** Ventanas EFECTIVAS de un día (día específico pisa al general "0"). Para mostrar. */
function dayWindows(s: Schedule, day: WeekdayKey): readonly string[] {
  return s[day] ?? s[GENERAL_DAY] ?? [];
}

function splitWindow(w: string): { from: string; to: string } {
  const [from = "", to = ""] = w.split("-");
  return { from, to };
}

/** Editor de las franjas de UNA key (general o día). Soporta wrap / cualquier hora / ≤3. */
function WindowsEditor({
  windows,
  onChange,
}: {
  windows: readonly string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {windows.map((w, i) => {
        const { from, to } = splitWindow(w);
        const set = (nf: string, nt: string) =>
          onChange(windows.map((x, j) => (j === i ? `${nf}-${nt}` : x)));
        return (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              value={from}
              onChange={(e) => set(e.target.value, to)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            />
            <span className="text-xs text-zinc-400">a</span>
            <input
              type="time"
              value={to}
              onChange={(e) => set(from, e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            />
            <button
              type="button"
              onClick={() => onChange(windows.filter((_, j) => j !== i))}
              aria-label="Quitar franja"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {windows.length < SCHEDULE_LIMITS.MAX_WINDOWS_PER_DAY && (
        <button
          type="button"
          onClick={() => onChange([...windows, DEFAULT_WINDOW])}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
        >
          <Plus className="h-3 w-3" /> Franja
        </button>
      )}
    </div>
  );
}

/** Editor de las franjas de UN horario: hint + `DayTimeline` (que dibuja también el cruce de
 *  medianoche). Fuente única: sheet (mobile), acordeón inline (desktop) y "Ciertas horas".
 *  `hint` override el texto guía. */
function DayWindowsEditor({
  windows,
  onChange,
  hint,
  availableHours,
}: {
  windows: readonly string[];
  onChange: (next: string[]) => void;
  hint?: string;
  availableHours?: DayHoursConstraint;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-400">
        {hint ?? (availableHours ? "Elige los intervalos; si exceden el horario (naranja), se ampliará al guardar." : "Arrastra los bordes o usa los botones para ajustar.")}
      </p>
      {/* El timeline dibuja también el cruce de medianoche (arrastra el cierre al borde → pasa al inicio). */}
      <DayTimeline windows={windows} onChange={onChange} availableHours={availableHours} />
    </div>
  );
}

/** Una fila de día (nombre + resumen + Editar + Toggle). En desktop su editor se expande inline
 *  debajo (acordeón `grid-rows`); en mobile ese hueco queda oculto y lo edita el bottom-sheet. */
function DayRow({
  label,
  windows,
  businessClosed,
  expanded,
  onEdit,
  onToggle,
  children,
}: {
  label: string;
  windows: readonly string[];
  /** El negocio tiene este día CERRADO (no opera). Activar la disponibilidad lo abrirá. */
  businessClosed: boolean;
  expanded: boolean;
  onEdit: () => void;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  const isOpen = windows.length > 0;
  // 4 estados: available (abierto+disp) · off-open (abierto, sin disp) · closed (cerrado, sin disp) ·
  // orphan (cerrado PERO con disp → activarlo/guardarlo abre el negocio ese día vía `expand`).
  const willOpenBusiness = businessClosed && isOpen;
  const summary = isOpen
    ? windows.map((w) => w.replace("-", " – ")).join(" · ")
    : businessClosed
      ? "El negocio no abre este día"
      : "No disponible este día";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${
              isOpen ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {label}
          </p>
          <p className="truncate text-xs text-zinc-400">{summary}</p>
          {willOpenBusiness && (
            <p className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Al guardar, tu negocio abrirá este día
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isOpen && (
            <button
              type="button"
              onClick={onEdit}
              aria-expanded={expanded}
              className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              {expanded ? "Listo" : "Editar"}
            </button>
          )}
          <Toggle checked={isOpen} onChange={onToggle} />
        </div>
      </div>
      {/* Desktop: editor inline (acordeón). En mobile este hueco va oculto → lo edita el bottom-sheet. */}
      <div
        className={`hidden md:grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-100 px-3 pb-3 pt-2 dark:border-zinc-700">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Ítems (optional): 3 modos (siempre / ciertas horas / ciertos días) ────────────────── */

function OptionalScheduleEditor({
  value,
  onChange,
  alwaysLabel,
  businessHours,
  allowAlways,
}: {
  value: Schedule;
  onChange: (next: Schedule) => void;
  alwaysLabel: string;
  businessHours?: Partial<Record<WeekdayKey, DayHoursConstraint>>;
  allowAlways: boolean;
}) {
  // Modo DERIVADO del valor: vacío=siempre · solo "0"=ciertas horas · algún día=ciertos días.
  const mode: "always" | "hours" | "days" = isScheduleEmpty(value)
    ? "always"
    : DAY_KEYS.some((d) => value[d] !== undefined)
      ? "days"
      : "hours";
  // "Ciertos días" muestra los 7 días SIEMPRE. Los que el negocio tiene cerrados se ven
  // desactivados; activarlos ABRE el negocio ese día (vía `expand` al guardar — motor bidireccional).
  // `seedDays` (solo los abiertos) evita que cambiar a este modo auto-abra días cerrados.
  const visibleDays = DAY_KEYS;
  const seedDays = businessHours ? DAY_KEYS.filter((d) => businessHours[d]) : DAY_KEYS;
  const hhmm = (m: number) => (m === 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  const defaultWindowFor = (d: WeekdayKey): string => {
    const c = businessHours?.[d];
    return c ? `${hhmm(c.start)}-${hhmm(c.end)}` : DEFAULT_WINDOW;
  };
  const rangeToWindow = (c: DayHoursConstraint) => `${hhmm(c.start)}-${hhmm(c.end)}`;
  // Rango HÁBIL agregado de la semana — GUÍA de "Ciertas horas" (un horario para todos los días;
  // fragmentado → arco + recesos en `breaks`). `undefined` solo si la unión cubre 24h → sin guía.
  const hoursRange = useMemo(
    () =>
      businessHours
        ? weeklyHoursEnvelope(Object.values(businessHours).filter((c): c is DayHoursConstraint => c != null)) ?? undefined
        : undefined,
    [businessHours],
  );
  // Día en edición: en mobile abre el bottom-sheet; en desktop expande el acordeón inline (null = ninguno).
  const [editingDay, setEditingDay] = useState<WeekdayKey | null>(null);
  const isMobile = useIsMobile();

  // Al cambiar de modo, cierra cualquier día en edición (evita un editingDay colgado en desktop).
  function toAlways() {
    setEditingDay(null);
    if (mode !== "always") onChange({});
  }
  function toHours() {
    if (mode === "hours") return;
    setEditingDay(null);
    // Con horario de negocio: el default = rango HÁBIL agregado (NO la window de un día puntual,
    // que con el seed por-día ahora difiere entre días). Libre: carryover del 1er día con horario.
    const w = businessHours
      ? [hoursRange ? rangeToWindow(hoursRange) : DEFAULT_WINDOW]
      : (DAY_KEYS.map((d) => dayWindows(value, d)).find((x) => x.length > 0) ?? [DEFAULT_WINDOW]);
    onChange({ [GENERAL_DAY]: [...w] });
  }
  function toDays() {
    if (mode === "days") return;
    setEditingDay(null);
    // Expande a per-día: cada día con SU window propia, o su rango operativo si venía vacío.
    // Con horario de negocio NO se hereda la general "0" (el agregado de "Ciertas horas"):
    // se sale del rango de cada día. Sin negocio (libre) se mantiene el carryover de la general.
    const next: Partial<Record<WeekdayKey, readonly string[]>> = {};
    for (const d of seedDays) {
      const eff = businessHours ? (value[d] ?? []) : dayWindows(value, d);
      next[d] = eff.length > 0 ? [...eff] : [defaultWindowFor(d)];
    }
    onChange(next);
  }

  /** "Ciertos días": emite per-día explícito aplicando el cambio a `day`. `null`=cerrar. */
  function emitDay(day: WeekdayKey, windows: readonly string[] | null) {
    const next: Partial<Record<WeekdayKey, readonly string[]>> = {};
    for (const d of DAY_KEYS) {
      const eff = dayWindows(value, d);
      if (eff.length > 0) next[d] = [...eff];
    }
    if (windows === null || windows.length === 0) delete next[day];
    else next[day] = windows;
    onChange(next);
  }

  const OPTIONS = [
    // "Siempre" solo si el schedule es opcional; oculto donde es obligatorio (time-promo).
    ...(allowAlways ? [{ key: "always" as const, label: alwaysLabel, onSelect: toAlways }] : []),
    { key: "hours" as const, label: "Ciertas horas", onSelect: toHours },
    { key: "days" as const, label: "Ciertos días", onSelect: toDays },
  ];

  return (
    <div className="space-y-3">
      {/* ── Modo (radios minimalistas — horizontal: izq / centro / der, se adapta al ancho) ── */}
      <div role="radiogroup" className="flex items-center justify-between gap-2">
        {OPTIONS.map((o) => {
          const sel = mode === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={o.onSelect}
              className="group flex items-center gap-2 py-1 text-sm focus:outline-none"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all group-focus-visible:ring-2 group-focus-visible:ring-emerald-400/60 group-focus-visible:ring-offset-1 group-focus-visible:ring-offset-white dark:group-focus-visible:ring-offset-zinc-900 ${
                  sel ? "border-emerald-500" : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {sel && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </span>
              <span
                className={
                  sel
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── "Ciertas horas": UN horario general (todos los días igual) — mismo editor timeline ── */}
      {mode === "hours" && (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
          <DayWindowsEditor
            hint="Mismo horario todos los días."
            windows={value[GENERAL_DAY] ?? []}
            availableHours={hoursRange}
            onChange={(ws) => onChange(ws.length > 0 ? { [GENERAL_DAY]: ws } : {})}
          />
        </div>
      )}

      {/* ── "Ciertos días": lista compacta (día + resumen + Editar + toggle).
          Las franjas se editan en un bottom-sheet aparte (abajo). ── */}
      {mode === "days" && (
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {visibleDays.map((d) => (
            <DayRow
              key={d}
              label={WEEKDAY_LABELS_FULL[d]}
              windows={dayWindows(value, d)}
              businessClosed={businessHours ? !businessHours[d] : false}
              expanded={!isMobile && editingDay === d}
              onEdit={() => setEditingDay(editingDay === d ? null : d)}
              onToggle={(open) => {
                emitDay(d, open ? [defaultWindowFor(d)] : null);
                if (!open && editingDay === d) setEditingDay(null); // cerrar el día colapsa su editor inline
              }}
            >
              {/* Editor inline SOLO en desktop y SOLO para el día activo (1 timeline montado). */}
              {!isMobile && editingDay === d && (
                <DayWindowsEditor
                  windows={dayWindows(value, d)}
                  availableHours={businessHours?.[d]}
                  onChange={(ws) => {
                    emitDay(d, ws);
                    if (ws.length === 0) setEditingDay(null);
                  }}
                />
              )}
            </DayRow>
          ))}
        </div>
      )}

      {/* Mobile: bottom-sheet para editar UN día. En desktop el editor va inline (acordeón en
          DayRow), por eso el sheet SOLO abre en mobile. Mismo editor → mismos datos. */}
      <Modal
        open={editingDay !== null && isMobile}
        onClose={() => setEditingDay(null)}
        title={editingDay ? `Horario del ${WEEKDAY_LABELS_FULL[editingDay].toLowerCase()}` : ""}
        sheet
      >
        {editingDay && (
          <DayWindowsEditor
            windows={dayWindows(value, editingDay)}
            availableHours={businessHours?.[editingDay]}
            onChange={(ws) => {
              emitDay(editingDay, ws);
              if (ws.length === 0) setEditingDay(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ───────────────────── Promos (sin optional): editor crudo general + excepciones ───────────────────── */

function RawScheduleEditor({ value, onChange }: { value: Schedule; onChange: (next: Schedule) => void }) {
  const general = value[GENERAL_DAY];
  const hasGeneral = general !== undefined;

  return (
    <div className="space-y-3">
      {/* ── "Todos los días" (key "0") ── */}
      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{WEEKDAY_LABELS[GENERAL_DAY]}</span>
          {hasGeneral && (
            <button
              type="button"
              onClick={() => {
                let next = withDay(value, GENERAL_DAY, undefined);
                for (const d of DAY_KEYS) {
                  if (next[d]?.length === 0) next = withDay(next, d, undefined);
                }
                onChange(next);
              }}
              className="text-[11px] font-medium text-red-500 hover:underline"
            >
              Quitar
            </button>
          )}
        </div>
        {hasGeneral ? (
          <WindowsEditor windows={general} onChange={(ws) => onChange(withDay(value, GENERAL_DAY, ws))} />
        ) : (
          <button
            type="button"
            onClick={() => onChange(withDay(value, GENERAL_DAY, [DEFAULT_WINDOW]))}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          >
            <Plus className="h-3 w-3" /> Definir horario
          </button>
        )}
      </div>

      {/* ── Ajustes por día (pisan al general) ── */}
      <div className="space-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ajustes por día</span>
          <span className="text-[11px] text-zinc-400">
            Los días que ajustes pisan el horario general; el resto lo siguen.
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAY_KEYS.map((d) => {
            const isSel = value[d] !== undefined;
            const isClosed = isSel && value[d]?.length === 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChange(withDay(value, d, isSel ? undefined : [DEFAULT_WINDOW]))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  !isSel
                    ? "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
                    : isClosed
                      ? "border-rose-300 bg-rose-50 text-rose-600 line-through dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
                      : "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                }`}
              >
                {WEEKDAY_LABELS[d]}
              </button>
            );
          })}
        </div>
        {DAY_KEYS.filter((d) => value[d] !== undefined).map((d) => {
          const windows = value[d] ?? [];
          const closed = windows.length === 0;
          return (
            <div key={d} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{WEEKDAY_LABELS[d]}</span>
                {hasGeneral && (
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={closed}
                      onChange={(e) => onChange(withDay(value, d, e.target.checked ? [] : [DEFAULT_WINDOW]))}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    Cerrado este día
                  </label>
                )}
              </div>
              {closed ? (
                hasGeneral ? <p className="text-[11px] text-zinc-400">No disponible este día.</p> : null
              ) : (
                <WindowsEditor windows={windows} onChange={(ws) => onChange(withDay(value, d, ws))} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleEditor({
  value,
  onChange,
  optional = false,
  alwaysLabel = "Siempre",
  businessHours,
  allowAlways = true,
}: ScheduleEditorProps) {
  if (optional) {
    return <OptionalScheduleEditor value={value} onChange={onChange} alwaysLabel={alwaysLabel} businessHours={businessHours} allowAlways={allowAlways} />;
  }
  return <RawScheduleEditor value={value} onChange={onChange} />;
}
