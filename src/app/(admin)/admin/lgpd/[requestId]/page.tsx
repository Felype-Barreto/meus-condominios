import Link from "next/link";
import { createAdminNoteAction, updateDataRequestAdminAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveRevealForm } from "@/components/admin/sensitive-reveal-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail, maskPhone } from "@/lib/admin/data";

const typeLabels: Record<string, string> = {
  export: "Exportacao",
  correction: "Correcao",
  deletion: "Exclusao",
  portability: "Portabilidade",
  consent_revocation: "Revogacao de consentimento",
  privacy_question: "Duvida de privacidade",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em analise",
  waiting_customer: "Aguardando cliente",
  processed: "Processado",
  rejected: "Rejeitado",
  canceled: "Cancelado",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
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

function dueDate(createdAt: string, priority?: string | null) {
  const date = new Date(createdAt);
  const days = priority === "urgent" ? 2 : priority === "high" ? 5 : 15;
  date.setDate(date.getDate() + days);
  return date;
}

export default async function AdminLgpdDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin", "platform_security", "platform_support"]);
  const { requestId } = await params;
  const supabase = createAdminSupabase();
  const [{ data: request }, { data: staff }] = await Promise.all([
    supabase
      .from("data_requests")
      .select(`
        *,
        condominiums(id,name,slug,plan,subscription_status),
        profiles!data_requests_user_id_fkey(id,full_name,email,phone,created_at)
      `)
      .eq("id", requestId)
      .single(),
    supabase.from("platform_admin_users").select("user_id,role,status").eq("status", "active"),
  ]);

  if (!request) return <Card className="p-6">Pedido LGPD nao encontrado.</Card>;

  const condo = joined(request.condominiums);
  const profile = joined(request.profiles);
  const staffIds = Array.from(new Set([request.assigned_to, request.processed_by, ...(staff ?? []).map((item) => item.user_id)].filter(Boolean))) as string[];
  const { data: staffProfiles } = staffIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", staffIds)
    : { data: [] };
  const staffById = new Map((staffProfiles ?? []).map((item) => [item.id, item]));
  const assigned = request.assigned_to ? staffById.get(request.assigned_to) : null;
  const processedBy = request.processed_by ? staffById.get(request.processed_by) : null;
  const actionsTaken: unknown[] = Array.isArray(request.actions_taken) ? request.actions_taken : [];

  const [{ data: relatedRequests }, { data: auditLogs }, { data: platformLogs }, { data: notes }, { data: optIns }, { data: memberships }] =
    await Promise.all([
      request.user_id
        ? supabase
            .from("data_requests")
            .select("id,request_type,status,created_at")
            .eq("user_id", request.user_id)
            .neq("id", request.id)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
      request.condominium_id
        ? supabase
            .from("audit_logs")
            .select("id,action,entity_type,entity_id,metadata,created_at")
            .eq("condominium_id", request.condominium_id)
            .eq("entity_type", "data_requests")
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      supabase
        .from("platform_admin_audit_logs")
        .select("id,action,severity,reason,metadata,created_at")
        .eq("entity_type", "data_requests")
        .eq("entity_id", request.id)
        .order("created_at", { ascending: false })
        .limit(20),
      request.condominium_id
        ? supabase
            .from("admin_notes")
            .select("id,note,visibility,created_at")
            .eq("condominium_id", request.condominium_id)
            .order("created_at", { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [] }),
      request.user_id
        ? supabase
            .from("whatsapp_opt_ins")
            .select("condominium_id,opted_in,categories,opted_in_at,opted_out_at")
            .eq("user_id", request.user_id)
            .limit(20)
        : Promise.resolve({ data: [] }),
      request.user_id
        ? supabase
            .from("memberships")
            .select("id,condominium_id,role,status,privacy_settings,condominiums(name)")
            .eq("user_id", request.user_id)
            .limit(30)
        : Promise.resolve({ data: [] }),
    ]);

  const due = request.internal_due_at ? new Date(request.internal_due_at) : dueDate(request.created_at, request.priority);
  const canConclude = ["platform_owner", "platform_admin", "platform_security"].includes(session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Pedido LGPD</p>
          <h1 className="mt-2 text-3xl font-semibold">{typeLabels[request.request_type] ?? request.request_type}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Criado em {formatDate(request.created_at)} - prazo interno {due.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/lgpd">Voltar</Link></Button>
          {condo?.id ? <Button asChild variant="outline"><Link href={`/admin/condominios/${condo.id}`}>Ver condominio</Link></Button> : null}
          {canConclude ? <Button asChild><Link href={`/admin/lgpd/${request.id}/export`}>Gerar exportacao JSON</Link></Button> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Status" value={statusLabels[request.status] ?? request.status} />
        <AdminMetricCard label="Prioridade" value={priorityLabels[request.priority ?? "normal"] ?? request.priority} />
        <AdminMetricCard label="Responsavel" value={assigned?.full_name ?? maskEmail(assigned?.email)} />
        <AdminMetricCard label="Processado por" value={processedBy?.full_name ?? maskEmail(processedBy?.email)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            <AdminStatus value={statusLabels[request.status] ?? request.status} />
            <AdminStatus value={priorityLabels[request.priority ?? "normal"] ?? request.priority} />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Descricao</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{request.description || "Sem descricao detalhada."}</p>
          <div className="mt-5 grid gap-3 rounded-lg border bg-background p-4 text-sm md:grid-cols-2">
            <p><strong>Solicitante:</strong> {profile?.full_name ?? "Nao vinculado"}</p>
            <p><strong>E-mail:</strong> {maskEmail(profile?.email ?? request.requested_by_email)}</p>
            <p><strong>Telefone:</strong> {maskPhone(profile?.phone)}</p>
            <p><strong>Condominio:</strong> {condo?.name ?? "Conta geral"}</p>
            <p><strong>Status assinatura:</strong> {condo?.subscription_status ?? "-"}</p>
            <p><strong>Resposta atual:</strong> {request.response_note ?? "Sem resposta registrada"}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Cuidados</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Confirme identidade antes de entregar exportacao ou alterar dados sensiveis.</p>
            <p>Exclusao definitiva nao deve ser automatica. Quando necessario, prefira anonimizar sem quebrar historico legal/auditoria.</p>
            <p>Revelar dados completos exige motivo.</p>
          </div>
          <div className="mt-4">
            <SensitiveRevealForm entityType="data_requests" entityId={request.id} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Acoes do atendimento</h2>
        <form action={updateDataRequestAdminAction} className="mt-4 grid gap-3">
          <input type="hidden" name="request_id" value={request.id} />
          <div className="grid gap-3 lg:grid-cols-4">
            <select name="status" defaultValue={request.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="priority" defaultValue={request.priority ?? "normal"} className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="assigned_to" defaultValue={request.assigned_to ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="">Sem responsavel</option>
              {(staff ?? []).map((member) => {
                const memberProfile = staffById.get(member.user_id);
                return <option key={member.user_id} value={member.user_id}>{memberProfile?.full_name ?? memberProfile?.email ?? member.role}</option>;
              })}
            </select>
            <select name="action_type" defaultValue="mark_reviewing" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="mark_reviewing">Marcar em analise</option>
              <option value="request_identity_confirmation">Solicitar confirmacao de identidade</option>
              <option value="generate_export">Gerar exportacao</option>
              <option value="register_correction">Registrar correcao</option>
              <option value="anonymize_data">Anonimizar dados</option>
              <option value="mark_processed">Marcar como processado</option>
              <option value="reject">Rejeitar com justificativa</option>
              <option value="add_internal_note">Adicionar nota interna</option>
            </select>
          </div>
          <Input name="reason" placeholder="Motivo obrigatorio da acao" required />
          <Input name="response_note" placeholder="Resposta ou nota para o solicitante" />
          <Input name="confirm_sensitive_action" placeholder="Para anonimizar, digite ANONIMIZAR" />
          <Button type="submit" className="w-full sm:w-fit">Registrar acao</Button>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Historico</h2>
          <div className="mt-4 space-y-3">
            {actionsTaken.length ? actionsTaken.map((item, index) => {
              const action = metadataOf(item);
              return (
                <div key={`${String(action.created_at)}-${index}`} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-semibold">{String(action.action_type ?? "Acao")}</p>
                  <p className="mt-1">{String(action.reason ?? "")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{String(action.actor ?? "Equipe Meus Condomínios")} - {String(action.created_at ?? "")}</p>
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Sem historico de atendimento.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Consentimentos e vinculos</h2>
          <div className="mt-4 space-y-3">
            {(optIns ?? []).map((optIn) => (
              <div key={optIn.condominium_id} className="rounded-lg border bg-background p-3 text-sm">
                <p className="font-semibold">WhatsApp: {optIn.opted_in ? "ativo" : "revogado"}</p>
                <p className="text-xs text-muted-foreground">Entrada: {formatDate(optIn.opted_in_at)} - Saida: {formatDate(optIn.opted_out_at)}</p>
              </div>
            ))}
            {(memberships ?? []).map((membership) => {
              const membershipCondo = joined(membership.condominiums);
              return (
                <div key={membership.id} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-semibold">{membershipCondo?.name ?? membership.condominium_id}</p>
                  <p className="text-xs text-muted-foreground">{membership.role} - {membership.status}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Logs do pedido</h2></div>
          <div className="divide-y">
            {[...(platformLogs ?? []), ...(auditLogs ?? [])].map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">{log.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                {"reason" in log && log.reason ? <p className="mt-1 text-xs text-muted-foreground">Motivo: {log.reason}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Pedidos relacionados</h2></div>
          <div className="divide-y">
            {(relatedRequests ?? []).map((item) => (
              <Link key={item.id} href={`/admin/lgpd/${item.id}`} className="block p-4 text-sm hover:bg-muted/40">
                <p className="font-semibold">{typeLabels[item.request_type] ?? item.request_type}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.status} - {formatDate(item.created_at)}</p>
              </Link>
            ))}
            {!(relatedRequests ?? []).length ? <p className="p-5 text-sm text-muted-foreground">Sem pedidos relacionados.</p> : null}
          </div>
        </Card>
      </section>

      {condo?.id ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Notas internas do condominio</h2>
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
            <Input name="note" placeholder="Nota interna sobre o pedido LGPD" required />
            <select name="visibility" defaultValue="security" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="security">Seguranca/LGPD</option>
              <option value="support">Suporte</option>
              <option value="internal">Interna geral</option>
            </select>
            <Button type="submit">Adicionar nota</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
