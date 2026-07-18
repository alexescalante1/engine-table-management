// Catch-all: evita el 404 al entrar directo por URL o recargar (/admin,
// /admin/mesas, ...). El render real de cada pantalla lo hace <AdminRouter/>
// dentro de AdminShell (navegación SPA client-side).
export default function AdminCatchAllPage() {
  return null;
}
