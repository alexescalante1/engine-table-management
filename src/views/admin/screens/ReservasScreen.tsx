"use client";

import { CalendarClock, Plus } from "lucide-react";
import { Button, ScreenHeader } from "@/views/admin/components/primitives";
import { EmptyState } from "@/views/admin/components/overlays";

// Placeholder: estado vacío con el componente EmptyState del kit. Sin lógica.
export default function ReservasScreen() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <ScreenHeader title="Reservas" subtitle="Gestiona las reservas del día." />
        <Button size="sm">
          <Plus className="h-4 w-4" /> Nueva reserva
        </Button>
      </div>

      <div className="mt-6">
        <EmptyState
          icon={CalendarClock}
          title="Aún no hay reservas"
          description="Cuando se registren reservas aparecerán aquí. Esta pantalla es solo la base visual — sin lógica conectada."
          action={
            <Button>
              <Plus className="h-4 w-4" /> Crear la primera
            </Button>
          }
        />
      </div>
    </div>
  );
}
