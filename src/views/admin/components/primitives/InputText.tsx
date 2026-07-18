import { forwardRef, type InputHTMLAttributes } from "react";
import {
  getBorderClasses,
  getWrapperBorderClasses,
  getPrefixBgClasses,
  getBgClasses,
  getTextClasses,
  getLabelClasses,
  getErrorTextClasses,
} from "./input-styles";

interface InputTextProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  valid?: boolean;
  prefix?: string;
  suffix?: string;
  /** Color/tono/peso del prefix. Reemplaza el estilo por-estado (evita conflicto de utilidades). */
  prefixClassName?: string;
  /** Color/tono del suffix. Reemplaza el zinc por defecto (evita conflicto de utilidades). */
  suffixClassName?: string;
  wrapperClassName?: string;
  dark?: boolean;
}

const InputText = forwardRef<HTMLInputElement, InputTextProps>(function InputText({
  label,
  error,
  valid,
  prefix,
  suffix,
  prefixClassName,
  suffixClassName,
  wrapperClassName = "",
  dark,
  className = "",
  id,
  ...props
}, ref) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = !!error;
  const errorMessage = typeof error === "string" ? error : null;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  const ariaProps = {
    "aria-invalid": hasError || undefined,
    "aria-describedby": errorId,
  };

  const state = { hasError, valid, dark };
  const borderClass = getBorderClasses(state);
  const wrapperBorderClass = getWrapperBorderClasses(state);
  const bgClass = getBgClasses(dark);
  const textClass = getTextClasses(dark);
  const labelClass = getLabelClasses(dark);
  const errorClass = getErrorTextClasses(dark);
  const prefixBg = getPrefixBgClasses(state);

  const hasAddon = prefix || suffix;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className={`text-sm font-medium ${labelClass}`}>
          {label}
        </label>
      )}
      {hasAddon ? (
        <div className={`flex overflow-hidden rounded-lg border transition-colors duration-150 ${bgClass} focus-within:outline-none focus-within:ring-2 ${wrapperBorderClass}`}>
          {prefix && (
            <span className={`flex items-center px-3 text-sm ${prefixClassName ?? `font-medium ${prefixBg}`}`}>
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full border-none bg-transparent px-3 py-2 text-sm ${textClass} transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...ariaProps}
            {...props}
          />
          {suffix && (
            <span className={`flex shrink-0 items-center whitespace-nowrap px-3 text-xs ${suffixClassName ?? "text-zinc-400 dark:text-zinc-500"}`}>
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border ${bgClass} px-3 py-2 text-sm ${textClass} transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${borderClass} ${className}`}
          {...ariaProps}
          {...props}
        />
      )}
      {errorMessage && (
        <p id={errorId} role="alert" className={`text-xs ${errorClass}`}>{errorMessage}</p>
      )}
    </div>
  );
});

export default InputText;
