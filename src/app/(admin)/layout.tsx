import { AdminNavProvider } from "@/views/admin/router";
import { AdminShell } from "@/views/admin/shell";

// Layout del frontier admin. Monta el provider de navegación SPA + el shell
// (ambos persisten entre secciones). El swap de pantalla es client-side.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminNavProvider>
      <AdminShell>{children}</AdminShell>
    </AdminNavProvider>
  );
}
