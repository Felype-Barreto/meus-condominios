import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SummaryType = "daily" | "weekly" | "packages" | "agenda" | "maintenance" | "admin";

export type CommunicationSummaryPreview = {
  title: string;
  body: string;
  safe_group_body: string;
  summary_type: SummaryType;
  period_start: string;
  period_end: string;
};

export async function generateDailySummary(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("generate_daily_summary", { condo_id: condoId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function generateWeeklySummary(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("generate_weekly_summary", { condo_id: condoId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function generateGroupSafeSummary(summary: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("generate_group_safe_summary", { summary_body: summary });
  if (error) throw new Error(error.message);
  return String(data ?? "");
}

export async function scheduleSummary(condoId: string, type: SummaryType) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("schedule_summary", {
    condo_id: condoId,
    summary_type_input: type,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function sendSummary(summaryId: string, channels: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("send_summary", {
    summary_id_input: summaryId,
    channel_ids: channels,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
