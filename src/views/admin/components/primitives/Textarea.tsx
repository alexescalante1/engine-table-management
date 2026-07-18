import { type TextareaHTMLAttributes } from "react";
import { getBorderClasses } from "./input-styles";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  valid?: boolean;
  wrapperClassName?: string;
  counter?: { current: number; max: number };
}

export default function Textarea({
  label,
  error,
  valid,
  wrapperClassName = "",
  className = "",
  counter,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const hasError = !!error;
  const errorMessage = typeof error === "string" ? error : null;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  const ariaProps = {
    "aria-invalid": hasError || undefined,
    "aria-describedby": errorId,
  };

  const borderClass = getBorderClasses({ hasError, valid });

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {(label || counter) && (
        <div className="flex items-baseline justify-between">
          {label && (
            <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </label>
          )}
          {counter && (
            <span className={`text-xs tabular-nums ${counter.current > counter.max ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}`}>
              {counter.current}/{counter.max}
            </span>
          )}
        </div>
      )}
      <textarea
        id={inputId}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${borderClass} ${className}`}
        {...ariaProps}
        {...props}
      />
      {errorMessage && (
        <p id={errorId} role="alert" className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
