"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { logger } from "@/views/admin/utils/logger";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
}

export default function CopyButton({ value, label = "Copy Key", copiedLabel = "Copiado" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch((e) => logger.error("clipboard.writeText", e));
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
    >
      {copied ? <><Check className="h-3 w-3 text-green-500" /> {copiedLabel}</> : <><Copy className="h-3 w-3" /> {label}</>}
    </button>
  );
}
