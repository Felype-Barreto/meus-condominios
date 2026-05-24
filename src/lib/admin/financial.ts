import { startOfMonth, subMonths } from "date-fns";
import { createAdminSupabase, moneyFromCents } from "@/lib/admin/data";

export type FinancialPeriod = "current_month" | "last_3_months" | "last_6_months" | "last_12_months";

type FinancialFilters = {
  period?: string;
  plan?: string;
  status?: string;
  gateway?: string;
  condo?: string;
};

const monthlyPlanPricesCents: Record<string, number> = {
  free: 0,
  premium: 3990,
  pro: 9990,
  total: 24990,
};

const paidStatuses = new Set(["active", "paid", "trialing", "past_due"]);
const canceledStatuses = new Set(["canceled", "cancelled", "inactive"]);
const lateStatuses = new Set(["past_due", "overdue", "failed", "unpaid"]);

function normalizePeriod(period?: string): FinancialPeriod {
  if (
    period === "last_3_months" ||
    period === "last_6_months" ||
    period === "last_12_months"
  ) {
    return period;
  }
  return "current_month";
}

function monthsForPeriod(period: FinancialPeriod) {
  const count =
    period === "last_12_months" ? 12 : period === "last_6_months" ? 6 : period === "last_3_months" ? 3 : 1;
  return Array.from({ length: count }).map((_, index) => {
    const date = startOfMonth(subMonths(new Date(), count - index - 1));
    return {
      key: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      start: date,
    };
  });
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

export async function getMRR() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("condominiums")
    .select("plan,subscription_status")
    .neq("plan", "free");

  return (data ?? []).reduce((total, condo) => {
    if (!paidStatuses.has(condo.subscription_status ?? "")) return total;
    return total + (monthlyPlanPricesCents[condo.plan ?? "free"] ?? 0);
  }, 0);
}

export async function getARR() {
  return (await getMRR()) * 12;
}

export async function getRevenueByPlan() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("condominiums")
    .select("plan,subscription_status")
    .neq("plan", "free");

  return Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, condo) => {
      if (!paidStatuses.has(condo.subscription_status ?? "")) return acc;
      const plan = condo.plan ?? "free";
      acc[plan] = (acc[plan] ?? 0) + (monthlyPlanPricesCents[plan] ?? 0);
      return acc;
    }, {}),
  ).map(([plan, value]) => ({ label: plan, value }));
}

export async function getChurn() {
  const supabase = createAdminSupabase();
  const { data } = await supabase.from("condominiums").select("subscription_status,plan");
  const paidOrCanceled = (data ?? []).filter((condo) => condo.plan !== "free");
  const canceled = paidOrCanceled.filter((condo) =>
    canceledStatuses.has(condo.subscription_status ?? ""),
  ).length;
  return paidOrCanceled.length ? (canceled / paidOrCanceled.length) * 100 : 0;
}

export async function getAddonRevenue() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("communication_addons")
    .select("price_cents,status");
  return sum((data ?? []).filter((addon) => addon.status !== "canceled").map((addon) => addon.price_cents));
}

export async function getRefundStats() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("refund_requests")
    .select("amount_cents,status,created_at");
  const rows = data ?? [];
  return {
    pendingCount: rows.filter((row) => row.status === "pending" || row.status === "reviewing").length,
    approvedCount: rows.filter((row) => row.status === "approved" || row.status === "processed" || row.status === "refunded").length,
    pendingAmount: sum(rows.filter((row) => row.status === "pending" || row.status === "reviewing").map((row) => row.amount_cents)),
    approvedAmount: sum(rows.filter((row) => row.status === "approved" || row.status === "processed" || row.status === "refunded").map((row) => row.amount_cents)),
  };
}

