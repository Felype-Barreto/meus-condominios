"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertCanManageBilling(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta para continuar.");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, status, permissions")
    .eq("condominium_id", condoId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const permissions = (membership?.permissions ?? {}) as Record<string, boolean>;
  const [{ data: canManage }, { data: canCancel }] = await Promise.all([
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "billing.manage" }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "billing.cancel" }),
  ]);
  const allowed =
    membership?.role === "subscriber_admin" ||
    permissions["billing.manage"] === true ||
    permissions["billing.cancel"] === true ||
    canManage === true ||
    canCancel === true;

  if (!allowed) throw new Error("Você não tem permissão para gerenciar esta assinatura.");

  return { supabase, user };
}

export async function requestCancellationAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!condoId) throw new Error("Condomínio inválido.");
  if (confirmation !== "CANCELAR") {
    throw new Error("Digite CANCELAR para confirmar a solicitação.");
  }

  const { supabase, user } = await assertCanManageBilling(condoId);
  const now = new Date().toISOString();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("settings")
    .eq("id", condoId)
    .maybeSingle();
  const currentSettings = (condo?.settings ?? {}) as Record<string, unknown>;

  const { error: updateError } = await supabase
    .from("condominiums")
    .update({
      subscription_status: "canceled",
      settings: {
        ...currentSettings,
        cancellation_requested_at: now,
        cancellation_requested_by: user.id,
        cancellation_reason: reason || null,
        access_until_cycle_end: true,
      },
      updated_at: now,
    })
    .eq("id", condoId);

  if (updateError) throw new Error("Não foi possível registrar o cancelamento agora.");

  await supabase.from("billing_events").insert({
    condominium_id: condoId,
    user_id: user.id,
    event_type: "subscription_cancellation_requested",
    metadata: {
      reason: reason || null,
      access_until_cycle_end: true,
      source: "morai_app",
    },
  });

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "subscription_cancellation_requested",
    event_entity_type: "condominiums",
    event_entity_id: condoId,
    event_metadata: { reason: reason || null },
  });

  revalidatePath(`/app/${condoId}/assinatura`);
  revalidatePath(`/app/${condoId}/assinatura/cancelamento`);
}

export async function requestRefundAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amountValue = String(formData.get("amount_cents") ?? "").trim();
  const amountCents = amountValue ? Number(amountValue) : null;

  if (!condoId) throw new Error("Condomínio inválido.");
  if (!reason || reason.length < 10) {
    throw new Error("Descreva o motivo do reembolso com um pouco mais de detalhe.");
  }
  if (amountCents !== null && (!Number.isFinite(amountCents) || amountCents < 0)) {
    throw new Error("Valor de reembolso inválido.");
  }

  const { supabase, user } = await assertCanManageBilling(condoId);

  const { error } = await supabase.from("refund_requests").insert({
    condominium_id: condoId,
    requested_by: user.id,
    amount_cents: amountCents,
    reason,
    status: "pending",
    provider: "manual",
  });

  if (error) throw new Error("Não foi possível registrar o pedido de reembolso agora.");

  await supabase.from("billing_events").insert({
    condominium_id: condoId,
    user_id: user.id,
    event_type: "refund_requested",
    metadata: {
      amount_cents: amountCents,
      reason,
      provider: "manual",
    },
  });

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "refund_requested",
    event_entity_type: "refund_requests",
    event_entity_id: user.id,
    event_metadata: { amount_cents: amountCents },
  });

  revalidatePath(`/app/${condoId}/assinatura`);
  revalidatePath(`/app/${condoId}/assinatura/cancelamento`);
}
