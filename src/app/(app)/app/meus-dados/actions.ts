"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createConsentRevocationRequest,
  createDataCorrectionRequest,
  createDataDeletionRequest,
  createDataExportRequest,
} from "@/lib/data-rights";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  request_type: z.enum(["export", "correction", "deletion", "portability"]),
  description: z.string().max(2000).optional(),
});

export async function createMyDataRequestAction(formData: FormData) {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados invalidos.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta para solicitar seus dados.");

  const input = {
    supabase,
    userId: user.id,
    condoId: parsed.data.condominium_id || null,
    description: parsed.data.description,
    email: user.email,
  };

  if (parsed.data.request_type === "export" || parsed.data.request_type === "portability") {
    await createDataExportRequest(input);
  } else if (parsed.data.request_type === "correction") {
    await createDataCorrectionRequest(input);
  } else {
    await createDataDeletionRequest(input);
  }

  revalidatePath("/app/meus-dados");
}

export async function revokeAllWhatsAppConsentAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta para revogar consentimentos.");

  const { error } = await supabase
    .from("whatsapp_opt_ins")
    .update({
      opted_in: false,
      opted_out_at: new Date().toISOString(),
      categories: {
        package: false,
        booking: false,
        urgent_announcement: false,
        visitor_contact: false,
        summary: false,
        general: false,
      },
    })
    .eq("user_id", user.id);

  if (error) throw new Error("Nao foi possivel revogar WhatsApp agora.");

  await createConsentRevocationRequest({
    supabase,
    userId: user.id,
    description: "Revogacao de todos os consentimentos WhatsApp pelo painel.",
    email: user.email,
  });

  revalidatePath("/app/meus-dados");
}

export async function hideMyPhoneEverywhereAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta para alterar privacidade.");

  const { data: memberships, error: readError } = await supabase
    .from("memberships")
    .select("id, privacy_settings")
    .eq("user_id", user.id);
  if (readError) throw new Error("Nao foi possivel carregar seus vinculos.");

  await Promise.all(
    (memberships ?? []).map((membership) =>
      supabase
        .from("memberships")
        .update({
          privacy_settings: {
            ...((membership.privacy_settings ?? {}) as Record<string, unknown>),
            allow_public_qr_by_apartment: false,
            allow_public_qr_by_name: false,
            allow_whatsapp_redirect: false,
            hide_phone_by_default: true,
          },
        })
        .eq("id", membership.id),
    ),
  );

  revalidatePath("/app/meus-dados");
}
