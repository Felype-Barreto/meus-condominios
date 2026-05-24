import Link from "next/link";
import {
  createAdminNoteAction,
  updateSecurityIncidentAdminAction,
} from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveRevealForm } from "@/components/admin/sensitive-reveal-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  triaging: "Triagem",
  investigating: "Investigando",
  contained: "Contido",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

const severityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

const incidentTypes: Record<string, string> = {
  suspected_data_leak: "Suspeita de vazamento",
  unauthorized_access: "Acesso indevido",
  abusive_use: "Uso abusivo",
  whatsapp_spam: "Spam no WhatsApp",
  qr_abuse: "Abuso no QR publico",
  payment_issue: "Pagamento",
  account_takeover: "Conta comprometida",
  other: "Outro",
};

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function metadataOf(value: unknown) {
  return (value ?? {}) as Record<string, unknown>;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

export default async function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_security"]);
  const { incidentId } = await params;
  const supabase = createAdminSupabase();
  const { data: incident } = await supabase
    .from("security_incidents")
    .select("*,condominiums(id,name,slug,plan,subscription_status),profiles(full_name,email)")
    .eq("id", incidentId)
    .single();

  if (!incident) return <Card className="p-6">Incidente nao encontrado.</Card>;

  const condo = joined(incident.condominiums);
  const reporter = joined(incident.profiles);
  const affectedData = metadataOf(incident.affected_data);
  const actionsTaken: unknown[] = Array.isArray(incident.actions_taken) ? incident.actions_taken : [];
  const sourceReportId = String(affectedData.source_abuse_report_id ?? affectedData.linked_abuse_report_id ?? "");
  const sourceLogId = String(affectedData.source_id ?? "");

  const [
    { data: abuseReport },
    { data: platformLogs },
    { data: auditLogs },
    { data: sensitiveLogs },
    { data: qrLogs },
    { data: whatsappLogs },
    { data: notes },
  ] = await Promise.all([
    sourceReportId
      ? supabase
          .from("abuse_reports")
          .select("id,reason,status,severity,description,created_at")
          .eq("id", sourceReportId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("platform_admin_audit_logs")
      .select("id,action,severity,reason,metadata,created_at")
      .or(`entity_id.eq.${incident.id}${sourceLogId ? `,id.eq.${sourceLogId}` : ""}`)
      .order("created_at", { ascending: false })
      .limit(30),
    condo?.id
      ? supabase
          .from("audit_logs")
          .select("id,action,entity_type,entity_id,metadata,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] }),
    condo?.id
      ? supabase
          .from("sensitive_access_logs")
          .select("id,target_type,target_id,field_accessed,reason,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    condo?.id
      ? supabase
          .from("qr_public_access_logs")
          .select("id,result_type,blocked,reason,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    condo?.id
      ? supabase
          .from("whatsapp_message_logs")
          .select("id,status,error_message,message_type,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    condo?.id
      ? supabase
          .from("admin_notes")
          .select("id,note,visibility,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Incidente</p>
          <h1 className="mt-2 text-3xl font-semibold">{incident.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {incidentTypes[incident.incident_type] ?? incident.incident_type} - criado em {formatDate(incident.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/incidentes">Voltar</Link></Button>
          {condo?.id ? <Button asChild variant="outline"><Link href={`/admin/condominios/${condo.id}`}>Ver condominio</Link></Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Status" value={statusLabels[incident.status] ?? incident.status} />
        <AdminMetricCard label="Severidade" value={severityLabels[incident.severity] ?? incident.severity} />
        <AdminMetricCard label="Condominio" value={condo?.name ?? "Plataforma"} />
        <AdminMetricCard label="Reportado por" value={reporter?.full_name ?? maskEmail(reporter?.email)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            <AdminStatus value={statusLabels[incident.status] ?? incident.status} />
            <AdminStatus value={severityLabels[incident.severity] ?? incident.severity} />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Descricao e dados afetados</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{incident.description}</p>
          <div className="mt-5 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            <p>Fonte: {String(affectedData.source ?? affectedData.source_type ?? "nao informada")}</p>
            <p>Log/denuncia vinculada: {sourceReportId || sourceLogId || "nao informado"}</p>
            <p>Resolvido em: {formatDate(incident.resolved_at)}</p>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Controle de dados sensiveis</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Revelar detalhes sensiveis exige motivo. Nao copie payloads completos, tokens ou dados pessoais para canais externos.
          </p>
          <div className="mt-4">
            <SensitiveRevealForm entityType="security_incidents" entityId={incident.id} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Registrar acao tomada</h2>
        <form action={updateSecurityIncidentAdminAction} className="mt-4 grid gap-3">
          <input type="hidden" name="incident_id" value={incident.id} />
          <div className="grid gap-3 lg:grid-cols-3">
            <select name="status" defaultValue={incident.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="severity" defaultValue={incident.severity} className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="action_type" defaultValue="investigation_note" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="triage_started">Triagem iniciada</option>
              <option value="investigation_note">Nota de investigacao</option>
              <option value="containment_action">Acao de contencao</option>
              <option value="linked_report">Vinculo revisado</option>
              <option value="risk_reviewed">Risco revisado</option>
              <option value="resolved">Resolvido</option>
              <option value="dismissed">Descartado</option>
            </select>
          </div>
          <Input name="action_note" placeholder="Nota obrigatoria da acao tomada" required />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" required className="h-4 w-4 rounded border" />
            Confirmo que a acao foi revisada e pode ser auditada.
          </label>
          <Button type="submit" className="w-full sm:w-fit">Salvar acao</Button>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Historico de acoes</h2>
          <div className="mt-4 space-y-3">
            {actionsTaken.length ? actionsTaken.map((item, index) => {
              const action = metadataOf(item);
              return (
                <div key={`${String(action.created_at)}-${index}`} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-semibold">{String(action.action_type ?? "Acao")}</p>
                  <p className="mt-1">{String(action.note ?? action.reason ?? "")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{String(action.actor ?? "Equipe Meus Condomínios")} - {String(action.created_at ?? "")}</p>
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Sem acoes registradas.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Denuncia vinculada</h2>
          {abuseReport ? (
            <div className="mt-4 rounded-lg border bg-background p-4 text-sm">
              <Link href={`/admin/denuncias/${abuseReport.id}`} className="font-semibold hover:text-primary">{abuseReport.reason}</Link>
              <p className="mt-2 text-muted-foreground">{abuseReport.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{abuseReport.status} - {abuseReport.severity} - {formatDate(abuseReport.created_at)}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma denuncia vinculada.</p>
          )}
        </Card>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Logs relacionados</h2></div>
          <div className="divide-y">
            {[...(platformLogs ?? []), ...(auditLogs ?? [])].slice(0, 24).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">{log.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {"entity_type" in log ? log.entity_type : "platform"} - {formatDate(log.created_at)}
                </p>
                {"reason" in log && log.reason ? <p className="mt-1 text-xs text-muted-foreground">Motivo: {log.reason}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Sinais auxiliares</h2></div>
          <div className="divide-y">
            {[...(sensitiveLogs ?? []), ...(qrLogs ?? []), ...(whatsappLogs ?? [])].slice(0, 24).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">
                  {"field_accessed" in log ? `Acesso sensivel: ${log.field_accessed}` : "result_type" in log ? `QR: ${log.result_type}` : `WhatsApp: ${log.message_type}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {condo?.id ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Notas internas</h2>
          <div className="mt-4 divide-y">
            {(notes ?? []).map((note) => (
              <div key={note.id} className="py-3 text-sm">
                <p>{note.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">{note.visibility} - {formatDate(note.created_at)}</p>
              </div>
            ))}
          </div>
          <form action={createAdminNoteAction} className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <input type="hidden" name="condominium_id" value={condo.id} />
            <Input name="note" placeholder="Nota interna sobre o incidente" required />
            <select name="visibility" defaultValue="security" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="security">Seguranca</option>
              <option value="internal">Interna geral</option>
              <option value="support">Suporte</option>
              <option value="finance">Financeiro</option>
            </select>
            <Button type="submit">Adicionar nota</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
