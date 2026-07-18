import { type InputHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { getBorderClasses, getWrapperBorderClasses, getPrefixBgClasses, type InputTone } from "./input-styles";

export type { InputTone };

interface InputNumberProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string | boolean;
  valid?: boolean;
  /** Tono semántico (sin aria-invalid): tiñe borde+prefijo. Ej. zona de margen. */
  tone?: InputTone;
  prefix?: string;
  suffix?: string;
  /** Si se pasa, muestra un ✕ a la derecha DENTRO del input que limpia el campo. */
  onClear?: () => void;
  wrapperClassName?: string;
}

export default function InputNumber({
  label,
  error,
  valid,
  tone,
  prefix,
  suffix,
  onClear,
  wrapperClassName = "",
  className = "",
  id,
  ...props
}: InputNumberProps) {
  const inputId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const hasError = !!error;
  const errorMessage = typeof error === "string" ? error : null;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  const ariaProps = {
    "aria-invalid": hasError || undefined,
    "aria-describedby": errorId,
  };

  const state = { hasError, valid, tone };
  const borderClass = getBorderClasses(state);
  const wrapperBorderClass = getWrapperBorderClasses(state);
  const prefixBg = getPrefixBgClasses(state);

  const hasAddon = prefix || suffix || onClear;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      {hasAddon ? (
        <div className={`flex overflow-hidden rounded-lg border bg-white transition-colors duration-150 focus-within:outline-none focus-within:ring-2 dark:bg-zinc-800 ${wrapperBorderClass}`}>
          {prefix && (
            <span className={`flex items-center px-3 text-sm font-medium ${prefixBg}`}>
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            className={`w-full border-none bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${className}`}
            {...ariaProps}
            {...props}
          />
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              tabIndex={-1}
              aria-label="Limpiar"
              className="flex shrink-0 items-center px-2.5 text-zinc-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {suffix && (
            <span className="flex items-center px-3 text-xs text-zinc-400 dark:text-zinc-500">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${borderClass} ${className}`}
          {...ariaProps}
          {...props}
        />
      )}
      {errorMessage && (
        <p id={errorId} role="alert" className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
