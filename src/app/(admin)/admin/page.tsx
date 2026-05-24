import Link from "next/link";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { EconomyModeBanner } from "@/components/admin/economy-mode-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminMetrics } from "@/lib/admin/data";
import { getPlatformFinancialSummary } from "@/lib/admin/financial";
import { getEconomyModeSnapshot } from "@/lib/economy-mode";

export default async function AdminHomePage() {
  const [metrics, financial, economySnapshot] = await Promise.all([
    getAdminMetrics(),
    getPlatformFinancialSummary({ period: "current_month" }),
    getEconomyModeSnapshot(),
  ]);
  const openSupport = metrics.support.filter((item) => item.status !== "closed").length;
  const openIncidents = metrics.incidents.filter((item) => item.status !== "resolved").length;
  const pendingDataRequests = metrics.dataRequests.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Operação da plataforma
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Painel interno separado dos condomínios. Use com cuidado: dados sensíveis
          são mascarados por padrão e ações administrativas devem ser registradas.
        </p>
      </div>

      <EconomyModeBanner snapshot={economySnapshot} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="MRR" value={financial.formatted.mrr} />
        <AdminMetricCard label="Receita do mês" value={financial.formatted.monthRevenue} />
        <AdminMetricCard label="Condomínios pagantes" value={financial.metrics.activeSubscriptions} />
        <AdminMetricCard label="Churn" value={`${financial.metrics.churn.toFixed(1)}%`} />
        <AdminMetricCard
          label="Reembolsos pendentes"
          value={financial.metrics.pendingRefundsCount}
          hint={financial.formatted.totalRevenue === "R$ 0,00" ? "sem gateway real" : undefined}
        />
        <AdminMetricCard label="Créditos WhatsApp vendidos" value={financial.metrics.whatsappCreditsSold} />
        <AdminMetricCard label="Condomínios" value={metrics.condominiums.length} />
        <AdminMetricCard label="Usuários" value={metrics.profiles.length} />
        <AdminMetricCard label="Suporte aberto" value={openSupport} />
        <AdminMetricCard label="Incidentes abertos" value={openIncidents} />
        <AdminMetricCard label="Pedidos LGPD pendentes" value={pendingDataRequests} />
        <AdminMetricCard label="WhatsApp usado" value={metrics.whatsappUsed} hint="Créditos registrados" />
        <AdminMetricCard
          label="Free com anúncios"
          value={metrics.freeAdsEnabled}
          hint={metrics.adsenseConfigured ? "AdSense configurado" : "configure NEXT_PUBLIC_ADSENSE_CLIENT_ID"}
        />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Atalhos críticos</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link href="/admin/financeiro">Financeiro</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/suporte">Suporte</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/reembolsos">Reembolsos</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/incidentes">Incidentes</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/lgpd">Pedidos LGPD</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/logs">Logs</Link></Button>
        </div>
      </Card>
    </div>
  );
}
