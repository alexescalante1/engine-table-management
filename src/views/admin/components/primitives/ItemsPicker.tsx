"use client";

// Picker de items AGNÓSTICO (§14.2): search + lista filtrable + control por modo.
// Recibe `items: SelectableItem[]` YA construidos por el caller (feature) — no conoce
// Product/dominio. Lo usan combo y las 3 promos moldeándolo por parámetros.
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Check, PackagePlus } from "lucide-react";
import { formatPrice } from "@/utils/format-price";
import { useIsMobile } from "@/views/admin/hooks";
import Modal from "../overlays/Modal";
import Button from "./Button";
import InputSearch from "./InputSearch";
import ItemThumb from "./ItemThumb";

/**
 * Unidad seleccionable (contrato del picker). own = UNA variante concreta (clave compuesta
 * `productId_variantId`); el producto simple = su única variante. barcode = el producto (un EAN).
 * El caller construye estos items desde su dominio (ver `buildSelectableItems` en la feature).
 */
export interface SelectableItem {
  key: string;
  kind: "own" | "barcode";
  label: string;
  price: number;
  available: boolean;
  /** Texto para buscar/rankear (lowercase). */
  search: string;
  /** Categoría del producto — para el bloqueo "cubierto por categoría" (time-promo). */
  categoryId: string;
  /** Imagen del PRODUCTO. null = sin imagen. */
  src: string | null;
}

interface ItemsPickerProps {
  open: boolean;
  onClose: () => void;
  /** El picker pinta su PROPIO disparador punteado, MISMO estilo en ambos breakpoints —
   *  vacío = dropzone grande (espejo Imagen); con items = fila compacta "+ Agregar
   *  productos". Click → desktop expande el panel inline / mobile abre el modal. */
  onOpen: () => void;
  /** Guía del dropzone vacío (2ª línea). Default: la del combo. */
  emptyHint?: string;
  /** Modo MEMBRESÍA (time-promo): el ítem está o no está — la fila toglea (check) en vez
   *  del stepper ± (que mentiría: las cantidades se descartan al persistir). */
  membership?: boolean;
  /** Modo TARGET ÚNICO (quantity-promo): filas con stepper ± (el qty ES el "Lleva")
   *  y selección VIVA — cada paso emite por onDraftChange (sin draft/Aplicar; footer
   *  "Listo" solo cierra). Pisar el stepper de OTRO producto desmarca el anterior
   *  aunque viva en el otro bucket (own↔barcode); bajar del piso deselecciona. Con
   *  selección el trigger DESAPARECE (cambiar = quitar desde la card del form).
   *  Copys en singular. */
  single?: boolean;
  /** Piso del qty en `single`: el primer + salta de 0 → floor y bajar del floor cae a 0
   *  (ej. quantity-promo: MIN_N=2 — "lleva 1" no existe). Default 1. */
  qtyFloor?: number;
  /** Tope del qty por fila. Default 999 (cap de UI; el límite real lo valida el service). */
  maxQty?: number;
  /** Categorías YA marcadas en la promo (time-promo): sus productos quedan BLOQUEADOS
   *  en el picker (chip "Por categoría" en vez de control). También poda EN VIVO el draft
   *  si una categoría se marca con el picker abierto. Default [] = sin efecto (combo/cuponera). */
  coveredCategoryIds?: readonly string[];
  /** Items YA construidos por el caller (own + barcode aplanados). */
  items: SelectableItem[];
  /** own → keyed by `productId_variantId`; barcode → productId. */
  currentOwn: Record<string, number>;
  currentBarcode: Record<string, number>;
  currSymbol: string;
  /** Decimales + locale de la moneda (0 para CLP/PYG/COP). Genéricos → el picker sigue
   *  agnóstico. Ausentes ⇒ formateo clásico (2 dec, sin separadores). */
  decimals?: number;
  locale?: string;
  onApply: (own: Record<string, number>, barcode: Record<string, number>) => void;
  /** Notifica cada cambio del DRAFT (antes de Aplicar) — display-only (la persistencia
   *  sigue pasando SOLO por onApply). */
  onDraftChange?: (own: Record<string, number>, barcode: Record<string, number>) => void;
}

