"use client";

import { Plus } from "lucide-react";
import { Card, Badge, Button, ScreenHeader } from "@/views/admin/components/primitives";

// Placeholder: grid de mesas con estados estáticos. Sin lógica.
type Estado = "Libre" | "Ocupada" | "Reservada";
const TONE: Record<Estado, "success" | "danger" | "warning"> = {
  Libre: "success",
  Ocupada: "danger",
  Reservada: "warning",
};

const MESAS: { n: number; estado: Estado; personas: number }[] = Array.from(
  { length: 12 },
  (_, i) => ({
    n: i + 1,
    estado: (["Libre", "Ocupada", "Reservada"] as Estado[])[i % 3],
    personas: [2, 4, 6, 4][i % 4],
  }),
);

export default function MesasScreen() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <ScreenHeader title="Mesas" subtitle="Estado del salón en tiempo real." />
        <Button size="sm">
          <Plus className="h-4 w-4" /> Nueva mesa
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {MESAS.map((m) => (
          <Card key={m.n} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Mesa {m.n}
              </span>
              <Badge variant={TONE[m.estado]}>{m.estado}</Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Capacidad: {m.personas} personas
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
