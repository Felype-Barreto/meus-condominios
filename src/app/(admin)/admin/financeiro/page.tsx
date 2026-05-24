import { AdminBarChart } from "@/components/admin/admin-chart";
import { AdminEmptyState, AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { moneyFromCents } from "@/lib/admin/data";
import { getPlatformFinancialSummary } from "@/lib/admin/financial";

type PageProps = {
  searchParams?: Promise<{
    period?: string;
    plan?: string;
    status?: string;
    gateway?: string;
    condo?: string;
  }>;
};

function getJoinedCondo<T extends { condominiums?: unknown }>(row: T) {
  const value = row.condominiums;
  if (Array.isArray(value)) return value[0] as { name?: string; plan?: string } | undefined;
  return value as { name?: string; plan?: string } | undefined;
}

export default async function AdminFinancePage({ searchParams }: PageProps) {
  await requirePlatformSession([
    "platform_owner",
    "platform_finance",
    "platform_admin",
    "platform_readonly",
  ]);
  const params = (await searchParams) ?? {};
  const summary = await getPlatformFinancialSummary(params);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Financeiro</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Saúde financeira da plataforma. Dados de pagamento sensíveis ficam fora da tela;
          quando o gateway real entrar, faturas e eventos aparecerão aqui com segurança.
        </p>
      </div>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-5" action="/admin/financeiro">
          <select
            name="period"
            defaultValue={summary.filters.period}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="current_month">Mês atual</option>
            <option value="last_3_months">Últimos 3 meses</option>
            <option value="last_6_months">Últimos 6 meses</option>
            <option value="last_12_months">Últimos 12 meses</option>
          </select>
          <select
            name="plan"
            defaultValue={params.plan ?? "all"}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="all">Todos os planos</option>
            <option value="free">Grátis</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="total">Total</option>
          </select>
          <select
            name="status"
            defaultValue={params.status ?? "all"}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="trialing">Trial</option>
            <option value="past_due">Em atraso</option>
            <option value="canceled">Cancelado</option>
            <option value="failed">Cobrança falhou</option>
          </select>
          <select
            name="gateway"
            defaultValue={params.gateway ?? "all"}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="all">Todos gateways</option>
            <option value="mercado_pago">Mercado Pago</option>
            <option value="stripe">Stripe</option>
            <option value="asaas">Asaas</option>
            <option value="manual">Manual</option>
          </select>
          <div className="flex gap-2">
            <Input name="condo" defaultValue={params.condo ?? ""} placeholder="Condomínio" />
            <Button type="submit">Filtrar</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminMetricCard label="MRR" value={summary.formatted.mrr} />
        <AdminMetricCard label="ARR" value={summary.formatted.arr} />
        <AdminMetricCard label="Receita do mês" value={summary.formatted.monthRevenue} />
        <AdminMetricCard label="Receita total" value={summary.formatted.totalRevenue} />
        <AdminMetricCard label="Pagantes" value={summary.metrics.activeSubscriptions} />
        <AdminMetricCard label="Churn" value={`${summary.metrics.churn.toFixed(1)}%`} />
        <AdminMetricCard label="Trial/grátis" value={summary.metrics.freeOrTrial} />
        <AdminMetricCard label="Em atraso" value={summary.metrics.overdueSubscriptions} hint={summary.formatted.defaultAmount} />
        <AdminMetricCard label="Upgrades" value={summary.metrics.upgrades} />
        <AdminMetricCard label="Downgrades" value={summary.metrics.downgrades} />
        <AdminMetricCard label="ARPU" value={summary.formatted.arpu} />
        <AdminMetricCard label="Add-ons" value={summary.formatted.addonRevenue} />
        <AdminMetricCard label="Créditos vendidos" value={summary.metrics.whatsappCreditsSold} />
        <AdminMetricCard label="Reembolsos pendentes" value={summary.metrics.pendingRefundsCount} hint={moneyFromCents(summary.metrics.pendingRefundsAmount)} />
        <AdminMetricCard label="Reembolsos aprovados" value={summary.metrics.approvedRefundsCount} hint={moneyFromCents(summary.metrics.approvedRefundsAmount)} />
        <AdminMetricCard label="Canceladas" value={summary.metrics.canceledSubscriptions} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminBarChart title="Receita por mês" points={summary.charts.revenueByMonth} />
        <AdminBarChart title="MRR nos últimos 12 meses" points={summary.charts.mrrByMonth} />
        <AdminBarChart title="Novos clientes por mês" points={summary.charts.newCustomersByMonth} currency={false} />
        <AdminBarChart title="Cancelamentos por mês" points={summary.charts.cancellationsByMonth} currency={false} />
        <AdminBarChart title="Receita por plano" points={summary.charts.revenueByPlan} />
        <AdminBarChart title="Add-ons por mês" points={summary.charts.addonsByMonth} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Últimas faturas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baseado em eventos de cobrança até existir tabela de faturas do gateway.
            </p>
          </div>
          {summary.tables.latestInvoices.length ? (
            <div className="divide-y">
              {summary.tables.latestInvoices.map((event) => {
                const condo = getJoinedCondo(event);
                return (
                  <div key={event.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold">{condo?.name ?? "Condomínio não vinculado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.event_type} · {event.provider ?? "gateway pendente"} ·{" "}
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{moneyFromCents(event.amount_cents)}</p>
                      <AdminStatus value={event.status ?? "registrado"} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState title="Nenhuma fatura registrada" />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Últimas assinaturas</h2>
          </div>
          {summary.tables.latestSubscriptions.length ? (
            <div className="divide-y">
              {summary.tables.latestSubscriptions.map((condo) => (
                <div key={condo.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">{condo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Plano {condo.plan} · criado em {new Date(condo.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <AdminStatus value={condo.subscription_status} />
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Nenhuma assinatura encontrada" />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Últimas cobranças falhas</h2>
          </div>
          {summary.tables.failedCharges.length ? (
            <div className="divide-y">
              {summary.tables.failedCharges.map((event) => {
                const condo = getJoinedCondo(event);
                return (
                  <div key={event.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold">{condo?.name ?? "Condomínio não vinculado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.provider ?? "gateway pendente"} · {new Date(event.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{moneyFromCents(event.amount_cents)}</p>
                      <AdminStatus value={event.status ?? "failed"} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState title="Nenhuma cobrança falha" />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Reembolsos recentes</h2>
          </div>
          {summary.tables.recentRefunds.length ? (
            <div className="divide-y">
              {summary.tables.recentRefunds.map((refund) => {
                const condo = getJoinedCondo(refund);
                return (
                  <div key={refund.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold">{condo?.name ?? "Condomínio não vinculado"}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {refund.reason} · {refund.provider ?? "sem gateway"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{moneyFromCents(refund.amount_cents)}</p>
                      <AdminStatus value={refund.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState title="Nenhum reembolso recente" />
          )}
        </Card>
      </div>
    </div>
  );
}
