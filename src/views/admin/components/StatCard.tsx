import type { LucideIcon } from "lucide-react";
import { Card } from "./primitives";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}

// Tarjeta de métrica del dashboard. Presentacional puro — el valor llega por prop.
export default function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
        {hint && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </div>
    </Card>
  );
}
