import Link from "next/link";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, moneyFromCents } from "@/lib/admin/data";

type BillingSettings = {
  billing_admin?: {
    cancel_at_period_end?: boolean;
    amount_cents?: number | null;
    updated_at?: string;
  };
};

export default async function AdminSubscriptionsPage() {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_readonly",
  ]);
  const supabase = createAdminSupabase();
  const [{ data: condos }, { data: billingEvents }] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id,name,slug,plan,subscription_status,settings,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("billing_events")
      .select("id,condominium_id,event_type,status,amount_cents,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const rows = condos ?? [];
  const eventByCondo = new Map<string, typeof billingEvents>(
    rows.map((row) => [
      row.id,
      (billingEvents ?? []).filter((event) => event.condominium_id === row.id),
    ]),
  );
  const active = rows.filter((row) => row.subscription_status === "active").length;
  const canceled = rows.filter((row) => row.subscription_status === "canceled").length;
  const overdue = rows.filter((row) => row.subscription_status === "past_due").length;
  const free = rows.filter((row) => row.plan === "free").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Assinaturas e cancelamentos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestão operacional enquanto o gateway real não está integrado. Não exibe dados de cartão.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Ativas" value={active} />
        <AdminMetricCard label="Canceladas" value={canceled} />
        <AdminMetricCard label="Inadimplência" value={overdue} />
        <AdminMetricCard label="Trial/grátis" value={free} />
        <AdminMetricCard label="Free" value={rows.filter((r) => r.plan === "free").length} />
        <AdminMetricCard label="Premium" value={rows.filter((r) => r.plan === "premium").length} />
        <AdminMetricCard label="Pro" value={rows.filter((r) => r.plan === "pro").length} />
        <AdminMetricCard label="Total" value={rows.filter((r) => r.plan === "total").length} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Condomínio</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Próxima cobrança</th>
                <th>Cancelar no fim</th>
                <th>Inadimplência</th>
                <th>Histórico</th>
                <th>Crédito manual</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const settings = (row.settings ?? {}) as BillingSettings;
                const events = eventByCondo.get(row.id) ?? [];
                const manualCredit = events
                  .filter((event) => event.event_type === "apply_manual_credit")
                  .reduce((sum, event) => sum + Number(event.amount_cents ?? 0), 0);
                return (
                  <tr key={row.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link className="font-semibold hover:text-primary" href={`/admin/assinaturas/${row.id}`}>
                        {row.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.slug}</p>
                    </td>
                    <td className="capitalize">{row.plan}</td>
                    <td><AdminStatus value={row.subscription_status} /></td>
                    <td>{settings.billing_admin?.updated_at ? "manual" : "gateway pendente"}</td>
                    <td>{settings.billing_admin?.cancel_at_period_end ? "Sim" : "Não"}</td>
                    <td>{row.subscription_status === "past_due" ? "Sim" : "Não"}</td>
                    <td>{events.length} eventos</td>
                    <td>{moneyFromCents(manualCredit)}</td>
                    <td>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/assinaturas/${row.id}`}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