/**
 * Picker de items con PRESENTACIÓN DUAL (mismo cuerpo + draft/apply, excluyente por
 * breakpoint): Desktop = panel INLINE expandible animado; Mobile = `<Modal>` full-screen.
 * Estado local hasta "Aplicar" — ahí propaga los Records actualizados al form padre.
 */
export default function ItemsPicker({
  open,
  onClose,
  onOpen,
  emptyHint = "Elige 2 o más para crear el combo",
  membership = false,
  single = false,
  qtyFloor = 1,
  maxQty = 999,
  coveredCategoryIds = [],
  items,
  currentOwn,
  currentBarcode,
  currSymbol,
  decimals,
  locale,
  onApply,
  onDraftChange,
}: ItemsPickerProps) {
  const [search, setSearch] = useState("");
  const [draftOwn, setDraftOwn] = useState<Record<string, number>>(currentOwn);
  const [draftBarcode, setDraftBarcode] = useState<Record<string, number>>(currentBarcode);
  const isMobile = useIsMobile();

  // Al abrir: draft = estado aplicado. La búsqueda se limpia al CERRAR (no al abrir):
  // en modo embebido el primer tecleo escribe ANTES de abrir y no debe perderse.
  useEffect(() => {
    if (open) {
      setDraftOwn({ ...currentOwn });
      setDraftBarcode({ ...currentBarcode });
    } else {
      setSearch("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => u.search.includes(q));
  }, [items, search]);

  // Categorías cubiertas — clave PRIMITIVA (join) como dep: la identidad del array
  // puede cambiar por render del padre sin cambio real (lección del efecto de foco).
  const coveredKey = coveredCategoryIds.join(",");
  const coveredSet = useMemo(() => new Set(coveredKey ? coveredKey.split(",") : []), [coveredKey]);

  // Poda EN VIVO del draft cuando una categoría pasa a cubrir refs pineadas (los chips
  // de categoría del form quedan clickeables con el picker abierto): sin esto el pin
  // quedaría ATRAPADO sin control y Aplicar persistiría redundancia. Emite el draft
  // podado para que contador/preview del padre se corrijan al instante.
  useEffect(() => {
    if (coveredSet.size === 0) return;
    const catByKey = new Map(items.map((u) => [u.key, u.categoryId]));
    const strip = (d: Record<string, number>): Record<string, number> | null => {
      const nd: Record<string, number> = {};
      let changed = false;
      for (const [k, v] of Object.entries(d)) {
        if (coveredSet.has(catByKey.get(k) ?? "")) changed = true;
        else nd[k] = v;
      }
      return changed ? nd : null;
    };
    const nOwn = strip(draftOwn);
    const nBar = strip(draftBarcode);
    if (nOwn || nBar) {
      const own = nOwn ?? draftOwn;
      const bar = nBar ?? draftBarcode;
      if (nOwn) setDraftOwn(own);
      if (nBar) setDraftBarcode(bar);
      onDraftChange?.(own, bar);
    }
  }, [coveredKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function adjustQty(u: SelectableItem, delta: number): void {
    if (single) {
      // TARGET ÚNICO con stepper: EXCLUSIVO cross-bucket (pisar el stepper de B
      // desmarca A aunque viva en el otro record own↔barcode). Piso inteligente:
      // 0 + → qtyFloor; bajar del floor → 0 (deselección). Selección VIVA (se emite
      // por onDraftChange) y el + CIERRA el picker — elegiste tu producto, listo:
      // no hay caso real de seguir navegando; apilar cantidad sigue en la card.
      const curr = (u.kind === "own" ? draftOwn : draftBarcode)[u.key] ?? 0;
      let next = curr === 0 && delta > 0 ? qtyFloor : curr + delta;
      if (next < qtyFloor) next = 0;
      next = Math.min(next, maxQty);
      const nOwn: Record<string, number> = u.kind === "own" && next > 0 ? { [u.key]: next } : {};
      const nBar: Record<string, number> = u.kind === "barcode" && next > 0 ? { [u.key]: next } : {};
      setDraftOwn(nOwn);
      setDraftBarcode(nBar);
      onDraftChange?.(nOwn, nBar);
      if (delta > 0) onClose(); // el − (deseleccionar para cambiar) NO cierra
      return;
    }
    const own = u.kind === "own";
    const draft = own ? draftOwn : draftBarcode;
    const curr = draft[u.key] ?? 0;
    const next = Math.max(0, Math.min(maxQty, curr + delta));
    // Record próximo calculado SINCRÓNICO (no updater): se emite el mismo valor que se setea.
    const nd = { ...draft };
    if (next === 0) delete nd[u.key];
    else nd[u.key] = next;
    (own ? setDraftOwn : setDraftBarcode)(nd);
    onDraftChange?.(own ? nd : draftOwn, own ? draftBarcode : nd);
  }

  function handleApply(): void {
    onApply(draftOwn, draftBarcode);
    onClose();
  }

  const totalCount =
    Object.values(draftOwn).reduce((s, q) => s + q, 0) +
    Object.values(draftBarcode).reduce((s, q) => s + q, 0);

  // Estado base = sin NINGÚN producto APLICADO (no draft) → el trigger embebido es el
  // dropzone grande (espejo del de Imagen); con items pasa a la versión compacta.
  const isEmpty =
    Object.keys(currentOwn).length + Object.keys(currentBarcode).length === 0;

  // Foco al expandir (desktop): `preventScroll` evita el scroll-into-view del navegador
  // A MITAD de la animación de altura. Deps solo primitivas — una función del padre
  // re-enfocaría (roba el foco) tras cada click en ±.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (open && !isMobile) {
      panelRef.current?.querySelector("input")?.focus({ preventScroll: true });
    }
  }, [open, isMobile]);

  // `single` es VIVO y Seleccionar CIERRA solo → el footer solo sirve para salir SIN
  // elegir: eso es Cancelar, no "Listo". Los demás modos conservan draft + Cancelar/Aplicar.
  const footer = single ? (
    <Button variant="outline" onClick={onClose}>Cancelar</Button>
  ) : (
    <>
      <Button variant="outline" onClick={onClose} className="max-md:hidden">Cancelar</Button>
      <Button onClick={handleApply}>
        Aplicar ({totalCount} item{totalCount !== 1 ? "s" : ""})
      </Button>
    </>
  );

  // Fila COMPARTIDA (misma card en modal mobile y lista desktop): thumb + nombre +
  // chip/agotado + precio + control. Control por modo: stepper [− qty +] (cantidades
  // reales: combo/cuponera), toggle check (membresía: está o no está — time-promo), o
  // botón Seleccionar (target único).
  const renderUnit = (u: SelectableItem) => {
    const draft = u.kind === "own" ? draftOwn : draftBarcode;
    const qty = draft[u.key] ?? 0;
    // Cubierto por una categoría marcada: SIN control (pinearlo sería redundante) —
    // chip ámbar informativo, mismo ámbar de los chips de categoría del form.
    const covered = coveredSet.has(u.categoryId);
    return (
      <div
        key={`${u.kind}:${u.key}`}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
      >
        <ItemThumb src={u.src} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{u.label}</p>
            {u.kind === "barcode" && (
              <span className="inline-flex h-4 shrink-0 items-center rounded bg-emerald-100 px-1 text-[9px] font-medium uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                barcode
              </span>
            )}
            {!u.available && (
              <span className="text-[10px] text-amber-600 dark:text-amber-500">Agotado</span>
            )}
          </div>
          <p className="text-xs text-zinc-500">{formatPrice(u.price, currSymbol, decimals, locale)}</p>
        </div>
        {covered ? (
          <span
            title="Ya cubierto por una categoría marcada en la promo"
            className="inline-flex h-4 shrink-0 items-center rounded bg-amber-100 px-1 text-[9px] font-medium uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          >
            Por categoría
          </span>
        ) : single ? (
          qty > 0 ? (
            <span className="inline-flex w-24 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              Seleccionado
            </span>
          ) : (
            <button
              type="button"
              onClick={() => adjustQty(u, 1)}
              className="inline-flex w-24 shrink-0 items-center justify-center rounded-lg border border-transparent bg-zinc-900 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Seleccionar
            </button>
          )
        ) : membership ? (
          <button
            type="button"
            aria-pressed={qty > 0}
            aria-label={qty > 0 ? "Quitar" : "Agregar"}
            onClick={() => adjustQty(u, qty > 0 ? -qty : 1)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              qty > 0
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {qty > 0 ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={qty === 0}
              onClick={() => adjustQty(u, -1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {qty}
            </span>
            <button
              type="button"
              disabled={qty >= maxQty}
              onClick={() => adjustQty(u, 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Lista PLANA (modal mobile): la búsqueda filtra TODO.
  const listEl = (
      <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-zinc-400 py-8">No se encontraron productos</p>
        )}
        {filtered.map(renderUnit)}
      </div>
  );

  // Lista DESKTOP (embebido): la búsqueda ORDENA, no excluye — nada desaparece. Ranking
  // único: matchea → 0 · seleccionado O cubierto-por-categoría → 1 · resto → 2; sort
  // ESTABLE (ES2019) = orden de catálogo dentro de cada grupo.
  const desktopUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rank = (u: SelectableItem): number => {
      if (q && u.search.includes(q)) return 0;
      if (coveredSet.has(u.categoryId)) return 1;
      const qty = (u.kind === "own" ? draftOwn : draftBarcode)[u.key] ?? 0;
      return qty > 0 ? 1 : 2;
    };
    return [...items].sort((a, b) => rank(a) - rank(b));
  }, [items, draftOwn, draftBarcode, search, coveredSet]);

  const body = (
    <div className="space-y-3">
      <InputSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar producto o variante..."
      />
      {listEl}
    </div>
  );

  const modal = (
    <Modal
      open={open && isMobile}
      onClose={onClose}
      title={single ? "Agregar producto" : "Agregar productos"}
      bottomContent={footer}
    >
      {body}
    </Modal>
  );

  return (
      <div>
          {!(single && !isEmpty) && (
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              open ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            }`}
          >
            <div className="overflow-hidden" inert={open || undefined}>
              {isEmpty ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-6 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50"
                >
                  <PackagePlus className="h-8 w-8 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-500">{single ? "Agregar producto" : "Agregar productos"}</span>
                  <span className="text-xs text-zinc-400">{emptyHint}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpen}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
                >
                  <Plus className="h-4 w-4" />
                  Agregar productos
                </button>
              )}
            </div>
          </div>
          )}

          <div
            className={`hidden md:grid transition-[grid-template-rows] duration-300 ease-out ${
              open && !isMobile ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div ref={panelRef} className="overflow-hidden px-1 -mx-1" inert={!open || undefined}>
              {!isMobile && (
                <div className="space-y-3 py-1">
                  <InputSearch
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClear={() => setSearch("")}
                    placeholder="Buscar producto o variante..."
                  />
                  <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
                    {desktopUnits.map(renderUnit)}
                    {items.length === 0 && (
                      <p className="text-center text-sm text-zinc-400 py-8">No hay productos en el catálogo</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    {footer}
                  </div>
                </div>
              )}
            </div>
          </div>
        {modal}
      </div>
  );
}
