import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CostControlledAction =
  | "dashboard"
  | "apartments.list"
  | "announcements.create"
  | "bookings.create"
  | "tickets.create"
  | "packages.create"
  | "documents.upload"
  | "common_areas.create"
  | "incidents.create"
  | "support.create"
  | "abuse_report.create"
  | "qr_public.search"
  | "admin.expensive_query"
  | "analytics.query";

export type MonthlyUsage = {
  bookings_month: number;
  tickets_month: number;
  announcements_month: number;
  packages_month: number;
  storage_mb: number;
};

export type StorageUsage = {
  usedMb: number;
  limitMb: number;
  percent: number;
  warn70: boolean;
  warn80: boolean;
  blocked: boolean;
};

export type CostRisk = {
  level: "low" | "medium" | "high" | "blocked";
  reasons: string[];
  storage: StorageUsage;
  monthly: Array<{
    key: keyof MonthlyUsage;
    label: string;
    used: number;
    limit: number;
    percent: number;
    warn80: boolean;
    blocked: boolean;
  }>;
};

const actionWindows: Record<CostControlledAction, { minutes: number; limit: number }> = {
  dashboard: { minutes: 5, limit: 80 },
  "apartments.list": { minutes: 5, limit: 80 },
  "announcements.create": { minutes: 60, limit: 20 },
  "bookings.create": { minutes: 60, limit: 30 },
  "tickets.create": { minutes: 60, limit: 30 },
  "packages.create": { minutes: 60, limit: 40 },
  "documents.upload": { minutes: 60, limit: 20 },
  "common_areas.create": { minutes: 60, limit: 8 },
  "incidents.create": { minutes: 60, limit: 20 },
  "support.create": { minutes: 60, limit: 8 },
  "abuse_report.create": { minutes: 60, limit: 6 },
  "qr_public.search": { minutes: 10, limit: 30 },
  "admin.expensive_query": { minutes: 10, limit: 25 },
  "analytics.query": { minutes: 10, limit: 20 },
};

function percent(used: number, limit: number) {
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

async function auditCostEvent(condoId: string | null, action: string, metadata: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  if (!condoId) return;
  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: action,
    event_entity_type: "cost_control",
    event_entity_id: null,
    event_metadata: metadata,
  });
}

export async function getStorageUsage(condoId: string): Promise<StorageUsage> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("condominiums")
    .select("plan, plan_limits(max_storage_mb)")
    .eq("id", condoId)
    .single();
  if (error) throw error;

  const { data: usage, error: usageError } = await supabase.rpc("get_current_usage", {
    condo_id: condoId,
  });
  if (usageError) throw usageError;

  const joinedLimits = data?.plan_limits as { max_storage_mb?: number } | { max_storage_mb?: number }[] | null;
  const limits = Array.isArray(joinedLimits) ? joinedLimits[0] : joinedLimits;
  const usedMb = Number((usage as { storage_mb?: number } | null)?.storage_mb ?? 0);
  const limitMb = Number(limits?.max_storage_mb ?? 0);
  const value = percent(usedMb, limitMb);

  return {
    usedMb,
    limitMb,
    percent: value,
    warn70: value >= 70,
    warn80: value >= 80,
    blocked: value >= 100,
  };
}

export async function getMonthlyUsage(condoId: string): Promise<MonthlyUsage> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_current_usage", { condo_id: condoId });
  if (error) throw error;
  const usage = (data ?? {}) as Partial<MonthlyUsage>;

  return {
    bookings_month: Number(usage.bookings_month ?? 0),
    tickets_month: Number(usage.tickets_month ?? 0),
    announcements_month: Number(usage.announcements_month ?? 0),
    packages_month: Number(usage.packages_month ?? 0),
    storage_mb: Number(usage.storage_mb ?? 0),
  };
}

