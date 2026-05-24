"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { permissionsPayloadSchema } from "@/lib/validations/permissions";

export type SavePermissionsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function saveRolePermissionsAction(
  _previousState: SavePermissionsState,
  formData: FormData,
): Promise<SavePermissionsState> {
  const condoId = String(formData.get("condoId") ?? "");
  const role = String(formData.get("role") ?? "");
  const permissionsRaw = String(formData.get("permissions") ?? "{}");

  let permissions: Record<string, boolean>;
  try {
    permissions = JSON.parse(permissionsRaw) as Record<string, boolean>;
  } catch {
    return { status: "error", message: "Payload de permissões inválido." };
  }

  const parsed = permissionsPayloadSchema.safeParse({ role, permissions });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Permissões inválidas.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Entre na sua conta para continuar." };
  }

  const { error } = await supabase.rpc("set_role_permissions", {
    condo_id: condoId,
    target_role: parsed.data.role,
    permission_payload: parsed.data.permissions,
  });

  if (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  revalidatePath(`/app/${condoId}/permissoes`);
  return { status: "success", message: "Permissões salvas com auditoria." };
}
