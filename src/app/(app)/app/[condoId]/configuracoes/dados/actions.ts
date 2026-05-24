"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createDataDeletionRequest,
  scheduleCondoDeletion,
} from "@/lib/data-rights";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const condoDataRequestSchema = z.object({
  condominium_id: z.string().uuid(),
  request_type: z.enum(["export", "deletion"]),
  description: z.string().max(2000).optional(),
  confirmation: z.string().optional(),
});

export async function createCondoDataRequestAction(formData: FormData) {
  const parsed = condoDataRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados invalidos.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta.");

  if (parsed.data.request_type === "deletion" && parsed.data.confirmation !== "EXCLUIR") {
    throw new Error("Digite EXCLUIR para confirmar a solicitacao.");
  }

  if (parsed.data.request_type === "deletion") {
    const { data: isSubscriberAdmin } = await supabase.rpc("is_subscriber_admin", {
      condo_id: parsed.data.condominium_id,
    });
    if (!isSubscriberAdmin) {
      throw new Error("Somente o assinante principal pode solicitar exclusao do condominio.");
    }

    await createDataDeletionRequest({
      supabase,
      userId: user.id,
      condoId: parsed.data.condominium_id,
      description: parsed.data.description,
      email: user.email,
    });
    await scheduleCondoDeletion(
      supabase,
      parsed.data.condominium_id,
      user.id,
      parsed.data.description,
    );
  } else {
    const { error } = await supabase.from("data_requests").insert({
      condominium_id: parsed.data.condominium_id,
      user_id: user.id,
      request_type: "export",
      description: parsed.data.description,
      requested_by_email: user.email,
      status: "pending",
    });
    if (error) throw new Error("Nao foi possivel registrar a solicitacao.");
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/configuracoes/dados`);
}

const updateDataRequestSchema = z.object({
  condominium_id: z.string().uuid(),
  request_id: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "waiting_customer", "processed", "rejected", "canceled"]),
  response_note: z.string().max(1000).optional(),
});

export async function updateDataRequestStatusAction(formData: FormData) {
  const parsed = updateDataRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados invalidos.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta.");

  const { error } = await supabase
    .from("data_requests")
    .update({
      status: parsed.data.status,
      response_note: parsed.data.response_note || null,
      processed_by: user.id,
      processed_at: ["processed", "rejected", "canceled"].includes(parsed.data.status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", parsed.data.request_id)
    .eq("condominium_id", parsed.data.condominium_id);

  if (error) throw new Error("Nao foi possivel atualizar a solicitacao.");

  revalidatePath(`/app/${parsed.data.condominium_id}/configuracoes/dados`);
}
