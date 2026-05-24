import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getEconomyModeDecision } from "@/lib/economy-mode";
import { getWhatsAppAdapter } from "@/lib/whatsapp/adapter";
import {
  getWhatsAppEventDefinition,
  isWhatsAppEventAllowedForPlan,
  type WhatsAppEventType,
} from "@/lib/whatsapp/events";
import {
  hasCategoryConsent,
  isValidWhatsAppPhone,
  mapEventToConsentCategory,
} from "@/lib/whatsapp/consent";
import {
  getWhatsAppTemplate,
  validateWhatsAppTemplateForEvent,
} from "@/lib/whatsapp/templates";
import { consumeWhatsAppCredit, getWhatsAppUsageState } from "@/lib/whatsapp/usage";

export const whatsappSendSchema = z.object({
  condominium_id: z.string().uuid(),
  event: z.enum([
    "package_created",
    "booking_approved",
    "booking_rejected",
    "urgent_announcement_created",
    "visitor_contact_request_created",
    "booking_reminder_24h",
    "booking_reminder_2h",
    "ticket_status_changed",
    "announcement_created_important",
    "package_waiting_reminder",
    "daily_summary",
    "weekly_summary",
    "group_announcement",
    "block_group_announcement",
    "meeting_reminder",
    "maintenance_reminder",
  ]),
  user_id: z.string().uuid().optional(),
  apartment_id: z.string().uuid().optional(),
  target_phone: z.string().max(40).optional(),
  target_group_id: z.string().max(160).optional(),
  template_key: z.string().max(80).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type QueueWhatsAppMessageInput = z.infer<typeof whatsappSendSchema>;

type QueueResult = {
  ok: boolean;
  status: "sent" | "failed" | "blocked" | "not_configured";
  logId?: string;
  providerMessageId?: string | null;
  error?: string;
};

type MembershipPermissionResult = {
  isSubscriberAdmin: boolean;
  hasEventPermission: boolean;
};

async function assertCallerCanQueue(
  userSupabase: SupabaseClient,
  condoId: string,
  permission: string,
): Promise<MembershipPermissionResult> {
  const [{ data: isSubscriberAdmin, error: adminError }, { data: hasPermission, error: permissionError }] =
    await Promise.all([
      userSupabase.rpc("is_subscriber_admin", { condo_id: condoId }),
      userSupabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: permission,
      }),
    ]);

  if (adminError) throw new Error(adminError.message);
  if (permissionError) throw new Error(permissionError.message);

  const result = {
    isSubscriberAdmin: Boolean(isSubscriberAdmin),
    hasEventPermission: Boolean(hasPermission),
  };

  if (!result.isSubscriberAdmin && !result.hasEventPermission) {
    throw new Error("Você não tem permissão para enviar este WhatsApp.");
  }

  return result;
}

