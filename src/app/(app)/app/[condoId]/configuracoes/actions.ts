"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateMyProfileAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName || fullName.length < 3) {
    throw new Error("Informe seu nome completo.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para atualizar seus dados.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error("Não foi possível salvar seus dados agora.");

  if (condoId) {
    await supabase.rpc("audit_event", {
      condo_id: condoId,
      event_action: "profile_updated",
      event_entity_type: "profiles",
      event_entity_id: user.id,
      event_metadata: {},
    });
    revalidatePath(`/app/${condoId}/configuracoes`);
  }
}

export async function updateMyPrivacySettingsAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  if (!condoId) throw new Error("Condomínio inválido.");

  const privacySettings = {
    allow_admin_contact: formData.get("allow_admin_contact") === "on",
    allow_internal_search: formData.get("allow_internal_search") === "on",
    allow_public_qr_by_apartment: formData.get("allow_public_qr_by_apartment") === "on",
    allow_public_qr_by_name: formData.get("allow_public_qr_by_name") === "on",
    allow_whatsapp_redirect: formData.get("allow_whatsapp_redirect") === "on",
    hide_phone_by_default: formData.get("hide_phone_by_default") !== "off",
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta para atualizar sua privacidade.");

  const { error } = await supabase
    .from("memberships")
    .update({
      privacy_settings: privacySettings,
      updated_at: new Date().toISOString(),
    })
    .eq("condominium_id", condoId)
    .eq("user_id", user.id);

  if (error) throw new Error("Não foi possível salvar suas preferências agora.");

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "privacy_settings_updated",
    event_entity_type: "memberships",
    event_entity_id: user.id,
    event_metadata: privacySettings,
  });

  revalidatePath(`/app/${condoId}/configuracoes`);
  revalidatePath(`/app/${condoId}/configuracoes/privacidade`);
}

export async function updateResidentApprovalModeAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const residentAutoApprove = formData.get("resident_auto_approve") === "on";
  if (!condoId) throw new Error("Condomínio inválido.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta para alterar esta regra.");

  const [{ data: isSubscriberAdmin }, { data: canManageRoles }, { data: condo }] =
    await Promise.all([
      supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "settings.roles",
      }),
      supabase.from("condominiums").select("settings").eq("id", condoId).single(),
    ]);

  if (!isSubscriberAdmin && !canManageRoles) {
    throw new Error("Você não tem permissão para alterar aprovação de moradores.");
  }

  const settings = (condo?.settings ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("condominiums")
    .update({
      settings: {
        ...settings,
        resident_auto_approve: residentAutoApprove,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", condoId);

  if (error) throw new Error("Não foi possível salvar a regra agora.");

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "resident_approval_mode_updated",
    event_entity_type: "condominiums",
    event_entity_id: condoId,
    event_metadata: { resident_auto_approve: residentAutoApprove },
  });

  revalidatePath(`/app/${condoId}/configuracoes`);
  revalidatePath(`/app/${condoId}/moradores`);
}
