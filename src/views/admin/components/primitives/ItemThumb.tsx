"use client";

/**
 * ItemThumb — miniatura genérica de item (producto/variante) para pickers y listas.
 * `useImage` resuelve por el ImageManager: instantáneo si ya está en RAM (getSync HIT),
 * placeholder si falta. NUNCA `<img src={firebaseUrl}>` crudo (re-descargaría).
 */
import { ImagePlus } from "lucide-react";
import { useImage } from "@/views/admin/hooks";

export default function ItemThumb({ src, size = "h-10 w-10" }: { src: string | null; size?: string }) {
  const url = useImage(src);
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL de useImage; next/image no aplica
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600"><ImagePlus className="h-4 w-4" /></div>
      )}
    </div>
  );
}
