"use client";

import { useState } from "react";
import { X } from "lucide-react";
import InputText from "./InputText";
import Button from "./Button";

interface TagListInputProps {
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  maxItems?: number;
  maxLength?: number;
  placeholder?: string;
  variant?: "zinc" | "amber";
}

const PILL_CLASSES = {
  zinc: {
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    button: "text-zinc-400 hover:text-red-500",
  },
  amber: {
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    button: "text-amber-400 hover:text-red-500",
  },
};

export default function TagListInput({
  label,
  items,
  onAdd,
  onRemove,
  maxItems = 10,
  maxLength = 20,
  placeholder,
  variant = "zinc",
}: TagListInputProps) {
  const [value, setValue] = useState("");

  const add = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed.slice(0, maxLength));
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      add();
    }
  };

  const colors = PILL_CLASSES[variant];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        <span className="text-[10px] text-zinc-400">{items.length}/{maxItems}</span>
      </div>
      {items.length < maxItems && (
        <div className="flex gap-2">
          <InputText
            wrapperClassName="flex-1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            placeholder={placeholder}
          />
          <Button size="sm" variant="outline" onClick={add}>
            Agregar
          </Button>
        </div>
      )}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors.pill}`}>
              {item}
              <button type="button" onClick={() => onRemove(i)} className={colors.button}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
