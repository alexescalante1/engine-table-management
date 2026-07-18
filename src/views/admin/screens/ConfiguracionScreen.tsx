"use client";

import { useState } from "react";
import {
  Card,
  Button,
  InputText,
  Toggle,
  ScreenHeader,
  SectionHeader,
} from "@/views/admin/components/primitives";
import { useToast, ToastVariant } from "@/views/admin/providers";

// Placeholder: formulario de ajustes con los primitives (input + toggles).
// Estado local de UI únicamente — no persiste nada.
export default function ConfiguracionScreen() {
  const { showToast } = useToast();
  const [nombre, setNombre] = useState("Mi Restaurante");
  const [aforo, setAforo] = useState("80");
  const [reservasOnline, setReservasOnline] = useState(true);
  const [notificaciones, setNotificaciones] = useState(false);

  return (
    <div className="space-y-8">
      <ScreenHeader title="Configuración" subtitle="Ajustes generales del local." />

      <div className="space-y-3">
        <SectionHeader label="General" />
        <Card className="space-y-4">
          <InputText
            label="Nombre del local"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <InputText label="Aforo máximo" type="number" value={aforo} onChange={(e) => setAforo(e.target.value)} />
        </Card>
      </div>

      <div className="space-y-3">
        <SectionHeader label="Preferencias" />
        <Card className="space-y-4">
          <Toggle
            checked={reservasOnline}
            onChange={setReservasOnline}
            label="Reservas online"
            description="Permitir que los clientes reserven desde la web."
          />
          <Toggle
            checked={notificaciones}
            onChange={setNotificaciones}
            label="Notificaciones por correo"
            description="Recibir un aviso por cada nueva reserva."
          />
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost">Cancelar</Button>
        <Button onClick={() => showToast("Guardado (demo, sin persistencia).", ToastVariant.SUCCESS)}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
