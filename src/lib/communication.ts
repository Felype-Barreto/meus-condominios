import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CommunicationChannelLimit,
  CommunicationPlanLimits,
} from "@/lib/communication-content";
export * from "@/lib/communication-content";

export async function getCommunicationPlanLimits(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_communication_plan_limits", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as CommunicationPlanLimits;
}

export async function canCreateCommunicationChannel(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_create_communication_channel", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as CommunicationChannelLimit;
}

export type CommunicationTemplateLimit = {
  plan: string;
  used: number;
  limit: number;
  allowed: boolean;
  blocked: boolean;
  percent: number;
};

export async function getCommunicationTemplateLimit(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_communication_template_limit", {
    condo_id: condoId,
  });

  if (error) throw new Error(error.message);
  return data as CommunicationTemplateLimit;
}
