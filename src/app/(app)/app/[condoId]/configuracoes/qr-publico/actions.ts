"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicQrSettingsSchema } from "@/lib/validations/public-qr";

export type PublicQrSettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function savePublicQrSettingsAction(
  _previousState: PublicQrSettingsState,
  formData: FormData,
): Promise<PublicQrSettingsState> {
  const condoId = String(formData.get("condominium_id") ?? "");
  const parsed = publicQrSettingsSchema.safeParse({
    condominium_id: condoId,
    enabled: formData.get("enabled") === "on",
    message: String(formData.get("message") ?? ""),
    default_privacy: {
      allow_public_contact: formData.get("allow_public_contact") === "on",
      allow_name_search: formData.get("allow_name_search") === "on",
      allow_apartment_search: formData.get("allow_apartment_search") === "on",
      allow_whatsapp_redirect: formData.get("allow_whatsapp_redirect") === "on",
    },
    safety_acknowledgements: {
      public_place: formData.get("qr_ack_public_place") === "on",
      safe_location: formData.get("qr_ack_safe_location") === "on",
      resident_consent: formData.get("qr_ack_resident_consent") === "on",
      phone_hidden: formData.get("qr_ack_phone_hidden") === "on",
    },
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Entre na sua conta para continuar." };
  }

  const { error } = await supabase.rpc("update_public_qr_settings", {
    condo_id: parsed.data.condominium_id,
    enabled: parsed.data.enabled,
    public_message: parsed.data.message ?? "",
    default_privacy: parsed.data.default_privacy,
  });

  if (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/configuracoes/qr-publico`);
  revalidatePath(`/visitante`);
  return { status: "success", message: "QR público atualizado com auditoria." };
}