async function createQueuedLog(
  adminSupabase: SupabaseClient,
  input: QueueWhatsAppMessageInput,
  templateKey: string,
) {
  const { data, error } = await adminSupabase
    .from("whatsapp_message_logs")
    .insert({
      condominium_id: input.condominium_id,
      user_id: input.user_id ?? null,
      apartment_id: input.apartment_id ?? null,
      target_type: input.target_group_id ? "group" : "user",
      target_phone: input.target_phone ?? null,
      target_group_id: input.target_group_id ?? null,
      template_key: templateKey,
      message_type: input.event,
      payload: input.payload,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string };
}

async function updateLogStatus(
  adminSupabase: SupabaseClient,
  logId: string,
  values: {
    status: "sent" | "failed" | "delivered" | "read";
    providerMessageId?: string | null;
    errorMessage?: string | null;
  },
) {
  const now = new Date().toISOString();
  const { error } = await adminSupabase
    .from("whatsapp_message_logs")
    .update({
      status: values.status,
      provider_message_id: values.providerMessageId ?? undefined,
      error_message: values.errorMessage ?? undefined,
      sent_at: values.status === "sent" ? now : undefined,
      failed_at: values.status === "failed" ? now : undefined,
    })
    .eq("id", logId);

  if (error) throw new Error(error.message);
}

async function validateOptIn(
  adminSupabase: SupabaseClient,
  input: QueueWhatsAppMessageInput,
) {
  if (input.target_group_id) return null;
  if (!input.user_id) throw new Error("Usuário alvo obrigatório para envio individual.");

  const { data, error } = await adminSupabase
    .from("whatsapp_opt_ins")
    .select("phone, opted_in, categories")
    .eq("condominium_id", input.condominium_id)
    .eq("user_id", input.user_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.opted_in) throw new Error("Morador sem consentimento ativo para WhatsApp.");

  const { data: membership, error: membershipError } = await adminSupabase
    .from("memberships")
    .select("id")
    .eq("condominium_id", input.condominium_id)
    .eq("user_id", input.user_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("Morador sem vínculo ativo neste condomínio.");

  const category = mapEventToConsentCategory(input.event as WhatsAppEventType);
  if (!hasCategoryConsent(data.categories, category)) {
    throw new Error("Morador não autorizou WhatsApp para esta categoria.");
  }

  if (!isValidWhatsAppPhone(data.phone)) {
    throw new Error("Telefone ausente ou inválido para WhatsApp.");
  }

  return data.phone as string;
}

export async function queueAndSendWhatsAppMessage({
  input,
  userSupabase,
  adminSupabase,
}: {
  input: QueueWhatsAppMessageInput;
  userSupabase: SupabaseClient;
  adminSupabase: SupabaseClient;
}): Promise<QueueResult> {
  const parsed = whatsappSendSchema.parse(input);
  const event = parsed.event as WhatsAppEventType;
  const definition = getWhatsAppEventDefinition(event);
  const templateKey = parsed.template_key ?? definition.templateKey;
  const template = getWhatsAppTemplate(templateKey);

  await assertCallerCanQueue(
    userSupabase,
    parsed.condominium_id,
    definition.permission,
  );

  const usage = await getWhatsAppUsageState(adminSupabase, parsed.condominium_id);

  if (!isWhatsAppEventAllowedForPlan(usage.plan, event)) {
    return {
      ok: false,
      status: "blocked",
      error: "Evento não disponível no plano atual.",
    };
  }

  if (!usage.allowed) {
    return {
      ok: false,
      status: usage.manual_only ? "not_configured" : "blocked",
      error: usage.manual_only
        ? "Plano grátis não envia WhatsApp automático."
        : "Limite mensal de WhatsApp atingido.",
    };
  }

  if (!template || !validateWhatsAppTemplateForEvent(templateKey, event)) {
    return {
      ok: false,
      status: "blocked",
      error: "Template WhatsApp inválido para este evento.",
    };
  }

  const economyDecision = getEconomyModeDecision("whatsapp_automatic");
  if (!economyDecision.allowed) {
    return {
      ok: false,
      status: "not_configured",
      error: economyDecision.userMessage,
    };
  }

  const targetPhone = parsed.target_phone ?? (await validateOptIn(adminSupabase, parsed));
  const log = await createQueuedLog(adminSupabase, parsed, templateKey);
  const adapter = getWhatsAppAdapter();

  if (!adapter.configured) {
    await updateLogStatus(adminSupabase, log.id, {
      status: "failed",
      errorMessage: "WhatsApp não configurado",
    });
    return {
      ok: false,
      status: "not_configured",
      logId: log.id,
      error: "WhatsApp não configurado",
    };
  }

  const sendResult = parsed.target_group_id
    ? await adapter.sendGroupMessage({
        groupId: parsed.target_group_id,
        templateName: template.providerName,
        templateKey,
        language: template.language,
        payload: parsed.payload,
      })
    : await adapter.sendTemplate({
        to: targetPhone,
        templateName: template.providerName,
        templateKey,
        language: template.language,
        payload: parsed.payload,
      });

  if (!sendResult.accepted) {
    await updateLogStatus(adminSupabase, log.id, {
      status: "failed",
      errorMessage: sendResult.error ?? "Envio recusado pelo provider.",
    });
    return {
      ok: false,
      status: "failed",
      logId: log.id,
      error: sendResult.error ?? "Envio recusado pelo provider.",
    };
  }

  await consumeWhatsAppCredit(adminSupabase, parsed.condominium_id);
  await updateLogStatus(adminSupabase, log.id, {
    status: "sent",
    providerMessageId: sendResult.providerMessageId ?? null,
  });

  return {
    ok: true,
    status: "sent",
    logId: log.id,
    providerMessageId: sendResult.providerMessageId ?? null,
  };
}
