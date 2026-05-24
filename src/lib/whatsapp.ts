import { createSupabaseServerClient } from "@/lib/supabase/server";

export {
  createWhatsAppShareText,
  whatsappShareTypeLabels,
  type WhatsAppShareTextInput,
  type WhatsAppShareType,
} from "@/lib/whatsapp-share";

export type WhatsAppPlanLimits = {
  plan: string;
  included_messages: number;
  automatic_enabled: boolean;
  group_enabled: boolean;
  advanced_logs: boolean;
  manual_only: boolean;
  allowed_message_types: string[];
};

export type WhatsAppUsageCheck = {
  allowed: boolean;
  plan: string;
  month?: string;
  used: number;
  included: number;
  extra: number;
  included_credits?: number;
  used_credits?: number;
  addon_credits?: number;
  blocked_sends?: number;
  limit: number;
  remaining: number;
  percent: number;
  warn: boolean;
  blocked: boolean;
  manual_only: boolean;
  reason?: string;
  message?: string;
};

export type WhatsAppAddonOption = {
  addon_type: string;
  label: string;
  credits: number;
  price_cents: number;
  billing_cycle: "once" | "monthly";
};

export const whatsappAddons = [
  { id: "messages_500", label: "Pacote 500 mensagens", quantity: 500, price: "R$ 29,90", priceCents: 2990 },
  { id: "messages_1000", label: "Pacote 1.000 mensagens", quantity: 1000, price: "R$ 49,90", priceCents: 4990 },
  { id: "messages_5000", label: "Pacote 5.000 mensagens", quantity: 5000, price: "R$ 199,90", priceCents: 19990 },
  { id: "automatic_multi_groups", label: "Multi-grupos automatico", quantity: 0, price: "R$ 49,90/mes", priceCents: 4990 },
  { id: "extra_channel", label: "Canal extra", quantity: 1, price: "R$ 9,90/mes", priceCents: 990 },
] as const;

export const whatsappEssentialEvents = [
  "encomenda recebida",
  "agendamento aprovado",
  "agendamento recusado",
  "comunicado urgente",
  "visitante solicitou contato",
];

export async function getWhatsAppPlanLimits(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_whatsapp_plan_limits", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppPlanLimits;
}

export async function canSendWhatsAppMessage(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_send_whatsapp_message", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageCheck;
}

export async function getMonthlyWhatsAppCredits(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_monthly_whatsapp_credits", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function getWhatsAppUsage(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_whatsapp_usage", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageCheck;
}

export async function canUseWhatsAppCredits(condoId: string, estimatedCredits = 1) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_use_whatsapp_credits", {
    condo_id: condoId,
    estimated_credits: estimatedCredits,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageCheck;
}

export async function consumeWhatsAppCredits(condoId: string, amount = 1) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("consume_whatsapp_credits", {
    condo_id: condoId,
    amount,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageCheck;
}

export async function refundWhatsAppCredits(condoId: string, amount = 1) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("refund_whatsapp_credits", {
    condo_id: condoId,
    amount,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageCheck;
}

export async function getAvailableAddons(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_available_addons", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppAddonOption[];
}

export function createManualWhatsAppText({
  condoName,
  eventLabel,
  body,
}: {
  condoName: string;
  eventLabel: string;
  body: string;
}) {
  return `[Meus Condomínios - ${condoName}]\n${eventLabel}\n\n${body}\n\nEsta mensagem foi preparada pelo Meus Condomínios e deve ser enviada manualmente pelo responsavel do condominio.`;
}

export function maskPhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "Telefone nao exibido";
  return `(**) *****-${digits.slice(-4)}`;
}