export async function getCostRisk(condoId: string): Promise<CostRisk> {
  const supabase = await createSupabaseServerClient();
  const [{ data: condo, error }, monthly, storage] = await Promise.all([
    supabase
      .from("condominiums")
      .select(`
        plan,
        plan_limits(
          max_bookings_per_month,
          max_tickets_per_month,
          max_announcements_per_month,
          max_packages_per_month
        )
      `)
      .eq("id", condoId)
      .single(),
    getMonthlyUsage(condoId),
    getStorageUsage(condoId),
  ]);
  if (error) throw error;

  const joinedLimits = condo?.plan_limits as
    | {
        max_bookings_per_month?: number;
        max_tickets_per_month?: number;
        max_announcements_per_month?: number;
        max_packages_per_month?: number;
      }
    | Array<{
        max_bookings_per_month?: number;
        max_tickets_per_month?: number;
        max_announcements_per_month?: number;
        max_packages_per_month?: number;
      }>
    | null;
  const limits = Array.isArray(joinedLimits) ? joinedLimits[0] : joinedLimits;
  const monthlyRows = [
    ["bookings_month", "Agendamentos", monthly.bookings_month, limits?.max_bookings_per_month ?? 0],
    ["tickets_month", "Solicitacoes", monthly.tickets_month, limits?.max_tickets_per_month ?? 0],
    ["announcements_month", "Comunicados", monthly.announcements_month, limits?.max_announcements_per_month ?? 0],
    ["packages_month", "Encomendas", monthly.packages_month, limits?.max_packages_per_month ?? 0],
  ] as const;

  const rows = monthlyRows.map(([key, label, used, limit]) => {
    const value = percent(used, limit);
    return {
      key,
      label,
      used,
      limit,
      percent: value,
      warn80: value >= 80,
      blocked: value >= 100,
    };
  });

  const reasons = [
    storage.warn70 ? `Storage em ${storage.percent}%` : "",
    ...rows.filter((row) => row.warn80).map((row) => `${row.label} em ${row.percent}%`),
  ].filter(Boolean);
  const blocked = storage.blocked || rows.some((row) => row.blocked);
  const high = storage.warn80 || rows.some((row) => row.percent >= 90);
  const medium = storage.warn70 || rows.some((row) => row.warn80);

  return {
    level: blocked ? "blocked" : high ? "high" : medium ? "medium" : "low",
    reasons,
    storage,
    monthly: rows,
  };
}

export async function canRunExpensiveQuery(userId: string, action: CostControlledAction) {
  const window = actionWindows[action] ?? { minutes: 10, limit: 20 };
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - window.minutes * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", userId)
    .eq("action", `cost_control:${action}`)
    .gte("created_at", since);

  if (error) return { allowed: true, used: 0, limit: window.limit };
  return {
    allowed: (count ?? 0) < window.limit,
    used: count ?? 0,
    limit: window.limit,
  };
}

export async function blockIfCostRiskHigh(condoId: string, action: CostControlledAction) {
  const risk = await getCostRisk(condoId);
  const matchingMetric = risk.monthly.find((row) => {
    if (action === "announcements.create") return row.key === "announcements_month";
    if (action === "bookings.create") return row.key === "bookings_month";
    if (action === "tickets.create") return row.key === "tickets_month";
    if (action === "packages.create") return row.key === "packages_month";
    return false;
  });

  if (action === "documents.upload" && risk.storage.blocked) {
    await auditCostEvent(condoId, "cost_control_blocked", { action, reason: "storage", risk });
    throw new Error("Limite de armazenamento atingido. Faca upgrade para continuar.");
  }

  if (matchingMetric?.blocked) {
    await auditCostEvent(condoId, "cost_control_blocked", {
      action,
      reason: matchingMetric.key,
      used: matchingMetric.used,
      limit: matchingMetric.limit,
    });
    throw new Error(`Limite mensal de ${matchingMetric.label.toLowerCase()} atingido.`);
  }

  if (risk.level === "high" || risk.level === "blocked") {
    await auditCostEvent(condoId, "cost_control_warning", { action, risk_level: risk.level, reasons: risk.reasons });
  }

  return risk;
}

export async function recordCostControlledAction(condoId: string, userId: string, action: CostControlledAction) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: `cost_control:${action}`,
    event_entity_type: "cost_control",
    event_entity_id: null,
    event_metadata: { user_id: userId },
  });
}
