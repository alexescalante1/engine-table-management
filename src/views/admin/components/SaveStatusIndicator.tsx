"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, AlertCircle, AlertTriangle, WifiOff, Clock } from "lucide-react";
import type { SaveStatus } from "@/views/admin/hooks/auto-save";

interface Props {
  status: SaveStatus;
  hasValidationErrors: boolean;
  countdownEnd?: number | null;
  retryInfo?: { attempt: number; max: number } | null;
}

export default function SaveStatusIndicator({
  status, hasValidationErrors, countdownEnd, retryInfo,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!countdownEnd) { setSecondsLeft(null); return; }
    const tick = () => {
      const s = Math.max(0, Math.ceil((countdownEnd - Date.now()) / 1000));
      setSecondsLeft(s);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [countdownEnd]);

  if (hasValidationErrors) {
    return (
      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Corrige los errores">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">Corrige los errores</span>
      </span>
    );
  }

  let Icon;
  let label: string;
  let color: string;
  let animate = "";

  switch (status) {
    case "idle":
      Icon = Check; label = "Sin cambios pendientes"; color = "text-zinc-300 dark:text-zinc-600";
      break;
    case "pending":
      Icon = Clock;
      label = secondsLeft != null ? `Guardando en ${secondsLeft}s` : "Cambios sin guardar";
      color = "text-zinc-400 dark:text-zinc-500";
      if (secondsLeft == null) animate = " animate-pulse";
      break;
    case "saving":
      Icon = Loader2; label = "Guardando\u2026"; color = "text-zinc-500 dark:text-zinc-400";
      animate = " animate-spin";
      break;
    case "retrying":
      Icon = WifiOff;
      label = retryInfo ? `Reintentando\u2026 (${retryInfo.attempt}/${retryInfo.max})` : "Reintentando\u2026";
      color = "text-amber-600 dark:text-amber-400";
      break;
    case "saved":
      Icon = Check; label = "Cambios guardados"; color = "text-green-600 dark:text-green-400";
      break;
    case "error":
      Icon = AlertCircle; label = "No se pudo guardar"; color = "text-red-500";
      break;
  }

  return (
    <span className={`flex items-center gap-1 ${color}`} title={label}>
      <Icon className={`h-3.5 w-3.5${animate}`} />
      <span className="text-[11px] font-medium">{label}</span>
    </span>
  );
}
