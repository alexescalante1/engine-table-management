"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { normalizeForSearch } from "@/utils/normalize-text";
import {
  getBgClasses,
  getBorderClasses,
  getTextClasses,
  getLabelClasses,
  getErrorTextClasses,
} from "./input-styles";

// Versión BASE de-acoplada del dominio: en vez de resolver el catálogo por país
// (CITY_LOADERS del dominio), recibe un `loadCities` opcional. Sin él funciona
// como input libre. `normalizeCity`/`correctCity` son locales y agnósticos.
const normalizeCity = normalizeForSearch;

function correctCity(list: readonly string[], value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const norm = normalizeCity(trimmed);
  const match = list.find((c) => normalizeCity(c) === norm);
  return match ?? trimmed;
}

interface CityFieldProps {
  /** Carga perezosa del catálogo de sugerencias. Omitir = input libre sin dropdown. */
  loadCities?: () => Promise<readonly string[]>;
  label?: string;
  value: string;
  /** Emite el string (al tipear o al elegir una sugerencia). */
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | boolean;
  valid?: boolean;
  dark?: boolean;
  placeholder?: string;
  maxLength?: number;
  id?: string;
}

/**
 * Campo con autocompletado: input LIBRE + dropdown PROPIO de sugerencias.
 * Teclado: ↓/↑ navega · Enter/Tab completa · Esc cierra. Click selecciona.
 * Filtrado accent-insensitive; al salir autocorrige a la forma canónica del catálogo.
 */
export default function CityField({
  loadCities,
  label,
  value,
  onChange,
  onBlur,
  error,
  valid,
  dark,
  placeholder,
  maxLength,
  id,
}: CityFieldProps) {
  const [cities, setCities] = useState<readonly string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const reactId = useId();
  const inputId = id ?? `city-${reactId}`;
  const listId = `city-list-${reactId}`;
  const hasError = !!error;
  const errorMessage = typeof error === "string" ? error : null;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  const latest = useRef({ value, onChange, onBlur });
  useEffect(() => { latest.current = { value, onChange, onBlur }; });
  const firstLoad = useRef(true);

  // Carga del catálogo. Al re-cargar (cambia loadCities): re-corrige el valor actual.
  useEffect(() => {
    if (!loadCities) { setCities([]); return; }
    let alive = true;
    const wasFirst = firstLoad.current;
    firstLoad.current = false;
    loadCities()
      .then((list) => {
        if (!alive) return;
        setCities(list);
        if (wasFirst) return;
        const { value: v, onChange: oc } = latest.current;
        const corrected = correctCity(list, v);
        if (corrected !== v) oc(corrected);
      })
      .catch(() => { if (alive) setCities([]); });
    return () => { alive = false; };
  }, [loadCities]);

  const filtered = useMemo(() => {
    const q = normalizeCity(value);
    if (!q) return cities;
    return cities.filter((city) => normalizeCity(city).includes(q));
  }, [cities, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const showDropdown = open && filtered.length > 0;

  function select(city: string) {
    onChange(city);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (showDropdown && filtered[activeIndex]) {
        e.preventDefault();
        select(filtered[activeIndex]);
      }
    } else if (e.key === "Tab") {
      if (showDropdown && filtered[activeIndex]) select(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const dropdownSurface = dark
    ? "border-zinc-700 bg-zinc-800"
    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800";
  const activeOptionCls = dark
    ? "bg-zinc-700 text-zinc-100"
    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100";
  const normalOptionCls = dark ? "text-zinc-300" : "text-zinc-700 dark:text-zinc-300";

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className={`text-sm font-medium ${getLabelClasses(dark)}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showDropdown ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={errorId}
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIndex(0); }}
          onFocus={() => { setOpen(true); setActiveIndex(0); }}
          onBlur={() => {
            setOpen(false);
            const corrected = correctCity(cities, value);
            if (corrected !== value) {
              onChange(corrected);
              // Difiere onBlur un microtask: corre DESPUÉS de que onChange propague
              // el valor corregido, para que el consumidor no lea el valor viejo.
              if (onBlur) queueMicrotask(onBlur);
            } else {
              onBlur?.();
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border ${getBgClasses(dark)} px-3 py-2 text-sm ${getTextClasses(dark)} transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${getBorderClasses({ hasError, valid, dark })}`}
        />

        {showDropdown && (
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border p-1 shadow-lg duration-150 animate-in fade-in-0 slide-in-from-top-1 ${dropdownSurface}`}
          >
            {filtered.map((city, i) => (
              <button
                key={city}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(city)}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${i === activeIndex ? activeOptionCls : normalOptionCls}`}
              >
                <span className="truncate">{city}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {errorMessage && (
        <p id={errorId} role="alert" className={`text-xs ${getErrorTextClasses(dark)}`}>{errorMessage}</p>
      )}
    </div>
  );
}
