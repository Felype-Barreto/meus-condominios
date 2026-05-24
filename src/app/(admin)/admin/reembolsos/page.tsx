import Link from "next/link";
import { createPlatformRefundRequestAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail, moneyFromCents } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function withinSevenDays(date?: string | null) {
  if (!date) return false;
  const diff = Date.now() - new Date(date).getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

export default async function AdminRefundsPage() {
  await requirePlatformSession([
    "platform_owner",
    "platform_finance",
    "platform_admin",
    "platform_support",
    "platform_readonly",
  ]);
  const supabase = createAdminSupabase();
  const [{ data: refunds }, { data: condos }] = await Promise.all([
    supabase
      .from("refund_requests")
      .select(`
        id, condominium_id, requested_by, amount_cents, currency, reason, status,
        provider, provider_payment_id, decision_note, decided_by, decided_at, created_at,
        condominiums(name,plan,subscription_status,created_at),
        profiles!refund_requests_requested_by_fkey(full_name,email)
      `)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.from("condominiums").select("id,name,plan").order("name", { ascending: true }).limit(300),
  ]);
  const rows = refunds ?? [];
  const decidedByIds = Array.from(new Set(rows.map((row) => row.decided_by).filter(Boolean))) as string[];
  const { data: decisionProfiles } = decidedByIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", decidedByIds)
    : { data: [] };
  const decisionById = new Map((decisionProfiles ?? []).map((profile) => [profile.id, profile]));

  const pending = rows.filter((row) => row.status === "pending").length;
  const approved = rows.filter((row) => row.status === "approved" || row.status === "processed").length;
  const requestedTotal = rows.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Reembolsos, estornos e disputas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie pedidos sem expor cartão completo. Integração com gateway fica preparada via eventos manuais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Pendentes" value={pending} />
        <AdminMetricCard label="Aprovados/processados" value={approved} />
        <AdminMetricCard label="Total solicitado" value={moneyFromCents(requestedTotal)} />
        <AdminMetricCard label="Dentro de 7 dias" value={rows.filter((row) => withinSevenDays(joined(row.condominiums)?.created_at)).length} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Criar pedido manual</h2>
        <form action={createPlatformRefundRequestAction} className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto]">
          <select name="condominium_id" className="h-11 rounded-lg border bg-card px-3 text-sm" required>
            <option value="">Condomínio</option>
            {(condos ?? []).map((condo) => (
              <option key={condo.id} value={condo.id}>{condo.name} · {condo.plan}</option>
            ))}
          </select>
          <Input name="amount_cents" type="number" min="1" placeholder="Valor em centavos" required />
          <Input name="provider" placeholder="Gateway" />
          <Input name="reason" placeholder="Motivo do cliente" required />
          <Button type="submit">Criar</Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Condomínio</th>
                <th>Solicitante</th>
                <th>Valor</th>
                <th>Motivo</th>
                <th>Status</th>
                <th>Plano</th>
                <th>Compra</th>
                <th>Solicitação</th>
                <th>7 dias</th>
                <th>Gateway</th>
                <th>Responsável</th>
                <th>Decisão</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((refund) => {
                const condo = joined(refund.condominiums);
                const requester = joined(refund.profiles);
                const decider = decisionById.get(refund.decided_by ?? "");
                return (
                  <tr key={refund.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/admin/reembolsos/${refund.id}`} className="hover:text-primary">
                        {condo?.name ?? refund.condominium_id ?? "Sem condomínio"}
                      </Link>
                    </td>
                    <td>{requester?.full_name ?? maskEmail(requester?.email)}</td>
                    <td>{moneyFromCents(refund.amount_cents)}</td>
                    <td className="max-w-72 truncate">{refund.reason}</td>
                    <td><AdminStatus value={refund.status} /></td>
                    <td className="capitalize">{condo?.plan ?? "-"}</td>
                    <td>{condo?.created_at ? new Date(condo.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                    <td>{new Date(refund.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>{withinSevenDays(condo?.created_at) ? "Sim" : "Não"}</td>
                    <td>{refund.provider ?? "manual"}</td>
                    <td>{decider?.full_name ?? maskEmail(decider?.email)}</td>
                    <td className="max-w-72 truncate">{refund.decision_note ?? "Sem decisão"}</td>
                    <td>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/reembolsos/${refund.id}`}>Abrir</Link>
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
