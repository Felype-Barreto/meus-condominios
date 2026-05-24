import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type EconomyFeature =
  | "realtime"
  | "heavy_reports"
  | "pdf_export"
  | "whatsapp_automatic"
  | "large_batch"
  | "large_upload"
  | "bulk_attachments"
  | "detailed_analytics"
  | "verbose_logs"
  | "frequent_scheduled_tasks";

export type EconomyModeDecision = {
  allowed: boolean;
  feature: EconomyFeature;
  adminMessage: string;
  userMessage: string;
};

export type EconomyModeSnapshot = {
  enabled: boolean;
  storageUsedMb: number;
  sampledCondominiums: number;
  databaseRows: number;
  whatsappUsedThisMonth: number;
  alerts: string[];
  recommendations: string[];
};

const disabledFeatures = new Set<EconomyFeature>([
  "realtime",
  "heavy_reports",
  "pdf_export",
  "whatsapp_automatic",
  "large_batch",
  "large_upload",
  "bulk_attachments",
  "detailed_analytics",
  "verbose_logs",
  "frequent_scheduled_tasks",
]);

export const economyModeConfig = {
  shortPageSize: 24,
  adminPageSize: 50,
  analyticsSampleLimit: 500,
  maxEconomyUploadMb: 2,
  maxBatchItems: 100,
  publicCacheSeconds: 300,
};

export function isEconomyMode() {
  return process.env.ECONOMY_MODE === "true" || process.env.NEXT_PUBLIC_ECONOMY_MODE === "true";
}

export function getEconomyModeDecision(feature: EconomyFeature): EconomyModeDecision {
  const enabled = isEconomyMode();
  const blocked = enabled && disabledFeatures.has(feature);

  return {
    allowed: !blocked,
    feature,
    adminMessage: blocked
      ? "Este recurso está preparado, mas será ativado quando o Meus Condomínios migrar para infraestrutura de produção paga."
      : "Recurso disponível.",
    userMessage: blocked ? "Disponível em planos pagos ou em configuração." : "Recurso disponível.",
  };
}

export function assertEconomyFeatureEnabled(feature: EconomyFeature, audience: "admin" | "user" = "user") {
  const decision = getEconomyModeDecision(feature);
  if (!decision.allowed) {
    throw new Error(audience === "admin" ? decision.adminMessage : decision.userMessage);
  }
  return decision;
}

export function getEconomyPageSize(preferred = 50) {
  if (!isEconomyMode()) return preferred;
  return Math.min(preferred, economyModeConfig.shortPageSize);
}

export function getEconomyAdminPageSize(preferred = 100) {
  if (!isEconomyMode()) return preferred;
  return Math.min(preferred, economyModeConfig.adminPageSize);
}

export function sanitizeAnalyticsMetadata(metadata: Record<string, unknown>) {
  if (!isEconomyMode()) return metadata;
  const allowedKeys = ["plan", "role", "status", "source", "category", "type", "count"];
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedKeys.includes(key)));
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function countRows(supabase: SupabaseClient, table: string) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getEconomyModeSnapshot(): Promise<EconomyModeSnapshot> {
  const enabled = isEconomyMode();
  const supabase = createSupabaseServiceClient();
  const month = currentMonth();

  const [
    { data: condos },
    { data: whatsappUsage },
    profiles,
    memberships,
    announcements,
    bookings,
    tickets,
    packages,
    auditLogs,
    productEvents,
  ] = await Promise.all([
    supabase.from("condominiums").select("id,name,plan").order("created_at", { ascending: false }).limit(25),
    supabase.from("whatsapp_usage").select("used_credits").eq("month", month).limit(500),
    countRows(supabase, "profiles"),
    countRows(supabase, "memberships"),
    countRows(supabase, "announcements"),
    countRows(supabase, "bookings"),
    countRows(supabase, "tickets"),
    countRows(supabase, "packages"),
    countRows(supabase, "audit_logs"),
    countRows(supabase, "product_events"),
  ]);

  const storageResults = await Promise.all(
    (condos ?? []).map(async (condo) => {
      const { data } = await supabase.rpc("get_current_usage", { condo_id: condo.id });
      return Number((data as { storage_mb?: number } | null)?.storage_mb ?? 0);
    }),
  );

  const storageUsedMb = storageResults.reduce((sum, value) => sum + value, 0);
  const databaseRows = profiles + memberships + announcements + bookings + tickets + packages + auditLogs + productEvents;
  const whatsappUsedThisMonth = (whatsappUsage ?? []).reduce(
    (sum, item) => sum + Number(item.used_credits ?? 0),
    0,
  );

  const alerts = [
    storageUsedMb >= 400 ? "Storage estimado perto do limite prático do Supabase Free." : "",
    databaseRows >= 40000 ? "Volume de linhas crescendo. Priorize agregações e retenção de logs." : "",
    whatsappUsedThisMonth > 0 && enabled ? "Há uso de WhatsApp automático registrado; no modo econômico o envio real fica bloqueado." : "",
  ].filter(Boolean);

  return {
    enabled,
    storageUsedMb,
    sampledCondominiums: condos?.length ?? 0,
    databaseRows,
    whatsappUsedThisMonth,
    alerts,
    recommendations: [
      "Manter WhatsApp manual até migrar para infraestrutura paga.",
      "Usar paginação curta e dashboards resumidos.",
      "Evitar exportação PDF e relatórios longos no Hobby/Free.",
      "Ativar Cloudflare Turnstile e WAF para reduzir abuso.",
    ],
  };
}
