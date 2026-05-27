import { PermissionsEditor } from "@/components/permissions/PermissionsEditor";
import { redirect } from "next/navigation";
import { getCondominiumAccess } from "@/lib/condominium-access";
import {
  editableRoles,
  rolePermissionPresets,
  sanitizeRolePermissions,
  type EditableRole,
  type PermissionKey,
} from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RolePermissionRow = {
  role: EditableRole;
  permissions: Record<PermissionKey, boolean>;
};

export default async function PermissionsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  if (access.isResident || access.isDoorman) redirect(`/app/${condoId}/dashboard`);

  const [
    { data: condo },
    { data: roleRows },
    { data: userRole },
    { data: canManageRoles },
    { data: canSyndicManage },
  ] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id,name,plan,plan_limits(advanced_permissions)")
      .eq("id", condoId)
      .single(),
    supabase
      .from("role_permissions")
      .select("role,permissions")
      .eq("condominium_id", condoId),
    supabase.rpc("get_user_role", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "settings.roles",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "syndic.manage_permissions",
    }),
  ]);

  const rows = (roleRows ?? []) as RolePermissionRow[];
  const initialPermissions = Object.fromEntries(
    editableRoles.map((role) => {
      const saved = rows.find((row) => row.role === role)?.permissions;
      return [
        role,
        sanitizeRolePermissions(role, {
          ...rolePermissionPresets[role],
          ...(saved ?? {}),
        }),
      ];
    }),
  ) as Record<EditableRole, Record<PermissionKey, boolean>>;

  const plan = condo?.plan ?? "free";
  const planLimits = condo?.plan_limits as
    | { advanced_permissions?: boolean }
    | { advanced_permissions?: boolean }[]
    | null;
  const advancedPermissions = Array.isArray(planLimits)
    ? planLimits[0]?.advanced_permissions === true
    : planLimits?.advanced_permissions === true;
  const canEdit =
    userRole === "subscriber_admin" ||
    canManageRoles === true ||
    (userRole === "syndic" && canSyndicManage === true);

  return (
    <PermissionsEditor
      condoId={condoId}
      plan={plan}
      advancedPermissions={advancedPermissions}
      canEdit={canEdit}
      initialPermissions={initialPermissions}
    />
  );
}
