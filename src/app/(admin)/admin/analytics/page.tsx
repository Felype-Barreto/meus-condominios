import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp, UsersRound } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase } from "@/lib/admin/data";
import { economyModeConfig, isEconomyMode } from "@/lib/economy-mode";

const planLabels: Record<string, string> = {
  free: "Gratis",
  premium: "Premium",
  pro: "Pro",
  total: "Total",
};

const eventLabels: Record<string, string> = {
  condo_created: "Condominio criado",
  resident_invited: "Morador convidado",
  resident_approved: "Morador aprovado",
  announcement_created: "Aviso criado",
  booking_created: "Reserva criada",
  package_created: "Encomenda registrada",
  ticket_created: "Solicitacao aberta",
  ticket_resolved: "Solicitacao resolvida",
  whatsapp_share_clicked: "WhatsApp manual",
  whatsapp_auto_sent: "WhatsApp automatico",
  communication_channel_created: "Canal criado",
  template_used: "Modelo usado",
  qr_public_accessed: "QR publico usado",
  plan_upgrade_clicked: "Clique em upgrade",
  subscription_started: "Assinatura iniciada",
  subscription_canceled: "Assinatura cancelada",
  refund_requested: "Reembolso solicitado",
  support_ticket_created: "Suporte aberto",
};

const ANALYTICS_SAMPLE_LIMIT = isEconomyMode() ? economyModeConfig.analyticsSampleLimit : 750;

