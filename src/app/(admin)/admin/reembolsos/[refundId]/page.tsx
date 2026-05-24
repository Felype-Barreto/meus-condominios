import Link from "next/link";
import {
  createAdminNoteAction,
  createBillingEventAdminAction,
  decideRefundRequestAction,
} from "@/app/(admin)/admin/actions";
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

export default async function AdminRefundDetailPage({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_support",
    "platform_readonly",
  ]);
  const { refundId } = await params;
  const supabase = createAdminSupabase();
  const { data: refund } = await supabase
    .from("refund_requests")
    .select(`
      *,
      condominiums(id,name,slug,plan,subscription_status,created_at,settings),
      profiles!refund_requests_requested_by_fkey(full_name,email,phone)
    `)
    .eq("id", refundId)
    .single();

  if (!refund) {
    return <Card className="p-6">Pedido de reembolso não encontrado.</Card>;
  }

  const condo = joined(refund.condominiums);
  const requester = joined(refund.profiles);
  const condoId = condo?.id ?? refund.condominium_id;
  const [
    { data: billingEvents },
    { data: addons },
    { data: whatsapp },
    { data: usage },
    { data: notes },
  ] = await Promise.all([
    condoId
      ? supabase
          .from("billing_events")
          .select("*")
          .eq("condominium_id", condoId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    condoId
      ? supabase
          .from("communication_addons")
          .select("id,addon_type,credits,price_cents,status,created_at")
          .eq("condominium_id", condoId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    condoId
      ? supabase
          .from("whatsapp_usage")
          .select("month,used_credits,addon_credits,included_credits,blocked_sends")
          .eq("condominium_id", condoId)
          .order("month", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    condoId ? supabase.rpc("get_current_usage", { condo_id: condoId }) : Promise.resolve({ data: {} }),
    condoId
      ? supabase
          .from("admin_notes")
          .select("id,note,visibility,created_by,created_at")
          .eq("condominium_id", condoId)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const whatsappUsed = (whatsapp ?? []).reduce((sum, row) => sum + Number(row.used_credits ?? 0), 0);
  const addonsTotal = (addons ?? []).reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0);
  const billingTotal = (billingEvents ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const usageObject = (usage ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Reembolso</p>
          <h1 className="mt-2 text-3xl font-semibold">{condo?.name ?? "Pedido sem condomínio"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{refund.id}</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/reembolsos">Voltar</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Valor solicitado" value={moneyFromCents(refund.amount_cents)} />
        <AdminMetricCard label="Status" value={refund.status} />
        <AdminMetricCard label="Plano" value={condo?.plan ?? "-"} />
        <AdminMetricCard label="Dentro de 7 dias" value={withinSevenDays(condo?.created_at) ? "Sim" : "Não"} />
        <AdminMetricCard label="Histórico pago" value={moneyFromCents(billingTotal)} />
        <AdminMetricCard label="Add-ons comprados" value={moneyFromCents(addonsTotal)} />
        <AdminMetricCard label="WhatsApp usado" value={whatsappUsed} />
        <AdminMetricCard label="Storage atual" value={`${String(usageObject.storage_mb ?? 0)} MB`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Dados do pedido</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p><strong>Solicitante:</strong> {requester?.full_name ?? maskEmail(requester?.email)}</p>
            <p><strong>Contato mascarado:</strong> {maskEmail(requester?.email)}</p>
            <p><strong>Gateway:</strong> {refund.provider ?? "manual"}</p>
            <p><strong>Pagamento:</strong> {refund.provider_payment_id ? "referência registrada" : "não vinculado"}</p>
            <p><strong>Fatura relacionada:</strong> {refund.invoice_id ?? "não vinculada"}</p>
            <p><strong>Assinatura relacionada:</strong> {refund.subscription_id ?? condo?.id ?? "não vinculada"}</p>
            <p><strong>Motivo do cliente:</strong> {refund.reason}</p>
            <p><strong>Decisão:</strong> {refund.decision_note ?? "Sem decisão registrada"}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Política aplicável</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Direito de arrependimento pode ser aplicável nos primeiros 7 dias da contratação inicial.</p>
            <p>Após esse prazo, avaliar falha comprovada, cobrança duplicada, regra do gateway e política contratada.</p>
            <p>Créditos WhatsApp e add-ons podem ter regra própria. Não prometa estorno automático sem confirmação operacional.</p>
            <p>Quando houver gateway real, esta decisão deve chamar o adapter do provedor antes de marcar como processado.</p>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-semibold">Ações do reembolso</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Toda decisão exige nota. Aprovação parcial deve informar o valor aprovado em centavos.
        </p>
        <form action={decideRefundRequestAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto]">
          <input type="hidden" name="refund_id" value={refund.id} />
          <select name="status" defaultValue={refund.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="pending">Solicitar mais informações</option>
            <option value="approved">Aprovar</option>
            <option value="rejected">Rejeitar</option>
            <option value="processed">Marcar como processado</option>
            <option value="canceled">Cancelar pedido</option>
          </select>
          <Input name="approved_amount_cents" type="number" min="0" placeholder="Valor aprovado parcial" />
          <Input name="decision_note" placeholder="Nota obrigatória da decisão" required />
          <Button type="submit">Registrar</Button>
        </form>
      </Card>

      {condoId ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Gerar evento de billing</h2>
          <form action={createBillingEventAdminAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
            <input type="hidden" name="condominium_id" value={condoId} />
            <Input name="event_type" placeholder="Ex: chargeback_opened" required />
            <Input name="provider" placeholder="Gateway" />
            <Input name="amount_cents" type="number" placeholder="Valor em centavos" />
            <Input name="note" placeholder="Observação do evento" required />
            <Button type="submit" variant="outline">Gerar</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Histórico de pagamento</h2></div>
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
          <div className="border-b p-5"><h2 className="text-xl font-semibold">Add-ons e créditos</h2></div>
          <div className="divide-y">
            {(addons ?? []).map((addon) => (
              <div key={addon.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{addon.addon_type}</p>
                  <p className="text-xs text-muted-foreground">{Number(addon.credits ?? 0)} créditos · {new Date(addon.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p>{moneyFromCents(addon.price_cents)}</p>
                  <AdminStatus value={addon.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {condoId ? (
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
            <input type="hidden" name="condominium_id" value={condoId} />
            <Input name="note" placeholder="Nota interna sobre o reembolso" required />
            <select name="visibility" defaultValue="finance" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="finance">Financeiro</option>
              <option value="internal">Interna geral</option>
              <option value="support">Suporte</option>
              <option value="security">Segurança</option>
            </select>
            <Button type="submit">Adicionar nota</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
