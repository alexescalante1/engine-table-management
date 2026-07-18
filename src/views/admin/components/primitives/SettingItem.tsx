import type { ReactNode } from "react";

interface SettingItemProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  trailing: ReactNode;
}

export default function SettingItem({ icon, label, description, trailing }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{label}</p>
          {description && <p className="text-xs text-zinc-500">{description}</p>}
        </div>
      </div>
      {trailing}
    </div>
  );
}
