import Link from "next/link";

// Página 404 raíz de la app. Base neutral, sin negocio.

export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Página no encontrada
      </h1>
      <Link
        href="/"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
