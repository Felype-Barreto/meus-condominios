import Link from "next/link";
import { AlertTriangle, Eye, LockKeyhole, ShieldAlert } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sinceHours(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function isOpen(status?: string | null) {
  return !["resolved", "dismissed", "rejected", "closed"].includes(status ?? "");
}

export default async function AdminSecurityPage() {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_security"]);
  const supabase = createAdminSupabase();
  const last24h = sinceHours(24);
  const [
    { data: incidents },
    { data: abuseReports },
    { data: platformLogs },
    { data: sensitiveLogs },
    { data: qrLogs },
    { data: whatsappLogs },
    { data: communicationBlocks },
    { data: permissionLogs },
    { data: blockedMemberships },
  ] = await Promise.all([
    supabase
      .from("security_incidents")
      .select("id,condominium_id,incident_type,severity,title,status,created_at,condominiums(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("abuse_reports")
      .select("id,condominium_id,reason,status,severity,created_at,condominiums(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("platform_admin_audit_logs")
      .select("id,actor_user_id,action,entity_type,severity,reason,created_at,profiles(email)")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("sensitive_access_logs")
      .select("id,actor_user_id,target_type,field_accessed,reason,created_at,profiles(email)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("qr_public_access_logs")
      .select("id,condominium_id,result_type,blocked,reason,created_at,condominiums(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("whatsapp_message_logs")
      .select("id,condominium_id,status,error_message,message_type,created_at,condominiums(id,name,slug)")
      .in("status", ["failed", "blocked", "opt_out", "no_consent"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("audit_logs")
      .select("id,condominium_id,action,entity_type,entity_id,metadata,created_at,condominiums(id,name,slug)")
      .in("action", ["communication_safety_blocked", "communication_resend_unread_blocked"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("audit_logs")
      .select("id,condominium_id,action,entity_type,entity_id,created_at,condominiums(id,name,slug)")
      .ilike("action", "%permission%")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("memberships")
      .select("id,condominium_id,user_id,role,updated_at,condominiums(id,name,slug),profiles(full_name,email)")
      .eq("status", "blocked")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const openIncidents = (incidents ?? []).filter((item) => isOpen(item.status)).length;
  const criticalReports = (abuseReports ?? []).filter((item) => ["high", "critical"].includes(item.severity ?? "") && isOpen(item.status)).length;
  const sensitiveRecent = sensitiveLogs?.length ?? 0;
  const qrBlocked = (qrLogs ?? []).filter((item) => item.blocked).length;
  const whatsappFailures = whatsappLogs?.length ?? 0;
  const permissionChanges = permissionLogs?.length ?? 0;
  const usersBlocked = blockedMemberships?.length ?? 0;
  const critical24h = [
    ...(platformLogs ?? []).filter((item) => item.created_at >= last24h && ["high", "critical"].includes(item.severity ?? "")),
    ...(incidents ?? []).filter((item) => item.created_at >= last24h && ["high", "critical"].includes(item.severity ?? "")),
    ...(abuseReports ?? []).filter((item) => item.created_at >= last24h && ["high", "critical"].includes(item.severity ?? "")),
  ].length;

  const condoRisk = new Map<string, { id: string; name: string; score: number; reasons: string[] }>();
  function addRisk(condo: { id?: string; name?: string; slug?: string } | null | undefined, points: number, reason: string) {
    if (!condo?.id) return;
    const existing = condoRisk.get(condo.id) ?? { id: condo.id, name: condo.name ?? condo.slug ?? "Condominio", score: 0, reasons: [] };
    existing.score += points;
    existing.reasons.push(reason);
    condoRisk.set(condo.id, existing);
  }
  (incidents ?? []).forEach((item) => addRisk(joined(item.condominiums), item.severity === "critical" ? 5 : 3, "incidente aberto"));
  (abuseReports ?? []).forEach((item) => addRisk(joined(item.condominiums), item.severity === "critical" ? 4 : 2, "denuncia aberta"));
  (qrLogs ?? []).filter((item) => item.blocked).forEach((item) => addRisk(joined(item.condominiums), 1, "QR bloqueado"));
  (whatsappLogs ?? []).forEach((item) => addRisk(joined(item.condominiums), 1, "falha WhatsApp"));
  const highRiskCondos = Array.from(condoRisk.values()).sort((a, b) => b.score - a.score).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">Central de seguranca</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Acompanhamento de incidentes, denuncias, acessos sensiveis, QR publico, WhatsApp, permissoes e eventos criticos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/logs">Ver logs</Link></Button>
          <Button asChild><Link href="/admin/incidentes">Incidentes</Link></Button>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 text-amber-700" />
          <p className="text-sm leading-6 text-amber-950">
            Dados pessoais ficam mascarados por padrao. Nao exiba tokens, payloads completos de webhook, service role ou dados de moradores em massa.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Incidentes abertos" value={openIncidents} />
        <AdminMetricCard label="Denuncias criticas" value={criticalReports} />
        <AdminMetricCard label="Acessos sensiveis" value={sensitiveRecent} />
        <AdminMetricCard label="QR bloqueado" value={qrBlocked} />
        <AdminMetricCard label="Falhas WhatsApp" value={whatsappFailures} />
        <AdminMetricCard label="Mudancas de permissao" value={permissionChanges} />
        <AdminMetricCard label="Usuarios bloqueados" value={usersBlocked} />
        <AdminMetricCard label="Criticos 24h" value={critical24h} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Incidentes recentes</h2>
          </div>
          <div className="divide-y">
            {(incidents ?? []).slice(0, 10).map((incident) => {
              const condo = joined(incident.condominiums);
              return (
                <div key={incident.id} className="p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/admin/incidentes/${incident.id}`} className="font-semibold hover:text-primary">{incident.title}</Link>
                      <p className="text-xs text-muted-foreground">
                        {incident.incident_type} - {incident.severity} - {condo?.name ?? "Plataforma"}
                      </p>
                    </div>
                    <AdminStatus value={incident.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Condominios com risco alto</h2>
          </div>
          <div className="divide-y">
            {highRiskCondos.map((condo) => (
              <div key={condo.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <Link href={`/admin/condominios/${condo.id}`} className="font-semibold hover:text-primary">{condo.name}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{Array.from(new Set(condo.reasons)).join(", ")}</p>
                </div>
                <AdminStatus value={`risco ${condo.score}`} />
              </div>
            ))}
            {!highRiskCondos.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum risco alto recente identificado.</p> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Acessos sensiveis</h2></div>
          <div className="divide-y">
            {(sensitiveLogs ?? []).slice(0, 8).map((log) => {
              const profile = joined(log.profiles);
              return (
                <div key={log.id} className="p-4 text-sm">
                  <p className="font-semibold">{log.field_accessed}</p>
                  <p className="text-xs text-muted-foreground">
                    {maskEmail(profile?.email)} - {log.target_type} - {new Date(log.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Motivo: {log.reason}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Bloqueios de seguranca</h2></div>
          <div className="divide-y">
            {[...(communicationBlocks ?? []), ...(qrLogs ?? []).filter((item) => item.blocked)].slice(0, 10).map((item) => {
              const condo = joined(item.condominiums);
              const label = "action" in item ? item.action : `QR ${item.result_type ?? "bloqueado"}`;
              return (
                <div key={item.id} className="p-4 text-sm">
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{condo?.name ?? "Condominio"} - {new Date(item.created_at).toLocaleString("pt-BR")}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Eventos internos criticos</h2></div>
          <div className="divide-y">
            {(platformLogs ?? []).slice(0, 10).map((log) => {
              const profile = joined(log.profiles);
              return (
                <div key={log.id} className="p-4 text-sm">
                  <div className="flex items-start gap-2">
                    {["high", "critical"].includes(log.severity ?? "") ? <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" /> : <Eye className="mt-0.5 h-4 w-4 text-primary" />}
                    <div>
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{maskEmail(profile?.email)} - {log.entity_type} - {new Date(log.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {critical24h > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <p className="text-sm leading-6 text-destructive">
              Existem eventos de alta severidade nas ultimas 24 horas. Revise incidentes, logs e denuncias antes de encerrar a triagem.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
