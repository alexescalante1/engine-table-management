"use client";

import { useState, useEffect } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export default function EmptyState({ title, description, action, icon: Icon = Inbox }: EmptyStateProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Icon size={72} className="text-zinc-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
