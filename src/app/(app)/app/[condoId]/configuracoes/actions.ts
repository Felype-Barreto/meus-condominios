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
