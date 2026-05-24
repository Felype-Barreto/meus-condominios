"use client";

import type { PermissionKey } from "@/lib/permissions";
import { PermissionToggle } from "@/components/permissions/PermissionToggle";

export function PermissionGroup({
  title,
  sensitive,
  permissions,
  values,
  disabledKeys,
  onChange,
}: {
  title: string;
  sensitive?: boolean;
  permissions: readonly (readonly [PermissionKey, string, string])[];
  values: Record<PermissionKey, boolean>;
  disabledKeys: Set<PermissionKey>;
  onChange: (key: PermissionKey, value: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {sensitive ? (
          <p className="mt-1 text-sm text-warning">
            Permissões sensíveis podem expor dados ou alterar a segurança do condomínio.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3">
        {permissions.map(([key, label, description]) => (
          <PermissionToggle
            key={key}
            label={label}
            description={description}
            checked={values[key] ?? false}
            disabled={disabledKeys.has(key)}
            sensitive={sensitive}
            onCheckedChange={(checked) => onChange(key, checked)}
          />
        ))}
      </div>
    </section>
  );
}
