import {
  convertSecurityLogToIncidentAction,
  markSecurityLogReviewedAction,
} from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

type UnifiedLog = {
  id: string;
  source: "platform_admin_audit_logs" | "audit_logs" | "sensitive_access_logs" | "qr_public_access_logs" | "communication_safety_block";
  title: string;
  subtitle: string;
  actor?: string | null;
  condominium_id?: string | null;
  condominium_name?: string | null;
  entity_type?: string | null;
  severity?: string | null;
  reason?: string | null;
  created_at: string;
  sensitive: boolean;
};

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startDateFor(period: string) {
  const now = Date.now();
  if (period === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (period === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function includesText(value: unknown, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

function sanitizeReason(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/(token|secret|password|authorization|service_role|access_token)[^,\s]*/gi, "[removido]")
    .slice(0, 180);
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    source?: string;
    actor?: string;
    condominium_id?: string;
    entity?: string;
    severity?: string;
    action?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
    "platform_readonly",
  ]);
  const params = await searchParams;
  const period = params.period ?? "7d";
  const startDate = startDateFor(period);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 40;
  const query = (params.q ?? "").trim().toLowerCase();
  const canViewSensitive = ["platform_owner", "platform_security"].includes(session.role);
  const canAct = ["platform_owner", "platform_admin", "platform_security"].includes(session.role);

  const supabase = createAdminSupabase();
  let platformQuery = supabase
    .from("platform_admin_audit_logs")
    .select("id,actor_user_id,action,entity_type,entity_id,condominium_id,severity,reason,metadata,created_at,profiles(email),condominiums(name,slug)")
    .gte("created_at", startDate)
    .order("created_at", { ascending: false })
    .limit(120);
  let auditQuery = supabase
    .from("audit_logs")
    .select("id,actor_user_id,action,entity_type,entity_id,condominium_id,metadata,created_at,profiles(email),condominiums(name,slug)")
    .gte("created_at", startDate)
    .order("created_at", { ascending: false })
    .limit(120);
  let qrQuery = supabase
    .from("qr_public_access_logs")
    .select("id,condominium_id,result_type,blocked,reason,created_at,condominiums(name,slug)")
    .gte("created_at", startDate)
    .order("created_at", { ascending: false })
    .limit(80);
  let sensitiveQuery = supabase
    .from("sensitive_access_logs")
    .select("id,actor_user_id,target_type,target_id,condominium_id,field_accessed,reason,created_at,profiles(email),condominiums(name,slug)")
    .gte("created_at", startDate)
    .order("created_at", { ascending: false })
    .limit(canViewSensitive ? 80 : 0);

  if (params.actor) {
    platformQuery = platformQuery.eq("actor_user_id", params.actor);
    auditQuery = auditQuery.eq("actor_user_id", params.actor);
    sensitiveQuery = sensitiveQuery.eq("actor_user_id", params.actor);
  }
  if (params.condominium_id) {
    platformQuery = platformQuery.eq("condominium_id", params.condominium_id);
    auditQuery = auditQuery.eq("condominium_id", params.condominium_id);
    qrQuery = qrQuery.eq("condominium_id", params.condominium_id);
    sensitiveQuery = sensitiveQuery.eq("condominium_id", params.condominium_id);
  }
  if (params.entity) {
    platformQuery = platformQuery.eq("entity_type", params.entity);
    auditQuery = auditQuery.eq("entity_type", params.entity);
    sensitiveQuery = sensitiveQuery.eq("target_type", params.entity);
  }
  if (params.severity) platformQuery = platformQuery.eq("severity", params.severity);
  if (params.action) {
    platformQuery = platformQuery.ilike("action", `%${params.action}%`);
    auditQuery = auditQuery.ilike("action", `%${params.action}%`);
  }

  const [{ data: platformLogs }, { data: condoLogs }, { data: qrLogs }, { data: sensitiveLogs }] =
    await Promise.all([platformQuery, auditQuery, qrQuery, sensitiveQuery]);

  const unified: UnifiedLog[] = [
    ...(platformLogs ?? []).map((log) => {
      const profile = joined(log.profiles);
      const condo = joined(log.condominiums);
      return {
        id: log.id,
        source: "platform_admin_audit_logs" as const,
        title: log.action,
        subtitle: `${log.entity_type} - plataforma`,
        actor: maskEmail(profile?.email),
        condominium_id: log.condominium_id,
        condominium_name: condo?.name,
        entity_type: log.entity_type,
        severity: log.severity,
        reason: sanitizeReason(log.reason),
        created_at: log.created_at,
        sensitive: ["high", "critical"].includes(log.severity ?? ""),
      };
    }),
    ...(condoLogs ?? []).map((log) => {
      const profile = joined(log.profiles);
      const condo = joined(log.condominiums);
      return {
        id: log.id,
        source: log.action === "communication_safety_blocked" ? "communication_safety_block" as const : "audit_logs" as const,
        title: log.action,
        subtitle: `${log.entity_type} - condominio`,
        actor: maskEmail(profile?.email),
        condominium_id: log.condominium_id,
        condominium_name: condo?.name,
        entity_type: log.entity_type,
        severity: log.action.includes("blocked") ? "high" : "normal",
        reason: null,
        created_at: log.created_at,
        sensitive: log.action.includes("blocked") || log.action.includes("permission"),
      };
    }),
    ...(canViewSensitive ? (sensitiveLogs ?? []) : []).map((log) => {
      const profile = joined(log.profiles);
      const condo = joined(log.condominiums);
      return {
        id: log.id,
        source: "sensitive_access_logs" as const,
        title: log.field_accessed,
        subtitle: `${log.target_type} - acesso sensivel`,
        actor: maskEmail(profile?.email),
        condominium_id: log.condominium_id,
        condominium_name: condo?.name,
        entity_type: log.target_type,
        severity: "high",
        reason: sanitizeReason(log.reason),
        created_at: log.created_at,
        sensitive: true,
      };
    }),
    ...(qrLogs ?? []).map((log) => {
      const condo = joined(log.condominiums);
      return {
        id: log.id,
        source: "qr_public_access_logs" as const,
        title: log.blocked ? "QR publico bloqueado" : "QR publico acessado",
        subtitle: log.result_type ?? "tentativa",
        actor: null,
        condominium_id: log.condominium_id,
        condominium_name: condo?.name,
        entity_type: "qr_public_access_logs",
        severity: log.blocked ? "high" : "normal",
        reason: sanitizeReason(log.reason),
        created_at: log.created_at,
        sensitive: Boolean(log.blocked),
      };
    }),
  ]
    .filter((log) => !params.source || log.source === params.source)
    .filter((log) => {
      if (!query) return true;
      return [log.title, log.subtitle, log.condominium_name, log.actor, log.entity_type, log.reason].some((value) =>
        includesText(value, query),
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalPages = Math.max(1, Math.ceil(unified.length / pageSize));
  const rows = unified.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Logs de seguranca</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Visualizacao unificada de logs administrativos, auditoria de condominios, acessos sensiveis, QR publico e bloqueios da comunicacao.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Registros filtrados" value={unified.length} />
        <AdminMetricCard label="Sensibilidade alta" value={unified.filter((item) => item.sensitive).length} />
        <AdminMetricCard label="QR bloqueado" value={unified.filter((item) => item.source === "qr_public_access_logs" && item.sensitive).length} />
        <AdminMetricCard label="Periodo" value={period} />
      </div>

      <Card className="p-5">
        <form className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por acao, entidade, condominio ou ator" className="h-11 rounded-lg border bg-card px-3 text-sm" />
          <select name="period" defaultValue={period} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="24h">Ultimas 24h</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
          </select>
          <select name="source" defaultValue={params.source ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todas fontes</option>
            <option value="platform_admin_audit_logs">Acoes internas</option>
            <option value="audit_logs">Auditoria condominio</option>
            <option value="sensitive_access_logs">Acessos sensiveis</option>
            <option value="qr_public_access_logs">QR publico</option>
            <option value="communication_safety_block">Bloqueios comunicacao</option>
          </select>
          <select name="severity" defaultValue={params.severity ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Severidade</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <Input name="action" defaultValue={params.action ?? ""} placeholder="Acao" />
          <Button type="submit">Filtrar</Button>
        </form>
        {!canViewSensitive ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Seu papel nao visualiza `sensitive_access_logs`. Esses registros ficam restritos a owner e seguranca.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4">
        {rows.map((log) => (
          <Card key={`${log.source}-${log.id}`} className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{log.title}</h2>
                  <AdminStatus value={log.source} />
                  <AdminStatus value={log.severity ?? "normal"} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {log.subtitle} - {log.condominium_name ?? "Plataforma"} - {log.actor ?? "sem ator"} - {new Date(log.created_at).toLocaleString("pt-BR")}
                </p>
                {log.reason ? <p className="mt-2 text-sm text-muted-foreground">Motivo: {log.reason}</p> : null}
              </div>
              {canAct ? (
                <div className="grid gap-2 xl:min-w-[420px]">
                  <form action={markSecurityLogReviewedAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="source_type" value={log.source} />
                    <input type="hidden" name="source_id" value={log.id} />
                    <input type="hidden" name="condominium_id" value={log.condominium_id ?? ""} />
                    <Input name="reason" placeholder="Motivo da revisao" required />
                    <Button type="submit" variant="outline">Revisar</Button>
                  </form>
                  <form action={convertSecurityLogToIncidentAction} className="grid gap-2">
                    <input type="hidden" name="source_type" value={log.source} />
                    <input type="hidden" name="source_id" value={log.id} />
                    <input type="hidden" name="condominium_id" value={log.condominium_id ?? ""} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <select name="incident_type" defaultValue={log.source === "qr_public_access_logs" ? "qr_abuse" : "other"} className="h-11 rounded-lg border bg-card px-3 text-sm">
                        <option value="suspected_data_leak">Vazamento</option>
                        <option value="unauthorized_access">Acesso indevido</option>
                        <option value="abusive_use">Uso abusivo</option>
                        <option value="whatsapp_spam">WhatsApp</option>
                        <option value="qr_abuse">QR abusivo</option>
                        <option value="account_takeover">Conta</option>
                        <option value="other">Outro</option>
                      </select>
                      <select name="severity" defaultValue={log.severity === "critical" ? "critical" : log.sensitive ? "high" : "medium"} className="h-11 rounded-lg border bg-card px-3 text-sm">
                        <option value="low">Baixa</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="critical">Critica</option>
                      </select>
                      <Button type="submit">Converter</Button>
                    </div>
                    <Input name="title" defaultValue={`Incidente: ${log.title}`.slice(0, 120)} required />
                    <Input name="reason" placeholder="Por que este log virou incidente?" required />
                  </form>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
        {!rows.length ? (
          <Card className="p-6 text-center">
            <h2 className="text-lg font-semibold">Nenhum log encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou amplie o periodo.</p>
          </Card>
        ) : null}
      </div>

      <Card className="flex items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted-foreground">Pagina {page} de {totalPages}</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" aria-disabled={page <= 1}>
            <a href={`/admin/logs?period=${period}&page=${Math.max(1, page - 1)}`}>Anterior</a>
          </Button>
          <Button asChild variant="outline" aria-disabled={page >= totalPages}>
            <a href={`/admin/logs?period=${period}&page=${Math.min(totalPages, page + 1)}`}>Proxima</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
