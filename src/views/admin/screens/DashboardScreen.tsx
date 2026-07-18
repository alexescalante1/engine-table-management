"use client";

import { Grid3x3, CalendarClock, Users, Clock, ArrowUpRight } from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Skeleton,
  ScreenHeader,
  SectionHeader,
} from "@/views/admin/components/primitives";
import StatCard from "@/views/admin/components/StatCard";

// Dashboard placeholder: UI/UX pulida con datos ESTÁTICOS de ejemplo.
// Sin fetch, sin estado de negocio — solo la base visual.

const STATS = [
  { label: "Mesas ocupadas", value: "12 / 20", icon: Grid3x3, hint: "60% de ocupación" },
  { label: "Reservas hoy", value: "34", icon: CalendarClock, hint: "8 pendientes" },
  { label: "Comensales", value: "96", icon: Users, hint: "Promedio 2.8 por mesa" },
  { label: "Espera media", value: "14 min", icon: Clock, hint: "−3 min vs. ayer" },
];

const ACTIVITY = [
  { text: "Mesa 4 marcada como ocupada", time: "hace 2 min", tone: "success" as const },
  { text: "Reserva #1024 confirmada", time: "hace 11 min", tone: "info" as const },
  { text: "Mesa 9 liberada", time: "hace 20 min", tone: "default" as const },
  { text: "Reserva #1023 cancelada", time: "hace 32 min", tone: "danger" as const },
];

export default function DashboardScreen() {
  return (
    <div className="space-y-8">
      <ScreenHeader title="Dashboard" subtitle="Resumen general del servicio de hoy." large />

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Contenido en 2 columnas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <SectionHeader label="Actividad reciente" />
          <Card padding="none" className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ACTIVITY.map((a) => (
              <div key={a.text} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Badge variant={a.tone}>•</Badge>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{a.text}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{a.time}</span>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-3">
          <SectionHeader label="Ocupación por zona" />
          <Card className="space-y-4">
            {["Salón principal", "Terraza", "Barra"].map((zone, i) => (
              <div key={zone} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">{zone}</span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    {[80, 45, 60][i]}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-white"
                    style={{ width: `${[80, 45, 60][i]}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Reporte del día
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Placeholder</p>
            </div>
            <Button variant="outline" size="sm">
              Ver <ArrowUpRight size={14} />
            </Button>
          </Card>
        </div>
      </div>

      {/* Estado loading de ejemplo */}
      <div className="space-y-3">
        <SectionHeader label="Cargando (skeleton de ejemplo)" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
