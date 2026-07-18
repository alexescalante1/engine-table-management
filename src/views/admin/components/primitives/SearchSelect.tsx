"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export type SearchSelectOption = {
  value: string;
  label: string;
  indent?: boolean;
  disabled?: boolean;
};

interface SearchSelectProps {
  label?: string;
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  valid?: boolean;
}

export default function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar...",
  error,
  valid,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    const result: SearchSelectOption[] = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.disabled) {
        let hasMatch = false;
        for (let j = i + 1; j < options.length && options[j].indent; j++) {
          if (options[j].label.toLowerCase().includes(q)) { hasMatch = true; break; }
        }
        if (hasMatch) result.push(opt);
      } else if (opt.label.toLowerCase().includes(q)) {
        result.push(opt);
      }
    }
    return result;
  }, [options, search]);

  // Selectable (non-disabled) options for keyboard nav
  const selectableIndices = useMemo(
    () => filtered.map((opt, i) => (!opt.disabled ? i : -1)).filter((i) => i !== -1),
    [filtered],
  );

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); setActiveIndex(-1); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) { searchRef.current?.focus(); setActiveIndex(-1); }
  }, [open]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentPos = selectableIndices.indexOf(activeIndex);
      const next = currentPos < selectableIndices.length - 1 ? selectableIndices[currentPos + 1] : selectableIndices[0];
      setActiveIndex(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentPos = selectableIndices.indexOf(activeIndex);
      const prev = currentPos > 0 ? selectableIndices[currentPos - 1] : selectableIndices[selectableIndices.length - 1];
      setActiveIndex(prev);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt && !opt.disabled) handleSelect(opt.value);
    }
  }

  const borderClass = error
    ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
    : valid
      ? "border-emerald-500 focus-within:border-emerald-600 focus-within:ring-emerald-500/30 dark:border-emerald-400"
      : "border-zinc-300 focus-within:border-sky-500 focus-within:ring-sky-500/30 dark:border-zinc-600 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/30";

  const errorId = error ? "search-select-error" : undefined;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      )}
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-describedby={errorId}
          className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 dark:bg-zinc-800 ${borderClass} ${
            selectedLabel ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 animate-in fade-in-0 slide-in-from-top-1 duration-150 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {/* Search input */}
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1); }}
                  placeholder="Buscar..."
                  aria-label="Buscar opciones"
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Options list */}
            <div ref={listRef} role="listbox" className="max-h-48 overflow-y-auto p-1">
              {filtered.map((opt, i) => {
                if (opt.disabled) {
                  return (
                    <div
                      key={opt.value}
                      className="px-2 pb-0.5 pt-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500"
                    >
                      {opt.label}
                    </div>
                  );
                }
                const selected = opt.value === value;
                const active = i === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
                      opt.indent ? "pl-6" : ""
                    } ${
                      selected
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                        : active
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {opt.indent && <span className="mr-1 text-zinc-400 dark:text-zinc-500">└</span>}
                    <span className="truncate">{opt.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-sky-500" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-3 text-center text-xs text-zinc-400">Sin resultados</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
