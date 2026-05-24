import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
export {
  canRevealSensitiveField,
  maskApartment,
  maskDocument,
  maskEmail,
  maskName,
  maskPhone,
  revealSensitiveField,
} from "@/lib/admin/sensitive-data";

export function createAdminSupabase() {
  noStore();
  return createSupabaseServiceClient();
}

export function moneyFromCents(value?: number | null) {
  if (!value) return "R$ 0,00";
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function getAdminMetrics() {
  const supabase = createAdminSupabase();
  const [
    condominiums,
    profiles,
    support,
    refunds,
    incidents,
    dataRequests,
    whatsappUsage,
    freeAdsEnabled,
  ] = await Promise.all([
    supabase.from("condominiums").select("id,plan,subscription_status,created_at"),
    supabase.from("profiles").select("id,created_at"),
    supabase.from("support_tickets").select("id,status,priority,created_at"),
    supabase.from("refund_requests").select("id,status,amount_cents,created_at"),
    supabase.from("security_incidents").select("id,status,severity,created_at"),
    supabase.from("data_requests").select("id,status,request_type,created_at"),
    supabase.from("whatsapp_usage").select("used_credits,addon_credits,included_credits"),
    supabase
      .from("condominiums")
      .select("id", { count: "exact", head: true })
      .eq("plan", "free")
      .not("subscription_status", "in", "(canceled,blocked,pending_deletion)"),
  ]);

  const refundTotal = (refunds.data ?? []).reduce(
    (sum, refund) => sum + Number(refund.amount_cents ?? 0),
    0,
  );
  const whatsappUsed = (whatsappUsage.data ?? []).reduce(
    (sum, usage) => sum + Number(usage.used_credits ?? 0),
    0,
  );

  return {
    condominiums: condominiums.data ?? [],
    profiles: profiles.data ?? [],
    support: support.data ?? [],
    refunds: refunds.data ?? [],
    incidents: incidents.data ?? [],
    dataRequests: dataRequests.data ?? [],
    refundTotal,
    whatsappUsed,
    freeAdsEnabled: freeAdsEnabled.count ?? 0,
    adsenseConfigured: Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID),
  };
}
