"use client";

import { useRef } from "react";
import FileInput from "./FileInput";
import { motion } from "framer-motion";
import { useImage } from "@/views/admin/hooks";
import { ImagePlus, Plus, X, Loader2 } from "lucide-react";

interface PhotoGridProps {
  photoIds: string[];
  maxItems: number;
  thumbSize: string;
  getPhotoUrl: (photoId: string) => string;
  onAddPhoto: (file: File) => void;
  onRemovePhoto: (photoId: string) => void;
  onReorder: (newPhotoIds: string[]) => void;
  onDragEnd: () => void;
  uploading?: boolean;
  disabled?: boolean;
  /** When provided, clicking + calls this instead of opening file picker */
  onRequestAdd?: () => void;
}

function Thumb({ src }: { src: string }) {
  const url = useImage(src);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- object URL de useImage; next/image no aplica
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800"><ImagePlus className="h-4 w-4" /></div>
  );
}

export default function PhotoGrid({
  photoIds,
  maxItems,
  thumbSize,
  getPhotoUrl,
  onAddPhoto,
  onRemovePhoto,
  onReorder,
  onDragEnd: onDragEndProp,
  uploading = false,
  disabled = false,
  onRequestAdd,
}: PhotoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragIdxRef = useRef<number | null>(null);
  const orderRef = useRef(photoIds);
  orderRef.current = photoIds;
  const slotsRef = useRef<{ x: number; y: number }[]>([]);

  return (
    <div ref={gridRef} className="flex flex-wrap gap-2">
      {photoIds.map((photoId, idx) => (
        <motion.div
          key={photoId}
          data-drag-item
          layout
          drag
          dragSnapToOrigin
          dragElastic={0.1}
          whileDrag={{ scale: 1.05, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", zIndex: 50 }}
          onDragStart={() => {
            dragIdxRef.current = idx;
            const items = gridRef.current?.querySelectorAll<HTMLElement>("[data-drag-item]");
            if (items) {
              slotsRef.current = Array.from(items).map((el) => {
                const r = el.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
              });
            }
          }}
          onDrag={(_, info) => {
            if (dragIdxRef.current === null) return;
            let closestIdx = -1;
            let closestDist = Infinity;
            for (let i = 0; i < slotsRef.current.length; i++) {
              const s = slotsRef.current[i];
              const d = Math.hypot(info.point.x - s.x, info.point.y - s.y);
              if (d < closestDist) { closestDist = d; closestIdx = i; }
            }
            if (closestIdx >= 0 && closestIdx !== dragIdxRef.current) {
              const newOrder = [...orderRef.current];
              const [item] = newOrder.splice(dragIdxRef.current, 1);
              newOrder.splice(closestIdx, 0, item);
              dragIdxRef.current = closestIdx;
              onReorder(newOrder);
            }
          }}
          onDragEnd={() => {
            dragIdxRef.current = null;
            slotsRef.current = [];
            onDragEndProp();
          }}
          className={`group relative ${thumbSize} cursor-grab select-none overflow-hidden rounded-lg active:cursor-grabbing`}
          style={{ touchAction: "none" }}
        >
          <div className="pointer-events-none h-full w-full">
            <Thumb src={getPhotoUrl(photoId)} />
          </div>
          <button
            type="button"
            onClick={() => onRemovePhoto(photoId)}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-opacity md:opacity-0 md:group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      ))}

      {photoIds.length < maxItems && !disabled && (
        onRequestAdd ? (
          <button
            type="button"
            onClick={onRequestAdd}
            disabled={uploading}
            className={`flex ${thumbSize} cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-500${uploading ? " pointer-events-none opacity-50" : ""}`}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
          </button>
        ) : (
          <label
            className={`flex ${thumbSize} cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-500${uploading ? " pointer-events-none opacity-50" : ""}`}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-6 w-6" />
                <FileInput accept="image/jpeg,image/png,image/webp" onChange={onAddPhoto} />
              </>
            )}
          </label>
        )
      )}
    </div>
  );
}
