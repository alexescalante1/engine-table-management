"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { Check, X, Loader2 } from "lucide-react";

export enum ToastVariant {
  SUCCESS = "success",
  ERROR = "error",
  LOADING = "loading",
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 2500;

const VARIANTS: Record<
  ToastVariant,
  { border: string; iconColor: string; Icon: typeof Check; spin?: boolean }
> = {
  [ToastVariant.SUCCESS]: { border: "border-emerald-500", iconColor: "text-emerald-400", Icon: Check },
  [ToastVariant.ERROR]: { border: "border-red-500", iconColor: "text-red-400", Icon: X },
  [ToastVariant.LOADING]: { border: "border-amber-500", iconColor: "text-amber-400", Icon: Loader2, spin: true },
};

function ToastOverlay({
  message,
  variant,
  onDismiss,
}: {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}) {
  const { border, iconColor, Icon, spin } = VARIANTS[variant];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[9999] flex justify-center">
      <div
        onClick={onDismiss}
        className={`animate-fade-in pointer-events-auto mx-4 flex max-w-[480px] cursor-pointer items-center gap-3 rounded-xl border-2 ${border} bg-zinc-900 px-5 py-3.5 shadow-2xl`}
      >
        <Icon
          size={16}
          className={`shrink-0 ${iconColor}${spin ? " animate-spin" : ""}`}
          strokeWidth={2.5}
        />
        <p className="text-sm font-medium text-zinc-100">{message}</p>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Limpia un timer pendiente si el provider se desmonta (evita setState en árbol desmontado).
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = ToastVariant.SUCCESS) => {
      clearTimeout(timerRef.current);
      setToast({ message, variant });
      if (variant !== ToastVariant.LOADING) {
        timerRef.current = setTimeout(() => setToast(null), DURATION);
      }
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* El toast solo aparece tras interacción (cliente); el guard evita tocar
          document en SSR. Sin necesidad de un effect de "mounted". */}
      {toast && typeof document !== "undefined"
        ? createPortal(
            <ToastOverlay message={toast.message} variant={toast.variant} onDismiss={dismiss} />,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