export async function getPlatformFinancialSummary(filters: FinancialFilters = {}) {
  const period = normalizePeriod(filters.period);
  const months = monthsForPeriod(period === "current_month" ? "last_12_months" : period);
  const since = months[0]?.start.toISOString() ?? startOfMonth(new Date()).toISOString();
  const supabase = createAdminSupabase();

  const [
    condominiumsResult,
    billingEventsResult,
    refundsResult,
    addonsResult,
    whatsappUsageResult,
    analyticsResult,
  ] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id,name,plan,subscription_status,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("billing_events")
      .select("id,event_type,provider,amount_cents,currency,status,metadata,created_at,condominiums(name,plan)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("refund_requests")
      .select("id,amount_cents,currency,reason,status,provider,created_at,condominiums(name,plan)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("communication_addons")
      .select("id,addon_type,price_cents,credits,status,created_at,condominiums(name,plan)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("whatsapp_usage")
      .select("month,used_credits,addon_credits,blocked_sends")
      .limit(500),
    supabase
      .from("platform_analytics_daily")
      .select("*")
      .order("date", { ascending: false })
      .limit(370),
  ]);

  let condominiums = condominiumsResult.data ?? [];
  let billingEvents = billingEventsResult.data ?? [];
  let refunds = refundsResult.data ?? [];
  let addons = addonsResult.data ?? [];
  const whatsappUsage = whatsappUsageResult.data ?? [];
  const analytics = analyticsResult.data ?? [];

  if (filters.plan && filters.plan !== "all") {
    condominiums = condominiums.filter((condo) => condo.plan === filters.plan);
    billingEvents = billingEvents.filter((event) => {
      const condo = Array.isArray(event.condominiums) ? event.condominiums[0] : event.condominiums;
      return condo?.plan === filters.plan;
    });
    refunds = refunds.filter((refund) => {
      const condo = Array.isArray(refund.condominiums) ? refund.condominiums[0] : refund.condominiums;
      return condo?.plan === filters.plan;
    });
    addons = addons.filter((addon) => {
      const condo = Array.isArray(addon.condominiums) ? addon.condominiums[0] : addon.condominiums;
      return condo?.plan === filters.plan;
    });
  }
  if (filters.status && filters.status !== "all") {
    billingEvents = billingEvents.filter((event) => event.status === filters.status);
    refunds = refunds.filter((refund) => refund.status === filters.status);
    condominiums = condominiums.filter((condo) => condo.subscription_status === filters.status);
  }
  if (filters.gateway && filters.gateway !== "all") {
    billingEvents = billingEvents.filter((event) => event.provider === filters.gateway);
    refunds = refunds.filter((refund) => refund.provider === filters.gateway);
  }
  if (filters.condo) {
    const needle = filters.condo.toLowerCase();
    condominiums = condominiums.filter((condo) => condo.name.toLowerCase().includes(needle));
    billingEvents = billingEvents.filter((event) => {
      const condo = Array.isArray(event.condominiums) ? event.condominiums[0] : event.condominiums;
      return condo?.name?.toLowerCase().includes(needle);
    });
    refunds = refunds.filter((refund) => {
      const condo = Array.isArray(refund.condominiums) ? refund.condominiums[0] : refund.condominiums;
      return condo?.name?.toLowerCase().includes(needle);
    });
  }

  const activePaidCondos = condominiums.filter(
    (condo) => condo.plan !== "free" && paidStatuses.has(condo.subscription_status ?? ""),
  );
  const canceledCondos = condominiums.filter((condo) =>
    canceledStatuses.has(condo.subscription_status ?? ""),
  );
  const lateCondos = condominiums.filter((condo) =>
    lateStatuses.has(condo.subscription_status ?? ""),
  );
  const freeOrTrial = condominiums.filter(
    (condo) => condo.plan === "free" || condo.subscription_status === "trialing",
  );

  const mrr = activePaidCondos.reduce(
    (total, condo) => total + (monthlyPlanPricesCents[condo.plan ?? "free"] ?? 0),
    0,
  );
  const currentMonth = currentMonthKey();
  const paidEvents = billingEvents.filter(
    (event) =>
      event.amount_cents &&
      !["failed", "canceled", "refunded"].includes(event.status ?? "") &&
      !event.event_type.includes("refund"),
  );
  const monthRevenue = sum(
    paidEvents
      .filter((event) => event.created_at?.startsWith(currentMonth))
      .map((event) => event.amount_cents),
  );
  const totalRevenue = sum(paidEvents.map((event) => event.amount_cents));
  const addonRevenue = sum(
    addons.filter((addon) => addon.status !== "canceled").map((addon) => addon.price_cents),
  );
  const whatsappCreditsSold = sum(addons.map((addon) => addon.credits));
  const refundsPending = refunds.filter((refund) => refund.status === "pending" || refund.status === "reviewing");
  const refundsApproved = refunds.filter((refund) =>
    ["approved", "processed", "refunded"].includes(refund.status ?? ""),
  );
  const upgrades = billingEvents.filter((event) => event.event_type.includes("upgrade")).length;
  const downgrades = billingEvents.filter((event) => event.event_type.includes("downgrade")).length;
  const churn = activePaidCondos.length + canceledCondos.length
    ? (canceledCondos.length / (activePaidCondos.length + canceledCondos.length)) * 100
    : 0;
  const arpu = activePaidCondos.length ? mrr / activePaidCondos.length : 0;

  const revenueByMonth = months.map((month) => ({
    label: month.label,
    value: sum(
      paidEvents
        .filter((event) => event.created_at?.startsWith(month.key))
        .map((event) => event.amount_cents),
    ),
  }));
  const mrrByMonth = months.map((month) => {
    const analyticsRow = analytics.find((row) => row.date?.startsWith(month.key));
    return {
      label: month.label,
      value: Number(analyticsRow?.mrr_cents ?? (month.key === currentMonth ? mrr : 0)),
    };
  });
  const newCustomersByMonth = months.map((month) => ({
    label: month.label,
    value: condominiums.filter((condo) => condo.created_at?.startsWith(month.key)).length,
  }));
  const cancellationsByMonth = months.map((month) => {
    const analyticsRow = analytics.find((row) => row.date?.startsWith(month.key));
    return {
      label: month.label,
      value: Number(analyticsRow?.canceled_condominiums ?? 0),
    };
  });
  const revenueByPlan = Object.entries(
    activePaidCondos.reduce<Record<string, number>>((acc, condo) => {
      const plan = condo.plan ?? "free";
      acc[plan] = (acc[plan] ?? 0) + (monthlyPlanPricesCents[plan] ?? 0);
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));
  const addonsByMonth = months.map((month) => ({
    label: month.label,
    value: sum(
      addons
        .filter((addon) => addon.created_at?.startsWith(month.key))
        .map((addon) => addon.price_cents),
    ),
  }));

  return {
    filters: { ...filters, period },
    metrics: {
      mrr,
      arr: mrr * 12,
      monthRevenue,
      totalRevenue,
      activeSubscriptions: activePaidCondos.length,
      canceledSubscriptions: canceledCondos.length,
      overdueSubscriptions: lateCondos.length,
      freeOrTrial: freeOrTrial.length,
      upgrades,
      downgrades,
      churn,
      arpu,
      addonRevenue,
      whatsappCreditsSold,
      whatsappCreditsUsed: sum(whatsappUsage.map((usage) => usage.used_credits)),
      whatsappBlockedSends: sum(whatsappUsage.map((usage) => usage.blocked_sends)),
      pendingRefundsCount: refundsPending.length,
      pendingRefundsAmount: sum(refundsPending.map((refund) => refund.amount_cents)),
      approvedRefundsCount: refundsApproved.length,
      approvedRefundsAmount: sum(refundsApproved.map((refund) => refund.amount_cents)),
      defaultAmount: sum(
        billingEvents
          .filter((event) => ["failed", "past_due", "overdue"].includes(event.status ?? ""))
          .map((event) => event.amount_cents),
      ),
    },
    charts: {
      revenueByMonth,
      mrrByMonth,
      newCustomersByMonth,
      cancellationsByMonth,
      revenueByPlan,
      addonsByMonth,
    },
    tables: {
      latestInvoices: paidEvents.slice(0, 12),
      latestSubscriptions: condominiums.slice(0, 12),
      failedCharges: billingEvents
        .filter((event) => ["failed", "past_due", "overdue"].includes(event.status ?? ""))
        .slice(0, 12),
      recentRefunds: refunds.slice(0, 12),
    },
    formatted: {
      mrr: moneyFromCents(mrr),
      arr: moneyFromCents(mrr * 12),
      monthRevenue: moneyFromCents(monthRevenue),
      totalRevenue: moneyFromCents(totalRevenue),
      addonRevenue: moneyFromCents(addonRevenue),
      arpu: moneyFromCents(arpu),
      defaultAmount: moneyFromCents(
        sum(
          billingEvents
            .filter((event) => ["failed", "past_due", "overdue"].includes(event.status ?? ""))
            .map((event) => event.amount_cents),
        ),
      ),
    },
  };
}
