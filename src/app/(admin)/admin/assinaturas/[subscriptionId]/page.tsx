import Link from "next/link";
import {
  createAdminNoteAction,
  createBillingEventAdminAction,
  updateSubscriptionAdminAction,
} from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, moneyFromCents } from "@/lib/admin/data";

type BillingSettings = {
  billing_admin?: {
    action?: string;
    note?: string;
    amount_cents?: number | null;
    cancel_at_period_end?: boolean;
    updated_by?: string;
    updated_at?: string;
  };
};

export default async function AdminSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_readonly",
  ]);
  const { subscriptionId } = await params;
  const supabase = createAdminSupabase();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("id,name,slug,plan,subscription_status,settings,created_at")
    .eq("id", subscriptionId)
    .single();

  if (!condo) {
    return <Card className="p-6">Assinatura não encontrada.</Card>;
  }

  const [{ data: billingEvents }, { data: refunds }, { data: addons }, { data: notes }, { data: usage }] =
    await Promise.all([
      supabase
        .from("billing_events")
        .select("*")
        .eq("condominium_id", condo.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("refund_requests")
        .select("id,status,amount_cents,reason,created_at")
        .eq("condominium_id", condo.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("communication_addons")
        .select("id,addon_type,status,price_cents,credits,created_at")
        .eq("condominium_id", condo.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("admin_notes")
        .select("id,note,visibility,created_at")
        .eq("condominium_id", condo.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("get_current_usage", { condo_id: condo.id }),
    ]);

  const settings = (condo.settings ?? {}) as BillingSettings;
  const billingTotal = (billingEvents ?? []).reduce((sum, event) => sum + Number(event.amount_cents ?? 0), 0);
  const refundTotal = (refunds ?? []).reduce((sum, refund) => sum + Number(refund.amount_cents ?? 0), 0);
  const addonsTotal = (addons ?? []).reduce((sum, addon) => sum + Number(addon.price_cents ?? 0), 0);
  const usageObject = (usage ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Assinatura</p>
          <h1 className="mt-2 text-3xl font-semibold">{condo.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {condo.slug} · assinatura operacional baseada no condomínio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/assinaturas">Voltar</Link></Button>
          <Button asChild variant="outline"><Link href={`/admin/condominios/${condo.id}`}>Condomínio</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Plano" value={condo.plan} />
        <AdminMetricCard label="Status" value={condo.subscription_status} />
        <AdminMetricCard label="Cancel no fim" value={settings.billing_admin?.cancel_at_period_end ? "Sim" : "Não"} />
        <AdminMetricCard label="Próxima cobrança" value="gateway pendente" />
        <AdminMetricCard label="Receita registrada" value={moneyFromCents(billingTotal)} />
        <AdminMetricCard label="Reembolsos" value={moneyFromCents(refundTotal)} />
        <AdminMetricCard label="Add-ons" value={moneyFromCents(addonsTotal)} />
        <AdminMetricCard label="Storage" value={`${String(usageObject.storage_mb ?? 0)} MB`} />
      </div>

      <Card className="p-5 border-amber-200 bg-amber-50/50">
        <h2 className="text-lg font-semibold">Impacto do cancelamento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cancelar imediatamente pode bloquear recursos pagos, automações, limites adicionais,
          créditos e add-ons. Cancelar ao fim do período mantém acesso até o encerramento manual
          do ciclo configurado. Não há exclusão automática de dados nesta ação.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Ações da assinatura</h2>
        <form action={updateSubscriptionAdminAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
          <input type="hidden" name="condominium_id" value={condo.id} />
          <select name="action" className="h-11 rounded-lg border bg-card px-3 text-sm" required>
            <option value="cancel_at_period_end">Cancelar ao fim do período</option>
            <option value="cancel_immediately">Cancelar imediatamente</option>
            <option value="reactivate">Reativar</option>
            <option value="change_plan">Alterar plano manualmente</option>
            <option value="apply_manual_credit">Aplicar crédito manual</option>
          </select>
          <select name="plan" defaultValue={condo.plan} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Manter plano</option>
            <option value="free">Grátis</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="total">Total</option>
          </select>
          <Input name="amount_cents" type="number" placeholder="Crédito em centavos" />
          <Input name="note" placeholder="Nota obrigatória e impacto da ação" required />
          <Button type="submit">Confirmar</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Gerar evento de billing</h2>
        <form action={createBillingEventAdminAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
          <input type="hidden" name="condominium_id" value={condo.id} />
          <Input name="event_type" placeholder="Ex: payment_failed" required />
          <Input name="provider" placeholder="Gateway" />
          <Input name="amount_cents" type="number" placeholder="Valor em centavos" />
          <Input name="note" placeholder="Observação do evento" required />
          <Button type="submit" variant="outline">Gerar</Button>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Histórico de cobrança</h2></div>
          <div className="divide-y">
            {(billingEvents ?? []).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{event.event_type}</p>
                  <p className="text-xs text-muted-foreground">{event.provider ?? "manual"} · {new Date(event.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p>{moneyFromCents(event.amount_cents)}</p>
                  <AdminStatus value={event.status ?? "registrado"} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Reembolsos</h2></div>
          <div className="divide-y">
            {(refunds ?? []).map((refund) => (
              <div key={refund.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <Link href={`/admin/reembolsos/${refund.id}`} className="font-semibold hover:text-primary">
                    {refund.reason}
                  </Link>
                  <p className="text-xs text-muted-foreground">{new Date(refund.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p>{moneyFromCents(refund.amount_cents)}</p>
                  <AdminStatus value={refund.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Notas internas</h2>
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
          <Input name="note" placeholder="Nota interna da assinatura" required />
          <select name="visibility" defaultValue="finance" className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="finance">Financeiro</option>
            <option value="internal">Interna geral</option>
            <option value="support">Suporte</option>
            <option value="security">Segurança</option>
          </select>
          <Button type="submit">Adicionar nota</Button>
        </form>
      </Card>
    </div>
  );
}
