/**
 * Formatea un monto con símbolo de moneda.
 *
 *  - **Sin `locale`** → simple: `${symbol} ${amount.toFixed(decimals)}`.
 *  - **Con `locale`** → `toLocaleString` con separadores de miles + `decimals`
 *    (0 para monedas sin decimales). El locale es EXPLÍCITO → determinista
 *    server↔cliente (hidratación segura); jamás `toLocaleString()` sin locale.
 */
export function formatPrice(amount: number, symbol = "S/", decimals = 2, locale?: string): string {
  const body = locale != null
    ? amount.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : amount.toFixed(decimals);
  return `${symbol} ${body}`;
}
