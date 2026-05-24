import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatsAppUsageState = {
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

export async function getWhatsAppUsageState(
  supabase: SupabaseClient,
  condoId: string,
) {
  const { data, error } = await supabase.rpc("get_whatsapp_usage", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageState;
}

export async function canUseWhatsAppCredits(
  supabase: SupabaseClient,
  condoId: string,
  estimatedCredits = 1,
) {
  const { data, error } = await supabase.rpc("can_use_whatsapp_credits", {
    condo_id: condoId,
    estimated_credits: estimatedCredits,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageState;
}

export async function consumeWhatsAppCredits(
  supabase: SupabaseClient,
  condoId: string,
  amount = 1,
) {
  const { data, error } = await supabase.rpc("consume_whatsapp_credits", {
    condo_id: condoId,
    amount,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageState;
}

export async function refundWhatsAppCredits(
  supabase: SupabaseClient,
  condoId: string,
  amount = 1,
) {
  const { data, error } = await supabase.rpc("refund_whatsapp_credits", {
    condo_id: condoId,
    amount,
  });

  if (error) throw new Error(error.message);
  return data as WhatsAppUsageState;
}

export async function consumeWhatsAppCredit(
  supabase: SupabaseClient,
  condoId: string,
) {
  return consumeWhatsAppCredits(supabase, condoId, 1);
}
