"use client";

/**
 * MoneyInput — caja para CUALQUIER campo de dinero. Versión BASE de-acoplada del
 * dominio: en vez de recibir `country` y resolver moneda vía el SSoT del dominio,
 * recibe `symbol` (prefijo) y `decimals` por props. El consumidor decide la moneda.
 * Mantiene el saneo (`sanitizeDecimalInput`) en `onChange` y la normalización
 * (`formatDecimalInput`) en `onBlur`.
 *
 * Wraps `InputNumber` (presentational puro, sin conocimiento de moneda).
 */
import type { ReactNode } from "react";
import { sanitizeDecimalInput, formatDecimalInput } from "@/utils/decimal-input";
import InputNumber, { type InputTone } from "./InputNumber";

interface MoneyInputProps {
  /** Símbolo de la moneda (prefijo del input). Ej. "$", "S/", "€". */
  symbol: string;
  /** Decimales de la moneda (0, 2, …). */
  decimals: number;
  value: string;
  onValueChange: (value: string) => void;
  label?: ReactNode;
  error?: string | boolean;
  valid?: boolean;
  tone?: InputTone;
  onClear?: () => void;
  id?: string;
  placeholder?: string;
  wrapperClassName?: string;
  "aria-label"?: string;
}

export default function MoneyInput({
  symbol,
  decimals,
  value,
  onValueChange,
  label,
  error,
  valid,
  tone,
  onClear,
  id,
  placeholder,
  wrapperClassName,
  "aria-label": ariaLabel,
}: MoneyInputProps) {
  const step = decimals === 0 ? 1 : Math.pow(10, -decimals);

  return (
    <InputNumber
      id={id}
      label={label}
      aria-label={ariaLabel}
      min={0}
      step={step}
      value={value}
      onChange={(e) => onValueChange(sanitizeDecimalInput(e.target.value, decimals))}
      onBlur={() => onValueChange(formatDecimalInput(value, decimals))}
      prefix={symbol}
      placeholder={placeholder ?? (decimals === 0 ? "0" : "0.00")}
      inputMode={decimals === 0 ? "numeric" : "decimal"}
      error={error}
      valid={valid}
      tone={tone}
      onClear={onClear}
      wrapperClassName={wrapperClassName}
    />
  );
}
