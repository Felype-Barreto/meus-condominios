"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  defaultWhatsAppConsentCategories,
  normalizeWhatsAppCategories,
  WHATSAPP_CONSENT_TEXT_VERSION,
} from "@/lib/whatsapp/consent";
import { whatsappOptInSchema } from "@/lib/validations/whatsapp";

export async function updateNotificationPreferencesAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const phone = String(formData.get("phone") ?? "").replace(/[^\d+]/g, "");
  if (!condoId) throw new Error("Condomínio inválido.");

  const categories = normalizeWhatsAppCategories({
    general: formData.get("whatsapp_general") === "on",
    urgent_announcement: formData.get("whatsapp_urgent_announcement") === "on",
    package: formData.get("whatsapp_package") === "on",
    booking: formData.get("whatsapp_booking") === "on",
    visitor_contact: formData.get("whatsapp_visitor_contact") === "on",
    summary: formData.get("whatsapp_summary") === "on",
  });
  const optedIn = Object.values(categories).some(Boolean);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta para salvar suas preferências.");

  const parsed = whatsappOptInSchema.safeParse({
    condominium_id: condoId,
    user_id: user.id,
    phone,
    opted_in: optedIn,
    categories: optedIn ? categories : defaultWhatsAppConsentCategories,
    consent_text_version: WHATSAPP_CONSENT_TEXT_VERSION,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Revise o telefone informado.");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, privacy_settings")
    .eq("condominium_id", condoId)
    .eq("user_id", user.id)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!membership) {
    throw new Error("Você não tem vínculo com este condomínio.");
  }

  const now = new Date().toISOString();
  const [{ error: optInError }, { error: privacyError }] = await Promise.all([
    supabase.from("whatsapp_opt_ins").upsert(
      {
        condominium_id: condoId,
        user_id: user.id,
        phone: parsed.data.phone,
        opted_in: parsed.data.opted_in,
        categories: parsed.data.categories,
        opted_in_at: parsed.data.opted_in ? now : null,
        opted_out_at: parsed.data.opted_in ? null : now,
        source: "resident_preferences",
        consent_text_version: parsed.data.consent_text_version,
      },
      { onConflict: "condominium_id,user_id" },
    ),
    supabase
      .from("memberships")
      .update({
        privacy_settings: {
          ...((membership.privacy_settings ?? {}) as Record<string, unknown>),
          allow_public_contact: formData.get("allow_public_contact") === "on",
          allow_whatsapp_redirect: formData.get("allow_whatsapp_redirect") === "on",
        },
        updated_at: now,
      })
      .eq("id", membership.id),
  ]);

  if (optInError) throw new Error("Não foi possível salvar o consentimento agora.");
  if (privacyError) throw new Error("Não foi possível salvar a privacidade do QR agora.");

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: parsed.data.opted_in ? "whatsapp_consent_updated" : "whatsapp_consent_revoked",
    event_entity_type: "whatsapp_opt_ins",
    event_entity_id: user.id,
    event_metadata: {
      source: "resident_preferences",
      categories: parsed.data.categories,
      consent_text_version: parsed.data.consent_text_version,
    },
  });

  revalidatePath(`/app/${condoId}/perfil/notificacoes`);
  revalidatePath(`/app/${condoId}/configuracoes/privacidade`);
}

export async function markAlsoResidentAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const apartmentId = String(formData.get("apartment_id") ?? "");
  if (!condoId || !apartmentId) throw new Error("Selecione um apartamento.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta.");

  const { error } = await supabase.rpc("set_my_membership_apartment", {
    condo_id: condoId,
    apt_id: apartmentId,
  });

  if (error) {
    throw new Error("Não foi possível marcar seu apartamento agora.");
  }

  revalidatePath(`/app/${condoId}/perfil/notificacoes`);
  revalidatePath(`/app/${condoId}/moradores`);
}
