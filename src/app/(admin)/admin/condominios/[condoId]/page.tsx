import Link from "next/link";
import {
  createAdminNoteAction,
  createPlatformRefundRequestAction,
  createPlatformSupportTicketAction,
  updateCondoPlanAdminAction,
  updateCondoSubscriptionStatusAdminAction,
} from "@/app/(admin)/admin/actions";
import { AdminEmptyState, AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveRevealForm } from "@/components/admin/sensitive-reveal-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAdminSupabase, maskEmail, maskPhone, moneyFromCents } from "@/lib/admin/data";

type Usage = Record<string, number | string | boolean | null>;

function profileFrom(row: { profiles?: unknown }) {
  const profile = row.profiles;
  if (Array.isArray(profile)) {
    return profile[0] as { id?: string; full_name?: string; email?: string; phone?: string } | undefined;
  }
  return profile as { id?: string; full_name?: string; email?: string; phone?: string } | undefined;
}

export default async function AdminCondoDetailPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = createAdminSupabase();
  const [
    { data: condo },
    { data: limits },
    { data: usageRpc },
    { data: memberships },
    { data: blocks },
    { data: apartments },
    { data: tickets },
    { data: refunds },
    { data: billingEvents },
    { data: addons },
    { data: whatsapp },
    { data: announcements },
    { data: bookings },
    { data: packages },
    { data: documents },
    { data: incidents },
    { data: abuse },
    { data: qrLogs },
    { data: auditLogs },
    { data: sensitiveLogs },
    { data: dataRequests },
    { data: adminNotes },
  ] = await Promise.all([
    supabase.from("condominiums").select("*").eq("id", condoId).single(),
    supabase.from("plan_limits").select("*"),
    supabase.rpc("get_current_usage", { condo_id: condoId }),
    supabase
      .from("memberships")
      .select("id,role,status,user_id,is_primary_syndic,created_at,profiles(full_name,email,phone)")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("blocks").select("id,name").eq("condominium_id", condoId),
    supabase.from("apartments").select("id,status").eq("condominium_id", condoId),
    supabase
      .from("support_tickets")
      .select("id,status,priority,category,subject,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("refund_requests")
      .select("id,status,amount_cents,reason,provider,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("billing_events")
      .select("id,event_type,provider,status,amount_cents,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("communication_addons")
      .select("id,addon_type,price_cents,credits,status,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("whatsapp_usage")
      .select("*")
      .eq("condominium_id", condoId)
      .order("month", { ascending: false })
      .limit(12),
    supabase.from("announcements").select("id").eq("condominium_id", condoId),
    supabase.from("bookings").select("id,status").eq("condominium_id", condoId),
    supabase.from("packages").select("id,status").eq("condominium_id", condoId),
    supabase.from("documents").select("id").eq("condominium_id", condoId),
    supabase
      .from("security_incidents")
      .select("id,status,severity,title,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("abuse_reports")
      .select("id,status,reason,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("qr_public_access_logs")
      .select("id,result_type,blocked,reason,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("sensitive_access_logs")
      .select("id,target_type,field_accessed,reason,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("data_requests")
      .select("id,request_type,status,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("admin_notes")
      .select("id,note,visibility,created_by,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!condo) {
    return <AdminEmptyState title="Condomínio não encontrado" />;
  }

  const noteAuthors = Array.from(new Set((adminNotes ?? []).map((note) => note.created_by).filter(Boolean))) as string[];
  const { data: noteProfiles } = noteAuthors.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", noteAuthors)
    : { data: [] };
  const noteProfileById = new Map((noteProfiles ?? []).map((profile) => [profile.id, profile]));

  const usage = (usageRpc ?? {}) as Usage;
  const planLimits = (limits ?? []).find((limit) => limit.plan === condo.plan);
  const memberRows = memberships ?? [];
  const owner = memberRows.find((member) => member.role === "subscriber_admin") ?? null;
  const syndic = memberRows.find((member) => member.role === "syndic" || member.is_primary_syndic) ?? null;
  const doormen = memberRows.filter((member) => member.role === "doorman" && member.status === "active").length;
  const residents = memberRows.filter((member) => member.role === "resident" && member.status === "active").length;
  const activeUsers = memberRows.filter((member) => member.status === "active").length;
  const whatsappUsed = (whatsapp ?? []).reduce((sum, row) => sum + Number(row.used_credits ?? 0), 0);
  const whatsappIncluded = (whatsapp ?? []).reduce((sum, row) => Math.max(sum, Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0)), 0);
  const addonRevenue = (addons ?? []).reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0);
  const refundTotal = (refunds ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const billingTotal = (billingEvents ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const qrBlocked = (qrLogs ?? []).filter((log) => log.blocked).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Condomínio</p>
          <h1 className="mt-2 text-3xl font-semibold">{condo.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {condo.slug} · {condo.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/condominios">Voltar</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/logs">Ver logs</Link></Button>
          <Button asChild variant="outline"><Link href={`/app/${condoId}/dashboard`}>Modo suporte limitado</Link></Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Visão geral</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricCard label="Plano" value={condo.plan} />
          <AdminMetricCard label="Assinatura" value={condo.subscription_status} />
          <AdminMetricCard label="Blocos/Aptos" value={`${blocks?.length ?? 0}/${apartments?.length ?? 0}`} />
          <AdminMetricCard label="Usuários ativos" value={activeUsers} />
          <AdminMetricCard label="Moradores" value={residents} />
          <AdminMetricCard label="Guarita/Cancela" value={doormen} />
          <AdminMetricCard label="Síndico" value={profileFrom(syndic ?? {})?.full_name ?? "Não definido"} />
          <AdminMetricCard label="Owner/admin principal" value={profileFrom(owner ?? {})?.full_name ?? "Não definido"} />
        </div>

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Dados sensíveis</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            E-mail e telefone ficam mascarados. Registrar motivo não revela em massa; apenas cria trilha para consulta controlada.
          </p>
          <div className="mt-4">
            <SensitiveRevealForm entityType="condominiums" entityId={condoId} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Ações administrativas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não existe exclusão direta de condomínio nesta tela.
          </p>
          <div className="mt-5 grid gap-4">
            <form action={updateCondoPlanAdminAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="condominium_id" value={condoId} />
              <select name="plan" defaultValue={condo.plan} className="h-11 rounded-lg border bg-card px-3 text-sm">
                <option value="free">Grátis</option>
                <option value="premium">Premium</option>
                <option value="pro">Pro</option>
                <option value="total">Total</option>
              </select>
              <Input name="reason" placeholder="Motivo da alteração de plano" required />
              <Button type="submit" variant="outline">Alterar plano</Button>
            </form>
            <form action={updateCondoSubscriptionStatusAdminAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="condominium_id" value={condoId} />
              <select name="status" defaultValue={condo.subscription_status} className="h-11 rounded-lg border bg-card px-3 text-sm">
                <option value="active">Ativa</option>
                <option value="free">Grátis</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Inadimplente</option>
                <option value="blocked">Bloquear</option>
                <option value="canceled">Cancelada</option>
              </select>
              <Input name="reason" placeholder="Motivo do bloqueio/reativação" required />
              <Button type="submit" variant="outline">Salvar status</Button>
            </form>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Limites e uso</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <p>Apartamentos: <strong>{String(usage.apartments ?? 0)}</strong> / {planLimits?.max_total_apartments ?? "-"}</p>
            <p>Blocos: <strong>{String(usage.blocks ?? 0)}</strong> / {planLimits?.max_blocks ?? "-"}</p>
            <p>Áreas comuns: <strong>{String(usage.common_areas ?? 0)}</strong> / {planLimits?.max_common_areas ?? "-"}</p>
            <p>Storage: <strong>{String(usage.storage_mb ?? 0)} MB</strong> / {planLimits?.max_storage_mb ?? "-"} MB</p>
            <p>WhatsApp: <strong>{whatsappUsed}</strong> / {whatsappIncluded || 0}</p>
            <p>Encomendas/mês: <strong>{String(usage.packages_month ?? 0)}</strong> / {planLimits?.max_packages_per_month ?? "-"}</p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Financeiro</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricCard label="Plano atual" value={condo.plan} />
          <AdminMetricCard label="Pagamentos/eventos" value={moneyFromCents(billingTotal)} />
          <AdminMetricCard label="Reembolsos" value={moneyFromCents(refundTotal)} />
          <AdminMetricCard label="Add-ons" value={moneyFromCents(addonRevenue)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <h3 className="text-lg font-semibold">Eventos financeiros recentes</h3>
            <div className="mt-4 divide-y">
              {(billingEvents ?? []).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{event.event_type}</p>
                    <p className="text-xs text-muted-foreground">{event.provider ?? "sem gateway"} · {new Date(event.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p>{moneyFromCents(event.amount_cents)}</p>
                    <AdminStatus value={event.status ?? "registrado"} />
                  </div>
                </div>
              ))}
              {!(billingEvents ?? []).length ? <p className="py-4 text-sm text-muted-foreground">Sem eventos financeiros reais ainda.</p> : null}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-lg font-semibold">Criar reembolso</h3>
            <form action={createPlatformRefundRequestAction} className="mt-4 grid gap-3">
              <input type="hidden" name="condominium_id" value={condoId} />
              <Input name="amount_cents" type="number" min="1" placeholder="Valor em centavos" required />
              <Input name="provider" placeholder="Gateway, se houver" />
              <Input name="reason" placeholder="Motivo do reembolso" required />
              <Button type="submit">Criar reembolso</Button>
            </form>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Uso</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricCard label="Comunicados" value={announcements?.length ?? 0} />
          <AdminMetricCard label="Reservas" value={bookings?.length ?? 0} />
          <AdminMetricCard label="Encomendas" value={packages?.length ?? 0} />
          <AdminMetricCard label="Solicitações" value={String(usage.tickets_month ?? 0)} />
          <AdminMetricCard label="Documentos" value={documents?.length ?? 0} />
          <AdminMetricCard label="WhatsApp usado" value={whatsappUsed} />
          <AdminMetricCard label="QR bloqueios" value={qrBlocked} />
          <AdminMetricCard label="Storage" value={`${String(usage.storage_mb ?? 0)} MB`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Segurança</h2>
          </div>
          <div className="divide-y">
            {[...(incidents ?? []), ...(abuse ?? [])].slice(0, 12).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{"title" in item ? item.title : item.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <AdminStatus value={item.status} />
              </div>
            ))}
            {!(incidents ?? []).length && !(abuse ?? []).length ? (
              <p className="p-5 text-sm text-muted-foreground">Sem incidentes ou denúncias recentes.</p>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Logs críticos</h2>
          </div>
          <div className="divide-y">
            {[...(sensitiveLogs ?? []), ...(auditLogs ?? [])].slice(0, 14).map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-semibold">{"field_accessed" in log ? log.field_accessed : log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {"target_type" in log ? log.target_type : log.entity_type} · {new Date(log.created_at).toLocaleString("pt-BR")}
                </p>
                {"reason" in log && log.reason ? <p className="mt-1 text-xs text-muted-foreground">Motivo: {log.reason}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Suporte</h2>
          </div>
          <div className="divide-y">
            {(tickets ?? []).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">{ticket.category} · {ticket.priority}</p>
                </div>
                <AdminStatus value={ticket.status} />
              </div>
            ))}
          </div>
          <div className="border-t p-5">
            <h3 className="font-semibold">Abrir chamado interno</h3>
            <form action={createPlatformSupportTicketAction} className="mt-4 grid gap-3">
              <input type="hidden" name="condominium_id" value={condoId} />
              <Input name="subject" placeholder="Assunto" required />
              <Input name="message" placeholder="Resumo do chamado" required />
              <div className="grid gap-2 md:grid-cols-2">
                <select name="category" defaultValue="problema_tecnico" className="h-11 rounded-lg border bg-card px-3 text-sm">
                  <option value="duvida">Dúvida</option>
                  <option value="cobranca">Cobrança</option>
                  <option value="cancelamento">Cancelamento</option>
                  <option value="reembolso">Reembolso</option>
                  <option value="problema_tecnico">Problema técnico</option>
                  <option value="privacidade_lgpd">Privacidade/LGPD</option>
                  <option value="seguranca">Segurança</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
                <select name="priority" defaultValue="normal" className="h-11 rounded-lg border bg-card px-3 text-sm">
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <Button type="submit">Abrir chamado</Button>
            </form>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold">Admin notes</h2>
          </div>
          <div className="divide-y">
            {(adminNotes ?? []).map((note) => {
              const author = noteProfileById.get(note.created_by ?? "");
              return (
                <div key={note.id} className="p-4 text-sm">
                  <p>{note.note}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.visibility} · {author?.full_name ?? maskEmail(author?.email)} · {new Date(note.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="border-t p-5">
            <h3 className="font-semibold">Adicionar nota</h3>
            <form action={createAdminNoteAction} className="mt-4 grid gap-3">
              <input type="hidden" name="condominium_id" value={condoId} />
              <Input name="note" placeholder="Nota interna da equipe Meus Condomínios" required />
              <select name="visibility" defaultValue="internal" className="h-11 rounded-lg border bg-card px-3 text-sm">
                <option value="internal">Interna geral</option>
                <option value="support">Suporte</option>
                <option value="finance">Financeiro</option>
                <option value="security">Segurança</option>
              </select>
              <Button type="submit">Salvar nota</Button>
            </form>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Membros recentes</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Papel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {memberRows.map((member) => {
                  const profile = profileFrom(member);
                  return (
                    <tr key={member.id}>
                      <td className="px-4 py-3">{profile?.full_name ?? "Sem nome"}</td>
                      <td>{maskEmail(profile?.email)}</td>
                      <td>{maskPhone(profile?.phone)}</td>
                      <td>{member.role}</td>
                      <td><AdminStatus value={member.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">LGPD</h2>
        <Card className="divide-y">
          {(dataRequests ?? []).map((request) => (
            <div key={request.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div>
                <p className="font-semibold">{request.request_type}</p>
                <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <AdminStatus value={request.status} />
            </div>
          ))}
          {!(dataRequests ?? []).length ? <p className="p-5 text-sm text-muted-foreground">Sem pedidos LGPD recentes.</p> : null}
        </Card>
      </section>
    </div>
  );
}
