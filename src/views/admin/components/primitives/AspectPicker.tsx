"use client";

import { GALLERY_ASPECTS, type GalleryAspect } from "./gallery-aspects";

interface AspectPickerProps {
  value: GalleryAspect;
  onChange: (v: GalleryAspect) => void;
  variant?: "default" | "dark" | "pills";
}

const ASPECT_SIZES: Record<GalleryAspect, string> = {
  "1:1": "h-8 w-8",
  "4:3": "h-7 w-9",
  "16:9": "h-5 w-9",
  "21:9": "h-4 w-12",
  "3:4": "h-9 w-7",
  "auto": "h-8 w-10",
};

/** Iconos proporcionales inline para pills */
const PILL_SIZES: Record<GalleryAspect, string> = {
  "1:1": "h-3.5 w-3.5",
  "4:3": "h-3 w-4",
  "16:9": "h-2.5 w-4",
  "21:9": "h-2 w-5",
  "3:4": "h-4 w-3",
  "auto": "h-3.5 w-4",
};

const STYLES = {
  default: {
    selected: "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950",
    unselected: "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
    box: "bg-zinc-400 dark:bg-zinc-500",
    label: "text-zinc-600 dark:text-zinc-400",
  },
  dark: {
    selected: "border-white/50 bg-white/10",
    unselected: "border-white/15 hover:border-white/30",
    box: "bg-white/40",
    label: "text-white/70",
  },
};

const PILL_STYLES = {
  selected: "border-white/50 bg-white/10",
  unselected: "border-white/15 hover:border-white/30",
  box: "bg-white/50",
  label: "text-white/80",
};

export default function AspectPicker({ value, onChange, variant = "default" }: AspectPickerProps) {
  if (variant === "pills") {
    return (
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {GALLERY_ASPECTS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => onChange(a.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
              value === a.value ? PILL_STYLES.selected : PILL_STYLES.unselected
            }`}
          >
            <div className={`rounded-sm ${PILL_STYLES.box} ${PILL_SIZES[a.value]}`} />
            <span className={`text-xs font-medium whitespace-nowrap ${PILL_STYLES.label}`}>{a.label}</span>
          </button>
        ))}
      </div>
    );
  }

  const s = STYLES[variant];
  return (
    <div className="grid grid-cols-3 gap-2">
      {GALLERY_ASPECTS.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => onChange(a.value)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-colors ${
            value === a.value ? s.selected : s.unselected
          }`}
        >
          <div className={`rounded ${s.box} ${ASPECT_SIZES[a.value]}`} />
          <span className={`text-xs font-medium ${s.label}`}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
