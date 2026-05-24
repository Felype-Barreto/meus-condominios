"use client";

import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function PermissionToggle({
  label,
  description,
  checked,
  disabled,
  sensitive,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  sensitive?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border bg-card p-4",
        disabled && "opacity-60",
        sensitive && "border-amber-200 bg-amber-50/40",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{label}</h3>
          {sensitive ? <AlertTriangle className="h-4 w-4 text-warning" /> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}
