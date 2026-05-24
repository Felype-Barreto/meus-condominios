"use client";

import { useMemo, useState } from "react";
import type { EditableRole, PermissionKey } from "@/lib/permissions";

type PermissionMap = Record<PermissionKey, boolean>;

export function usePermissions({
  initial,
  presets,
}: {
  initial: Record<EditableRole, PermissionMap>;
  presets: Record<EditableRole, PermissionMap>;
}) {
  const [activeRole, setActiveRole] = useState<EditableRole>("admin");
  const [drafts, setDrafts] = useState(initial);

  const hasUnsavedChanges = useMemo(
    () =>
      JSON.stringify(drafts[activeRole]) !== JSON.stringify(initial[activeRole]),
    [activeRole, drafts, initial],
  );

  function setPermission(role: EditableRole, key: PermissionKey, value: boolean) {
    setDrafts((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [key]: value,
      },
    }));
  }

  function restoreDefault(role: EditableRole) {
    setDrafts((current) => ({
      ...current,
      [role]: presets[role],
    }));
  }

  return {
    activeRole,
    setActiveRole,
    drafts,
    setPermission,
    restoreDefault,
    hasUnsavedChanges,
  };
}
