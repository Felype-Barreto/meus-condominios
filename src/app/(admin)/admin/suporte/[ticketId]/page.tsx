import Link from "next/link";
import {
  convertSupportTicketToIncidentAction,
  createAdminNoteAction,
  createPlatformRefundRequestAction,
  linkSupportTicketAdminAction,
  updateHelpdeskTicketAction,
} from "@/app/(admin)/admin/actions";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveRevealForm } from "@/components/admin/sensitive-reveal-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail, maskPhone } from "@/lib/admin/data";

const financeCategories = new Set(["cobranca", "cancelamento", "reembolso"]);
const securityCategories = new Set(["seguranca", "privacidade_lgpd"]);

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function canView(role: string, category?: string | null) {
  if (["platform_owner", "platform_admin", "platform_support"].includes(role)) return true;
  if (role === "platform_finance") return financeCategories.has(category ?? "");
  if (role === "platform_security") return securityCategories.has(category ?? "");
  if (role === "platform_readonly") return !securityCategories.has(category ?? "");
  return false;
}

function metadataOf(value: unknown) {
  return (value ?? {}) as Record<string, unknown>;
}

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
    "platform_readonly",
  ]);
  const { ticketId } = await params;
  const supabase = createAdminSupabase();
  const [{ data: ticket }, { data: staff }, { data: condos }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(`
        *,
        condominiums(id,name,slug,plan),
        profiles(full_name,email,phone)
      `)
      .eq("id", ticketId)
      .single(),
    supabase.from("platform_admin_users").select("user_id,role,status,profiles(full_name,email)").eq("status", "active"),
    supabase.from("condominiums").select("id,name,slug").order("name", { ascending: true }).limit(300),
  ]);

  if (!ticket || !canView(session.role, ticket.category)) {
    return <Card className="p-6">Chamado não encontrado ou sem permissão para visualizar.</Card>;
  }

  const condo = joined(ticket.condominiums);
  const profile = joined(ticket.profiles);
  const metadata = metadataOf(ticket.metadata);
  const timeline = Array.isArray(metadata.timeline) ? metadata.timeline : [];
  const assignedProfile = (staff ?? []).find((member) => member.user_id === ticket.assigned_to);
  const assigned = joined(assignedProfile?.profiles);
  const [{ data: notes }, { data: refunds }, { data: incidents }] = await Promise.all([
    condo?.id
      ? supabase
          .from("admin_notes")
          .select("id,note,visibility,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    condo?.id
      ? supabase
          .from("refund_requests")
          .select("id,status,amount_cents,reason,created_at")
          .eq("condominium_id", condo.id)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from("security_incidents")
      .select("id,title,status,severity,affected_data,created_at")
      .contains("affected_data", { source_ticket_id: ticket.id })
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Chamado</p>
          <h1 className="mt-2 text-3xl font-semibold">{ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ticket.category} · aberto em {new Date(ticket.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/suporte">Voltar</Link></Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatus value={ticket.status} />
            <AdminStatus value={ticket.priority} />
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
              Responsável: {assigned?.full_name ?? maskEmail(assigned?.email)}
            </span>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6">{ticket.message}</p>
          <div className="mt-5 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            <p>Condomínio: {condo?.name ?? "Não vinculado"}</p>
            <p>Usuário: {profile?.full_name ?? "Não vinculado"} · {maskEmail(profile?.email)} · {maskPhone(profile?.phone)}</p>
            <p>E-mail informado: {maskEmail(String(metadata.email ?? ""))}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Segurança dos dados</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Dados completos ficam mascarados. Revelar exige motivo e gera log.
          </p>
          <div className="mt-4">
            <SensitiveRevealForm entityType="support_tickets" entityId={ticket.id} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Responder e atualizar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem e-mail integrado: a resposta fica registrada internamente e marcada como não enviada externamente.
        </p>
        <form action={updateHelpdeskTicketAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <select name="status" defaultValue={ticket.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="open">Aberto</option>
            <option value="waiting_customer">Aguardando cliente</option>
            <option value="in_progress">Em andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <select name="priority" defaultValue={ticket.priority} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          <select name="assigned_to" defaultValue={ticket.assigned_to ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Sem responsável</option>
            {(staff ?? []).map((member) => {
              const memberProfile = joined(member.profiles);
              return (
                <option key={member.user_id} value={member.user_id}>
                  {memberProfile?.full_name ?? memberProfile?.email ?? member.role}
                </option>
              );
            })}
          </select>
          <Input name="response_note" placeholder="Resposta interna/resumo" />
          <Button type="submit">Salvar</Button>
          <Input name="internal_note" className="lg:col-span-4" placeholder="Nota interna opcional" />
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Timeline</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="font-semibold">Chamado criado</p>
              <p className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString("pt-BR")}</p>
            </div>
            {timeline.map((item, index) => {
              const entry = item as Record<string, unknown>;
              return (
                <div key={`${String(entry.created_at)}-${index}`} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-semibold">{String(entry.type ?? "Atualização")}</p>
                  <p className="mt-1">{String(entry.note ?? "")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(entry.actor ?? "Equipe Meus Condomínios")} · {String(entry.created_at ?? "")}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Vincular chamado</h2>
          <form action={linkSupportTicketAdminAction} className="mt-4 grid gap-3">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <select name="condominium_id" defaultValue={condo?.id ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="">Sem condomínio</option>
              {(condos ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <Input name="user_id" defaultValue={ticket.user_id ?? ""} placeholder="ID do usuário, se necessário" />
            <Input name="note" placeholder="Motivo do vínculo" required />
            <Button type="submit" variant="outline">Vincular</Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Converter em incidente</h2>
          <form action={convertSupportTicketToIncidentAction} className="mt-4 grid gap-3">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <Input name="title" defaultValue={ticket.subject} required />
            <select name="severity" defaultValue="medium" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            <Input name="description" placeholder="Descrição do incidente" required />
            <Button type="submit" variant="outline">Criar incidente</Button>
          </form>
          <div className="mt-4 divide-y">
            {(incidents ?? []).map((incident) => (
              <div key={incident.id} className="py-3 text-sm">
                <Link href="/admin/incidentes" className="font-semibold hover:text-primary">{incident.title}</Link>
                <p className="text-xs text-muted-foreground">{incident.severity} · {incident.status}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Criar pedido de reembolso</h2>
          {condo?.id ? (
            <form action={createPlatformRefundRequestAction} className="mt-4 grid gap-3">
              <input type="hidden" name="condominium_id" value={condo.id} />
              <Input name="amount_cents" type="number" min="1" placeholder="Valor em centavos" required />
              <Input name="provider" placeholder="Gateway" />
              <Input name="reason" defaultValue={`Chamado ${ticket.id}: ${ticket.subject}`} required />
              <Button type="submit" variant="outline">Criar reembolso</Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Vincule um condomínio antes de criar pedido de reembolso.
            </p>
          )}
          <div className="mt-4 divide-y">
            {(refunds ?? []).map((refund) => (
              <div key={refund.id} className="py-3 text-sm">
                <Link href={`/admin/reembolsos/${refund.id}`} className="font-semibold hover:text-primary">
                  {refund.reason}
                </Link>
                <p className="text-xs text-muted-foreground">{refund.status}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {condo?.id ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Notas internas do condomínio</h2>
          <div className="mt-4 divide-y">
            {(notes ?? []).map((note) => (
              <div key={note.id} className="py-3 text-sm">
                <p>{note.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">{note.visibility} · {new Date(note.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
          <form action={createAdminNoteAction} className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <input type="hidden" name="condominium_id" value={condo.id} />
            <Input name="note" placeholder="Nota interna destacada" required />
            <select name="visibility" defaultValue="support" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="support">Suporte</option>
              <option value="internal">Interna geral</option>
              <option value="finance">Financeiro</option>
              <option value="security">Segurança</option>
            </select>
            <Button type="submit">Adicionar nota</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
