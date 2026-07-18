import { type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

interface InputSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export default function InputSearch({
  onClear,
  wrapperClassName = "",
  value,
  className = "",
  ...props
}: InputSearchProps) {
  const hasValue = typeof value === "string" ? value.length > 0 : !!value;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={value}
        aria-label="Buscar"
        className={`w-full rounded-lg shadow-sm bg-white py-2 pl-9 ${onClear ? "pr-9" : "pr-3"} text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-sky-400/30 ${className}`}
        {...props}
      />
      {onClear && hasValue && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-150 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
