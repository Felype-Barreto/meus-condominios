"use client";

import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useActionState, useMemo } from "react";
import { UpgradeBanner } from "@/components/app/upgrade-banner";
import { PermissionGroup } from "@/components/permissions/PermissionGroup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import {
  editableRoles,
  forbiddenPermissionsByRole,
  permissionGroups,
  roleLabels,
  rolePermissionPresets,
  sensitivePermissionKeys,
  type EditableRole,
  type PermissionKey,
} from "@/lib/permissions";
import {
  saveRolePermissionsAction,
  type SavePermissionsState,
} from "@/app/(app)/app/[condoId]/permissoes/actions";
import { cn } from "@/lib/utils";

type PermissionMap = Record<PermissionKey, boolean>;

const initialActionState: SavePermissionsState = { status: "idle" };

export function PermissionsEditor({
  condoId,
  plan,
  advancedPermissions,
  canEdit,
  initialPermissions,
}: {
  condoId: string;
  plan: string;
  advancedPermissions: boolean;
  canEdit: boolean;
  initialPermissions: Record<EditableRole, PermissionMap>;
}) {
  const [state, formAction, isPending] = useActionState(
    saveRolePermissionsAction,
    initialActionState,
  );
  const {
    activeRole,
    setActiveRole,
    drafts,
    setPermission,
    restoreDefault,
    hasUnsavedChanges,
  } = usePermissions({
    initial: initialPermissions,
    presets: rolePermissionPresets,
  });

  const disabledKeys = useMemo(
    () => new Set(forbiddenPermissionsByRole[activeRole] ?? []),
    [activeRole],
  );
  const editingDisabled = !advancedPermissions || !canEdit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Acessos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Permissões por papel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Controle o que admin adicional, síndico, portaria, morador e
            proprietário podem ver, criar, editar, excluir e administrar.
          </p>
        </div>
        {hasUnsavedChanges ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-warning ring-1 ring-amber-200">
            Alterações não salvas
          </span>
        ) : null}
      </div>

      {!advancedPermissions ? <UpgradeBanner /> : null}

      <Card className="border-primary/30 p-5">
        <div className="flex gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold">Assinante principal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assinante principal: possui acesso total e não pode ser limitado.
            </p>
          </div>
        </div>
      </Card>

      {!canEdit ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-warning">
          Você pode visualizar esta matriz, mas só pode editar se for assinante
          principal, admin com `settings.roles` ou síndico com permissão liberada.
        </div>
      ) : null}

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-5">
          {editableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground",
                activeRole === role && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Permissões de assinatura, segurança, privacidade e logs são sensíveis.
        Guarita, moradores e proprietários recebem bloqueios obrigatórios no backend.
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="condoId" value={condoId} />
        <input type="hidden" name="role" value={activeRole} />
        <input
          type="hidden"
          name="permissions"
          value={JSON.stringify(drafts[activeRole])}
        />

        <Card className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{roleLabels[activeRole]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Plano atual: {plan}. As alterações geram audit log.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => restoreDefault(activeRole)}
                disabled={editingDisabled}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar padrão
              </Button>
              <Button type="submit" disabled={editingDisabled || isPending}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>

          {state.status !== "idle" ? (
            <div
              className={cn(
                "mt-5 rounded-lg border p-4 text-sm font-medium",
                state.status === "success"
                  ? "border-green-200 bg-green-50 text-success"
                  : "border-red-200 bg-red-50 text-destructive",
              )}
            >
              {state.message}
            </div>
          ) : null}
        </Card>

        <div className="grid gap-6">
          {permissionGroups.map((group) => (
            <PermissionGroup
              key={group.title}
              title={group.title}
              sensitive={"sensitive" in group ? group.sensitive : false}
              permissions={group.permissions}
              values={drafts[activeRole]}
              disabledKeys={
                editingDisabled
                  ? new Set([...sensitivePermissionKeys, ...disabledKeys])
                  : disabledKeys
              }
              onChange={(key, value) => setPermission(activeRole, key, value)}
            />
          ))}
        </div>
      </form>
    </div>
  );
}
