"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { ICON_MAP } from "@/utils/icon-catalog";

/**
 * Entrada del picker (metadata de SELECCIÓN, no de render). Cada feature define
 * su propio catálogo de `IconEntry[]` y lo pasa al picker. El icono se PINTA
 * resolviendo `name` contra el SSOT de render `ICON_MAP` (`@/utils/icon-catalog`).
 * `for` es una etiqueta libre para sub-filtrar (de-acoplado del dominio: `string`).
 */
export interface IconEntry {
  readonly name: string;
  readonly label: string;
  readonly keywords: readonly string[];
  readonly for?: string;
}

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  /** Catálogo de la feature. El picker es agnóstico. */
  icons: readonly IconEntry[];
  error?: string;
  valid?: boolean;
  /** Sub-filtro por etiqueta: oculta entradas cuyo `for` no coincide. Omitir = sin filtro. */
  businessType?: string;
  /** Label del campo (default: "Icono *") */
  label?: string;
  /** Versión compacta: grid SIEMPRE visible, sin borde exterior, menos altura. */
  compact?: boolean;
}

export default function IconPicker({ value, onChange, icons, error, valid, businessType, label, compact }: IconPickerProps) {
  const [search, setSearch] = useState("");
  // No-compacto: arranca abierto si NO hay icono; colapsado si ya hay uno.
  const [open, setOpen] = useState(() => !value);

  const filtered = useMemo(() => {
    const base = icons.filter((e) => !businessType || !e.for || e.for === businessType);
    const q = search.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) ||
        entry.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [search, businessType, icons]);

  const gridMaxH = compact ? "max-h-36" : "max-h-48";
  const displayLabel = label ?? "Icono *";

  function handleSelect(name: string) {
    onChange(name);
    setOpen(false);
  }

  const content = (
    <>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar icono..."
          className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>
      <div className={`grid grid-cols-6 gap-1.5 ${gridMaxH} overflow-y-auto scrollbar-elegant p-1`}>
        {filtered.map((entry) => {
          const Icon = ICON_MAP[entry.name];
          if (!Icon) return null;
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => handleSelect(entry.name)}
              aria-label={entry.label}
              className={`flex flex-col items-center gap-0.5 rounded-lg p-2 transition-colors ${
                value === entry.name
                  ? "bg-sky-100 text-sky-700 ring-1 ring-sky-400 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-500"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] leading-tight truncate w-full text-center">{entry.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-6 py-4 text-center text-xs text-zinc-400">Sin resultados</p>
        )}
      </div>
    </>
  );

  // COMPACT: grid SIEMPRE visible.
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {displayLabel && <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{displayLabel}</label>}
        {content}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // NO-COMPACTO: trigger colapsable estilo-input + grid que se despliega inline.
  const SelectedIcon = value ? ICON_MAP[value] : null;
  const selectedLabel = icons.find((e) => e.name === value)?.label;
  const triggerBorder = error
    ? "border-red-500"
    : valid
      ? "border-emerald-500 dark:border-emerald-400"
      : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{displayLabel}</label>
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-lg border ${triggerBorder} bg-white px-3 py-2 text-sm transition-colors dark:bg-zinc-800`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {SelectedIcon && <SelectedIcon className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-300" />}
            <span className={`truncate ${selectedLabel ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
              {selectedLabel ?? "Selecciona un icono"}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`mt-1.5 rounded-lg border border-zinc-200 bg-white p-2 transition-opacity duration-200 dark:border-zinc-700 dark:bg-black ${
                open ? "opacity-100" : "opacity-0"
              }`}
            >
              {content}
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