function startDateFor(period: string) {
  const now = Date.now();
  if (period === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now - 90 * 24 * 60 * 60 * 1000);
  if (period === "12m") return new Date(now - 365 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function formatDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function isPaid(plan?: string | null) {
  return ["premium", "pro", "total"].includes(plan ?? "");
}

function lastActivityScore(input: {
  residents: number;
  announcements30: number;
  bookings30: number;
  whatsappErrors30: number;
  supportCritical: number;
}) {
  let score = 0;
  const reasons: string[] = [];
  if (input.residents === 0) {
    score += 3;
    reasons.push("sem moradores ativos");
  }
  if (input.announcements30 === 0) {
    score += 2;
    reasons.push("sem aviso em 30 dias");
  }
  if (input.bookings30 === 0) {
    score += 1;
    reasons.push("sem reservas recentes");
  }
  if (input.whatsappErrors30 >= 3) {
    score += 2;
    reasons.push("muitos erros WhatsApp");
  }
  if (input.supportCritical > 0) {
    score += 3;
    reasons.push("suporte critico aberto");
  }
  return { score, reasons };
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; plan?: string }>;
}) {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_readonly",
  ]);
  const params = await searchParams;
  const period = params.period ?? "30d";
  const planFilter = params.plan ?? "";
  const startDate = startDateFor(period);
  const startIso = startDate.toISOString();
  const last30Iso = startDateFor("30d").toISOString();
  const supabase = createAdminSupabase();

  const [
    { data: condos },
    { data: memberships },
    { data: announcements },
    { data: bookings },
    { data: packages },
    { data: tickets },
    { data: invites },
    { data: qrLogs },
    { data: whatsappLogs },
    { data: channels },
    { data: templates },
    { data: dispatchChannels },
    { data: supportTickets },
    { data: refunds },
    { data: events },
  ] = await Promise.all([
    supabase.from("condominiums").select("id,name,slug,plan,subscription_status,created_at"),
    supabase.from("memberships").select("id,condominium_id,role,status,created_at,updated_at").limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("announcements").select("id,condominium_id,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("bookings").select("id,condominium_id,status,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("packages").select("id,condominium_id,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("tickets").select("id,condominium_id,status,created_at,updated_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("invites").select("id,condominium_id,status,used_at,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("qr_public_access_logs").select("id,condominium_id,blocked,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("whatsapp_message_logs").select("id,condominium_id,status,message_type,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("communication_channels").select("id,condominium_id,type,status,created_at").limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("communication_templates").select("id,condominium_id,created_at").limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("communication_dispatch_channels").select("id,status,estimated_cost_units,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("support_tickets").select("id,condominium_id,status,priority,created_at").limit(ANALYTICS_SAMPLE_LIMIT),
    supabase.from("refund_requests").select("id,condominium_id,status,created_at").gte("created_at", startIso).limit(ANALYTICS_SAMPLE_LIMIT),
    supabase
      .from("product_events")
      .select("id,condominium_id,user_id,event_name,entity_type,metadata,created_at,condominiums(name,plan)")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .limit(ANALYTICS_SAMPLE_LIMIT),
  ]);

  const allCondos = condos ?? [];
  const filteredCondos = planFilter ? allCondos.filter((condo) => condo.plan === planFilter) : allCondos;
  const condoIds = new Set(filteredCondos.map((condo) => condo.id));
  const inPlan = (condoId?: string | null) => !planFilter || (condoId ? condoIds.has(condoId) : false);
  const filteredEvents = (events ?? []).filter((event) => inPlan(event.condominium_id));
  const filteredMemberships = (memberships ?? []).filter((membership) => inPlan(membership.condominium_id));
  const activeMemberships = filteredMemberships.filter((item) => item.status === "active");
  const residentsActive = activeMemberships.filter((item) => item.role === "resident").length;
  const syndicsActive = activeMemberships.filter((item) => item.role === "syndic").length;
  const doormenActive = activeMemberships.filter((item) => item.role === "doorman").length;
  const activeCondos = filteredCondos.filter((condo) => !["canceled", "blocked", "pending_deletion"].includes(condo.subscription_status ?? ""));
  const paidCondos = filteredCondos.filter((condo) => isPaid(condo.plan));
  const freeCondos = filteredCondos.filter((condo) => condo.plan === "free");
  const conversionRate = percent(paidCondos.length, paidCondos.length + freeCondos.length);
  const canceledCondos = filteredCondos.filter((condo) => condo.subscription_status === "canceled").length;
  const churnRate = percent(canceledCondos, filteredCondos.length);

  const eventCount = countBy(filteredEvents, (event) => event.event_name);
  const announcementsCount = (announcements ?? []).filter((item) => inPlan(item.condominium_id)).length || eventCount.announcement_created || 0;
  const bookingsCount = (bookings ?? []).filter((item) => inPlan(item.condominium_id)).length || eventCount.booking_created || 0;
  const packagesCount = (packages ?? []).filter((item) => inPlan(item.condominium_id)).length || eventCount.package_created || 0;
  const ticketRows = (tickets ?? []).filter((item) => inPlan(item.condominium_id));
  const ticketsOpen = ticketRows.filter((item) => !["resolved", "closed"].includes(item.status ?? "")).length;
  const ticketsResolved = ticketRows.filter((item) => ["resolved", "closed"].includes(item.status ?? "")).length || eventCount.ticket_resolved || 0;
  const inviteRows = (invites ?? []).filter((item) => inPlan(item.condominium_id));
  const invitesConverted = inviteRows.filter((item) => item.used_at).length || eventCount.invite_converted || 0;
  const whatsappRows = (whatsappLogs ?? []).filter((item) => inPlan(item.condominium_id));
  const whatsappAuto = whatsappRows.filter((item) => ["sent", "queued", "delivered"].includes(item.status ?? "")).length || eventCount.whatsapp_auto_sent || 0;
  const whatsappManual = eventCount.whatsapp_share_clicked ?? 0;
  const qrUsed = (qrLogs ?? []).filter((item) => inPlan(item.condominium_id)).length || eventCount.qr_public_accessed || 0;
  const channelsConfigured = (channels ?? []).filter((item) => inPlan(item.condominium_id)).length;
  const templatesConfigured = (templates ?? []).filter((item) => inPlan(item.condominium_id)).length;
  const templateUsed = eventCount.template_used ?? 0;
  const demoAccessed = eventCount.demo_accessed ?? 0;
  const dispatchChannelSends = dispatchChannels?.length ?? 0;
  const refundsRequested = (refunds ?? []).filter((item) => inPlan(item.condominium_id)).length || eventCount.refund_requested || 0;

  const condosByDay = countBy(filteredCondos.filter((condo) => condo.created_at >= startIso), (condo) => formatDay(condo.created_at));
  const eventsByDay = countBy(filteredEvents, (event) => formatDay(event.created_at));
  const dayKeys = Array.from(new Set([...Object.keys(condosByDay), ...Object.keys(eventsByDay)])).sort().slice(-14);
  const maxDay = Math.max(1, ...dayKeys.map((day) => (condosByDay[day] ?? 0) + (eventsByDay[day] ?? 0)));
  const byPlan = countBy(filteredCondos, (condo) => condo.plan ?? "free");
  const maxPlan = Math.max(1, ...Object.values(byPlan));
  const topEvents = Object.entries(eventCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxEvent = Math.max(1, ...topEvents.map(([, value]) => value));

  const residentsByCondo = countBy(
    (memberships ?? []).filter((item) => item.role === "resident" && item.status === "active"),
    (item) => item.condominium_id,
  );
  const announcements30 = countBy(
    (announcements ?? []).filter((item) => item.created_at >= last30Iso),
    (item) => item.condominium_id,
  );
  const bookings30 = countBy(
    (bookings ?? []).filter((item) => item.created_at >= last30Iso),
    (item) => item.condominium_id,
  );
  const whatsappErrors30 = countBy(
    (whatsappLogs ?? []).filter((item) => item.created_at >= last30Iso && ["failed", "blocked", "opt_out", "no_consent"].includes(item.status ?? "")),
    (item) => item.condominium_id,
  );
  const criticalSupport = countBy(
    (supportTickets ?? []).filter((item) => ["open", "in_progress"].includes(item.status ?? "") && ["high", "urgent"].includes(item.priority ?? "")),
    (item) => item.condominium_id,
  );
  const atRisk = filteredCondos
    .map((condo) => {
      const risk = lastActivityScore({
        residents: residentsByCondo[condo.id] ?? 0,
        announcements30: announcements30[condo.id] ?? 0,
        bookings30: bookings30[condo.id] ?? 0,
        whatsappErrors30: whatsappErrors30[condo.id] ?? 0,
        supportCritical: criticalSupport[condo.id] ?? 0,
      });
      return { condo, ...risk };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">Analytics de produto</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Uso real do Meus Condomínios, sinais de valor, conversao, churn e clientes em risco sem expor conteudo de mensagens ou dados sensiveis.
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/financeiro">Ver financeiro</Link></Button>
      </div>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select name="period" defaultValue={period} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="12m">12 meses</option>
          </select>
          <select name="plan" defaultValue={planFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os planos</option>
            {Object.entries(planLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Condominios criados" value={filteredCondos.filter((condo) => condo.created_at >= startIso).length} />
        <AdminMetricCard label="Condominios ativos" value={activeCondos.length} />
        <AdminMetricCard label="Usuarios ativos" value={activeMemberships.length} />
        <AdminMetricCard label="Moradores ativos" value={residentsActive} />
        <AdminMetricCard label="Sindicos ativos" value={syndicsActive} />
        <AdminMetricCard label="Guaritas ativas" value={doormenActive} />
        <AdminMetricCard label="Conversao gratis/pago" value={conversionRate} />
        <AdminMetricCard label="Churn operacional" value={churnRate} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Avisos enviados" value={announcementsCount} />
        <AdminMetricCard label="Reservas criadas" value={bookingsCount} />
        <AdminMetricCard label="Encomendas" value={packagesCount} />
        <AdminMetricCard label="Solicitacoes abertas" value={ticketsOpen} />
        <AdminMetricCard label="Solicitacoes resolvidas" value={ticketsResolved} />
        <AdminMetricCard label="QR publico usado" value={qrUsed} />
        <AdminMetricCard label="Convites enviados" value={inviteRows.length} />
        <AdminMetricCard label="Convites convertidos" value={invitesConverted} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="WhatsApp manual" value={whatsappManual} />
        <AdminMetricCard label="WhatsApp automatico" value={whatsappAuto} />
        <AdminMetricCard label="Canais configurados" value={channelsConfigured} />
        <AdminMetricCard label="Templates criados" value={templatesConfigured} />
        <AdminMetricCard label="Templates usados" value={templateUsed} />
        <AdminMetricCard label="Demo acessada" value={demoAccessed} />
        <AdminMetricCard label="Disparos por canal" value={dispatchChannelSends} />
        <AdminMetricCard label="Reembolsos pedidos" value={refundsRequested} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Movimento recente</h2>
          </div>
          <div className="mt-5 space-y-4">
            {dayKeys.map((day) => {
              const value = (condosByDay[day] ?? 0) + (eventsByDay[day] ?? 0);
              return (
                <div key={day} className="grid grid-cols-[92px_1fr_44px] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{new Date(`${day}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  <MiniBar value={value} max={maxDay} />
                  <strong className="text-right">{value}</strong>
                </div>
              );
            })}
            {!dayKeys.length ? <p className="text-sm text-muted-foreground">Sem eventos no periodo filtrado.</p> : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Distribuicao por plano</h2>
          </div>
          <div className="mt-5 space-y-4">
            {Object.entries(planLabels).map(([plan, label]) => (
              <div key={plan} className="grid grid-cols-[92px_1fr_44px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <MiniBar value={byPlan[plan] ?? 0} max={maxPlan} />
                <strong className="text-right">{byPlan[plan] ?? 0}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Eventos mais frequentes</h2>
          </div>
          <div className="mt-5 space-y-4">
            {topEvents.map(([eventName, value]) => (
              <div key={eventName} className="grid grid-cols-[160px_1fr_48px] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{eventLabels[eventName] ?? eventName}</span>
                <MiniBar value={value} max={maxEvent} />
                <strong className="text-right">{value}</strong>
              </div>
            ))}
            {!topEvents.length ? <p className="text-sm text-muted-foreground">Sem eventos de produto ainda.</p> : null}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold">Clientes em risco</h2>
            </div>
          </div>
          <div className="divide-y">
            {atRisk.map(({ condo, score, reasons }) => (
              <div key={condo.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <Link href={`/admin/condominios/${condo.id}`} className="font-semibold hover:text-primary">{condo.name}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{reasons.join(", ")}</p>
                </div>
                <AdminStatus value={`risco ${score}`} />
              </div>
            ))}
            {!atRisk.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum cliente em risco no filtro atual.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Eventos recentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Metadados sao minimos e nao incluem corpo de mensagens, telefones, tokens ou conteudo sensivel.
          </p>
        </div>
        <div className="divide-y">
          {filteredEvents.slice(0, 40).map((event) => {
            const condo = Array.isArray(event.condominiums) ? event.condominiums[0] : event.condominiums;
            return (
              <div key={event.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{eventLabels[event.event_name] ?? event.event_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {condo?.name ?? "Sem condominio"} - {event.entity_type ?? "evento"} - {new Date(event.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <AdminStatus value={event.event_name} />
              </div>
            );
          })}
          {!filteredEvents.length ? <p className="p-5 text-sm text-muted-foreground">Sem eventos recentes para o filtro atual.</p> : null}
        </div>
      </Card>
    </div>
  );
}
