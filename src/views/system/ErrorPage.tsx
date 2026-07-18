"use client";

// Error boundary raíz de la app (ver _VIEW-LAYER.md §16.3).
// Recibe la firma estándar de Next: { error, reset }. Base neutral, sin negocio.

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Algo salió mal
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Ocurrió un error inesperado. Puedes intentar de nuevo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
      >
        Reintentar
      </button>
    </main>
  );
}
