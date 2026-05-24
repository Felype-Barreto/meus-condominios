import Link from "next/link";
import {
  convertAbuseReportToIncidentAction,
  createAdminNoteAction,
  updateAbuseReportAdminAction,
} from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveRevealForm } from "@/components/admin/sensitive-reveal-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail, maskPhone } from "@/lib/admin/data";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em analise",
  action_required: "Precisa de acao",
  resolved: "Resolvida",
  rejected: "Rejeitada",
  escalated: "Escalada",
};

const severityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  critical: "Critica",
};

const actionLabels: Record<string, string> = {
  mark_reviewing: "Marcar em analise",
  request_info: "Solicitar mais informacoes",
  block_user: "Bloquear usuario no condominio",
  suspend_condominium: "Suspender condominio",
  remove_content: "Registrar remocao de conteudo",
  register_decision: "Registrar decisao",
  close_report: "Fechar denuncia",
  converted_to_incident: "Convertida em incidente",
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

export default async function AdminAbuseReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_security",
    "platform_readonly",
  ]);
  const { reportId } = await params;
  const supabase = createAdminSupabase();

  const [{ data: report }, { data: staff }] = await Promise.all([
    supabase
      .from("abuse_reports")
      .select(`
        *,
        condominiums(id,name,slug,plan,subscription_status)
      `)
      .eq("id", reportId)
      .single(),
    supabase.from("platform_admin_users").select("user_id,role,status").eq("status", "active"),
  ]);

  if (!report) {
    return <Card className="p-6">Denuncia nao encontrada.</Card>;
  }

  const condo = joined(report.condominiums);
  const userIds = Array.from(
    new Set(
      [
        report.reported_by,
        report.reported_user_id,
        report.assigned_to,
        ...(staff ?? []).map((member) => member.user_id),
      ].filter(Boolean) as string[],
    ),
  );
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,full_name,email,phone").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const reporter = report.reported_by ? profileById.get(report.reported_by) : null;
  const reportedUser = report.reported_user_id ? profileById.get(report.reported_user_id) : null;
  const assigned = report.assigned_to ? profileById.get(report.assigned_to) : null;

  const [
    { data: platformLogs },
    { data: condoAuditLogs },
    { data: sensitiveLogs },
    { data: qrLogs },
    { data: whatsappLogs },
    { data: notes },
    { data: incidents },
  ] = await Promise.all([
    supabase
      .from("platform_admin_audit_logs")
      .select("id,actor_user_id,action,severity,reason,metadata,created_at")
      .eq("entity_type", "abuse_reports")
      .eq("entity_id", report.id)
      .order("created_at", { ascending: false })
      .limit(30),
    report.condominium_id
      ? supabase
          .from("audit_logs")
          .select("id,actor_user_id,action,entity_type,entity_id,metadata,created_at")
          .eq("condominium_id", report.condominium_id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    report.condominium_id
      ? supabase
          .from("sensitive_access_logs")
          .select("id,actor_user_id,target_type,target_id,field_accessed,reason,created_at")
          .eq("condominium_id", report.condominium_id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    report.condominium_id
      ? supabase
          .from("qr_public_access_logs")
          .select("id,result_type,blocked,reason,created_at")
          .eq("condominium_id", report.condominium_id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    report.condominium_id
      ? supabase
          .from("whatsapp_message_logs")
          .select("id,target_type,template_key,message_type,status,error_message,created_at")
          .eq("condominium_id", report.condominium_id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    report.condominium_id
      ? supabase
          .from("admin_notes")
          .select("id,note,visibility,created_by,created_at")
          .eq("condominium_id", report.condominium_id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    supabase
      .from("security_incidents")
      .select("id,title,status,severity,created_at")
      .contains("affected_data", { source_abuse_report_id: report.id })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const actionsTaken: unknown[] = Array.isArray(report.actions_taken) ? report.actions_taken : [];
  const canAct = ["platform_owner", "platform_admin", "platform_security"].includes(session.role);
  const canComment = ["platform_owner", "platform_admin", "platform_security", "platform_support"].includes(session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Denuncia</p>
          <h1 className="mt-2 text-3xl font-semibold">{report.reason}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aberta em {formatDate(report.created_at)} - investigacao interna da equipe Meus Condomínios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/denuncias">Voltar</Link></Button>
          {condo?.id ? <Button asChild variant="outline"><Link href={`/admin/condominios/${condo.id}`}>Ver condominio</Link></Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Status" value={statusLabels[report.status ?? ""] ?? report.status} />
        <AdminMetricCard label="Severidade" value={severityLabels[report.severity ?? "normal"] ?? report.severity ?? "Normal"} />
        <AdminMetricCard label="Condominio" value={condo?.name ?? "Nao vinculado"} />
        <AdminMetricCard label="Responsavel" value={assigned?.full_name ?? maskEmail(assigned?.email)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatus value={statusLabels[report.status ?? ""] ?? report.status} />
            <AdminStatus value={severityLabels[report.severity ?? "normal"] ?? report.severity} />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Descricao</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report.description || "Sem descricao detalhada."}</p>
          <div className="mt-5 grid gap-3 rounded-lg border bg-background p-4 text-sm md:grid-cols-2">
            <p><strong>Entidade:</strong> {report.entity_type ?? "Nao informada"}</p>
            <p><strong>ID da entidade:</strong> {report.entity_id ?? "Nao informado"}</p>
            <p><strong>Denunciante:</strong> {reporter?.full_name ?? maskEmail(reporter?.email)}</p>
            <p><strong>Contato denunciante:</strong> {maskEmail(reporter?.email)} - {maskPhone(reporter?.phone)}</p>
            <p><strong>Usuario denunciado:</strong> {reportedUser?.full_name ?? maskEmail(reportedUser?.email)}</p>
            <p><strong>Contato denunciado:</strong> {maskEmail(reportedUser?.email)} - {maskPhone(reportedUser?.phone)}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Privacidade da triagem</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>O denunciante nao deve ser exposto para moradores, guarita ou usuario denunciado.</p>
            <p>Dados completos so devem ser consultados com motivo legitimo e registro de auditoria.</p>
            <p>Acoes severas precisam de confirmacao e motivo claro.</p>
          </div>
          <div className="mt-4">
            <SensitiveRevealForm entityType="abuse_reports" entityId={report.id} />
          </div>
        </Card>
      </div>

      {canAct ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Acoes disponiveis</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bloquear usuario altera o vinculo dele para bloqueado neste condominio. Suspender condominio marca a assinatura como blocked.
          </p>
          <form action={updateAbuseReportAdminAction} className="mt-4 grid gap-3">
            <input type="hidden" name="report_id" value={report.id} />
            <div className="grid gap-3 lg:grid-cols-4">
              <select name="status" defaultValue={report.status ?? "reviewing"} className="h-11 rounded-lg border bg-card px-3 text-sm">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="severity" defaultValue={report.severity ?? "normal"} className="h-11 rounded-lg border bg-card px-3 text-sm">
                {Object.entries(severityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="assigned_to" defaultValue={report.assigned_to ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
                <option value="">Sem responsavel</option>
                {(staff ?? []).map((member) => {
                  const profile = profileById.get(member.user_id);
                  return (
                    <option key={member.user_id} value={member.user_id}>
                      {profile?.full_name ?? profile?.email ?? member.role}
                    </option>
                  );
                })}
              </select>
              <select name="action_type" defaultValue="mark_reviewing" className="h-11 rounded-lg border bg-card px-3 text-sm">
                {Object.entries(actionLabels)
                  .filter(([value]) => value !== "converted_to_incident")
                  .map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
              </select>
            </div>
            <Input name="reason" placeholder="Motivo obrigatorio da acao" required />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" required className="h-4 w-4 rounded border" />
              Confirmo que a acao foi revisada e que o motivo registrado pode ser auditado.
            </label>
            <Button type="submit" className="w-full sm:w-fit">Registrar acao</Button>
          </form>
        </Card>
      ) : (
        <Card className="p-5 text-sm text-muted-foreground">
          Seu papel permite acompanhar a denuncia, mas decisoes, bloqueios e suspensoes ficam restritos a owner, admin e seguranca.
        </Card>
      )}

      {canAct ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Converter em incidente de seguranca</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use quando houver suspeita de vazamento, acesso indevido, QR abusivo, spam grave ou risco que exige acompanhamento formal.
          </p>
          <form action={convertAbuseReportToIncidentAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto]">
            <input type="hidden" name="report_id" value={report.id} />
            <select name="severity" defaultValue={report.severity === "normal" ? "medium" : report.severity ?? "medium"} className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
            <Input name="title" defaultValue={`Denuncia: ${report.reason}`} required />
            <Input name="description" defaultValue={report.description ?? "Denuncia convertida para investigacao formal."} required />
            <Button type="submit" variant="outline">Converter</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Historico de acoes</h2>
          <div className="mt-4 space-y-3">
            {actionsTaken.length ? (
              actionsTaken.map((item, index) => {
                const action = metadataOf(item);
                return (
                  <div key={`${String(action.created_at)}-${index}`} className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-semibold">{actionLabels[String(action.action_type)] ?? String(action.action_type ?? "Acao")}</p>
                    <p className="mt-1">{String(action.reason ?? "Sem motivo registrado.")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(action.actor ?? "Equipe Meus Condomínios")} - {String(action.created_at ?? "")}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma acao registrada ainda.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Incidentes vinculados</h2>
          <div className="mt-4 divide-y">
            {(incidents ?? []).map((incident) => (
              <div key={incident.id} className="py-3 text-sm">
                <Link href="/admin/incidentes" className="font-semibold hover:text-primary">{incident.title}</Link>
                <p className="mt-1 text-xs text-muted-foreground">{incident.severity} - {incident.status} - {formatDate(incident.created_at)}</p>
              </div>
            ))}
            {!(incidents ?? []).length ? <p className="text-sm text-muted-foreground">Nenhum incidente formal vinculado.</p> : null}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Logs relacionados</h2>
          </div>
          <div className="divide-y">
            {(platformLogs ?? []).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">{log.action}</p>
                <p className="mt-1 text-muted-foreground">{log.reason ?? "Sem motivo detalhado."}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.severity} - {formatDate(log.created_at)}</p>
              </div>
            ))}
            {(condoAuditLogs ?? []).slice(0, 8).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">{log.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.entity_type} - {formatDate(log.created_at)}</p>
              </div>
            ))}
            {!(platformLogs ?? []).length && !(condoAuditLogs ?? []).length ? (
              <p className="p-5 text-sm text-muted-foreground">Sem logs diretamente relacionados.</p>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Sinais de abuso</h2>
          </div>
          <div className="divide-y">
            {(qrLogs ?? []).slice(0, 6).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">QR publico: {log.result_type ?? "tentativa"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.blocked ? "Bloqueado" : "Permitido"} - {log.reason ?? "sem motivo"} - {formatDate(log.created_at)}
                </p>
              </div>
            ))}
            {(whatsappLogs ?? []).slice(0, 6).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">WhatsApp: {log.message_type}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.status} - {log.error_message ?? "sem erro"} - {formatDate(log.created_at)}
                </p>
              </div>
            ))}
            {(sensitiveLogs ?? []).slice(0, 6).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">Acesso sensivel: {log.field_accessed}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.reason} - {formatDate(log.created_at)}</p>
              </div>
            ))}
            {!(qrLogs ?? []).length && !(whatsappLogs ?? []).length && !(sensitiveLogs ?? []).length ? (
              <p className="p-5 text-sm text-muted-foreground">Sem sinais recentes de QR, WhatsApp ou acesso sensivel.</p>
            ) : null}
          </div>
        </Card>
      </section>

      {report.condominium_id && canComment ? (
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
            <input type="hidden" name="condominium_id" value={report.condominium_id} />
            <Input name="note" placeholder="Nota interna sobre a denuncia" required />
            <select name="visibility" defaultValue="security" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="security">Seguranca</option>
              <option value="support">Suporte</option>
              <option value="internal">Interna geral</option>
              <option value="finance">Financeiro</option>
            </select>
            <Button type="submit">Adicionar nota</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
