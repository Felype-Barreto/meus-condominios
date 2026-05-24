"use client";

import { Switch } from "@/components/ui/switch";

export function PermissionToggle({
  title,
  description,
  checked = true,
  name,
}: {
  title: string;
  description: string;
  checked?: boolean;
  name?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch name={name} defaultChecked={checked} aria-label={title} />
    </div>
  );
}
