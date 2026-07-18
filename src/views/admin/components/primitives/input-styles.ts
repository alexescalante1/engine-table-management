/**
 * Tono semántico OPCIONAL del input (además de error/valid de validación). Lo usa
 * PriceFields para reflejar la ZONA de rentabilidad en el borde+prefijo del campo:
 * `danger` = rojo (no cubre el costo), `warning` = ámbar (margen ajustado). Default
 * (sin tone) = neutro → el input solo "se enciende" cuando hay algo que mirar.
 */
export type InputTone = "danger" | "warning";

type State = { hasError?: boolean; valid?: boolean; tone?: InputTone; dark?: boolean };

export function getBorderClasses({ hasError, valid, tone, dark }: State): string {
  if (hasError || tone === "danger") {
    return "border-red-500 focus:border-red-500 focus:ring-red-500";
  }
  if (tone === "warning") {
    return "border-amber-500 focus:border-amber-600 focus:ring-amber-500/30 dark:border-amber-400";
  }
  if (valid) {
    return dark
      ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-400/30"
      : "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/30 dark:border-emerald-400";
  }
  return dark
    ? "border-zinc-700 focus:border-sky-400 focus:ring-sky-400/30"
    : "border-zinc-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-600 dark:focus:border-sky-400 dark:focus:ring-sky-400/30";
}

export function getWrapperBorderClasses({ hasError, valid, tone, dark }: State): string {
  if (hasError || tone === "danger") {
    return "border-red-500 focus-within:border-red-500 focus-within:ring-red-500";
  }
  if (tone === "warning") {
    return "border-amber-500 focus-within:border-amber-600 focus-within:ring-amber-500/30 dark:border-amber-400 dark:focus-within:border-amber-400";
  }
  if (valid) {
    return dark
      ? "border-emerald-400 focus-within:border-emerald-400 focus-within:ring-emerald-400/30"
      : "border-emerald-500 focus-within:border-emerald-600 focus-within:ring-emerald-500/30 dark:border-emerald-400";
  }
  return dark
    ? "border-zinc-700 focus-within:border-sky-400 focus-within:ring-sky-400/30"
    : "border-zinc-300 focus-within:border-sky-500 focus-within:ring-sky-500/30 dark:border-zinc-600 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/30";
}

export function getPrefixBgClasses({ hasError, valid, tone, dark }: State): string {
  if (hasError || tone === "danger") {
    return dark
      ? "bg-red-950/30 text-red-400"
      : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
  }
  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
  }
  if (valid) {
    return dark
      ? "bg-emerald-950/30 text-emerald-400"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  }
  return dark
    ? "bg-zinc-700 text-zinc-400"
    : "bg-zinc-50 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400";
}

export function getBgClasses(dark?: boolean): string {
  return dark ? "bg-zinc-800" : "bg-white dark:bg-zinc-800";
}

export function getTextClasses(dark?: boolean): string {
  return dark
    ? "text-zinc-100 placeholder:text-zinc-500"
    : "text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500";
}

export function getLabelClasses(dark?: boolean): string {
  return dark ? "text-zinc-300" : "text-zinc-700 dark:text-zinc-300";
}

export function getErrorTextClasses(dark?: boolean): string {
  return dark ? "text-red-400" : "text-red-500";
}

export function getColorRingClasses(hasError: boolean): string {
  return hasError
    ? "border-red-500 focus-within:ring-red-500"
    : "border-zinc-300 focus-within:ring-sky-500/30 dark:border-zinc-600";
}
