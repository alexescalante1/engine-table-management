/**
 * Saneo + formato de un campo de decimales (input numérico de texto). Agnóstico:
 * sirve para cualquier campo con N decimales (precio, porcentaje, peso, etc.).
 * Pareja típica: `sanitizeDecimalInput` en `onChange`, `formatDecimalInput` en `onBlur`.
 */

/** Longitud de un grupo de miles genuino ("500" en "1.500.000") — universal, no depende de la moneda. */
const THOUSANDS_GROUP_LEN = 3;

/**
 * Sanea lo TECLEADO/PEGADO: coma→punto, solo dígitos + puntos + a lo más
 * `maxDecimals` decimales. Permite string vacío (para limpiar el campo).
 *   "15,999" → "15.99"   "12.5.5" → "12.55"   "abc1" → "1"   "" → ""
 *   "1.234,56" → "1234.56"  (agrupación de miles genuina, PASTE o TECLEO — ver abajo)
 *
 * El valor devuelto puede quedar TEMPORALMENTE ambiguo mientras se teclea (ver
 * bloque inferior) — el caller SIEMPRE debe pasar el valor final por
 * `formatDecimalInput` (onBlur) antes de usarlo para cálculo o persistencia;
 * ese es el único punto que garantiza `maxDecimals` dígitos exactos.
 */
export function sanitizeDecimalInput(raw: string, maxDecimals = 2): string {
  const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  const parts = cleaned.split(".");

  // Monedas sin subunidad (CLP/PYG/COP): el ÚLTIMO segmento solo es miles si tiene
  // EXACTAMENTE 3 dígitos (genuino, o en curso de completarse mientras se teclea con
  // un solo punto) — si no, es un remanente decimal que esta moneda no admite y se
  // DESCARTA (nunca se concatena). Antes se borraba TODO punto sin validar el grupo:
  // "15000,50" (hábito de centavos, o numpad con locale es-CL/PY/CO que emite coma)
  // se colaba como "1500050" — 100× el precio real, sin ningún bloqueo aguas abajo.
  if (maxDecimals <= 0) {
    const last = parts[parts.length - 1];
    const priorGroupsGenuine = parts.length < 3 || parts.slice(1, -1).every((g) => g.length === THOUSANDS_GROUP_LEN);
    if (last.length === THOUSANDS_GROUP_LEN && priorGroupsGenuine) return parts.join("");
    if (parts.length === 2 && last.length < THOUSANDS_GROUP_LEN) return cleaned; // ambiguo, en curso
    return parts.slice(0, -1).join(""); // remanente decimal espurio → descartado
  }

  // Agrupación de miles GENUINA (≥2 puntos Y cada grupo intermedio de EXACTAMENTE 3
  // dígitos — forma inequívoca en cualquier convención país, ej. "1.234,56" o
  // "1,234.56" ya con coma→punto): el ÚLTIMO segmento es el decimal, el resto son
  // miles → se descartan.
  if (parts.length >= 3 && parts.slice(1, -1).every((g) => g.length === THOUSANDS_GROUP_LEN)) {
    return `${parts.slice(0, -1).join("")}.${parts[parts.length - 1].slice(0, maxDecimals)}`;
  }

  // Un solo punto: el segmento que sigue puede ser el decimal en curso O un grupo
  // de miles esperando su separador (ej. tecleando "8.500" antes de la coma de
  // "8.500,50"). Mientras tenga ≤ max(maxDecimals, 3) dígitos queda AMBIGUO y se
  // preserva intacto — si llega el 2º separador, el bloque de arriba lo reconoce
  // como grupo en el SIGUIENTE keystroke; si no, se recorta al superar ese límite
  // (ya no puede ser un grupo válido de 3). Sin esto, tecleando letra por letra
  // "8.500,50" se perdía el "500" antes de que la coma pudiera confirmarlo (÷1000).
  const intPart = cleaned.slice(0, firstDot);
  const decPartRaw = cleaned.slice(firstDot + 1).replace(/\./g, "");
  const decPart = decPartRaw.length > Math.max(maxDecimals, THOUSANDS_GROUP_LEN)
    ? decPartRaw.slice(0, maxDecimals)
    : decPartRaw;
  return `${intPart}.${decPart}`;
}

/**
 * Normaliza al SALIR (onBlur) a exactamente `decimals` decimales. Vacío / inválido
 * / negativo → "" (deja ver el placeholder). Canónico: misma salida en hidratación
 * y en blur → el string-compare de dirty-state no genera falsos positivos.
 *   "15" → "15.00"   "15.5" → "15.50"   "." → ""   "" → ""
 */
export function formatDecimalInput(raw: string, decimals = 2): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const n = parseFloat(trimmed.replace(/,/g, "."));
  if (Number.isNaN(n) || n < 0) return "";
  return n.toFixed(decimals);
}

/**
 * "" / NaN / 0 → null; si no, el número parseado. Útil para campos numéricos
 * opcionales donde "0" equivale a "sin dato" (indistinguible de "no rastreado").
 */
export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) || parsed === 0 ? null : parsed;
}
