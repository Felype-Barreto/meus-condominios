import { AlertTriangle, CreditCard, MessageCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { PlanUsageMeter } from "@/components/plans/PlanUsageMeter";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUsage } from "@/lib/plans";
import { getWhatsAppUsage } from "@/lib/whatsapp";
import { requestCancellationAction, requestRefundAction } from "../actions";

type PlanLimitsRow = {
  max_blocks: number;
  max_total_apartments: number;
  max_admins: number;
  max_syndics: number;
  max_doormen: number;
  max_common_areas: number;
  max_storage_mb: number;
};

export default async function SubscriptionCancellationPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [condoResult, usage, whatsAppUsage, refundsResult, eventsResult, addonsResult] = await Promise.all([
    supabase
      .from("condominiums")
      .select("name, plan, subscription_status, settings, plan_limits(*)")
      .eq("id", condoId)
      .single(),
    getCurrentUsage(condoId),
    getWhatsAppUsage(condoId),
    supabase
      .from("refund_requests")
      .select("id, amount_cents, reason, status, created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("billing_events")
      .select("id, event_type, metadata, created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("communication_addons")
      .select("addon_type, quantity, credits, price_cents, status, valid_until, created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const condo = condoResult.data;
  const joinedLimits = condo?.plan_limits as PlanLimitsRow | PlanLimitsRow[] | null;
  const limits = Array.isArray(joinedLimits) ? joinedLimits[0] : joinedLimits;
  const settings = (condo?.settings ?? {}) as Record<string, unknown>;
  const nextBillingDate = settings.next_billing_date ? String(settings.next_billing_date) : "Não configurada";
  const isCanceled = condo?.subscription_status === "canceled";
  const usedWhatsAppCredits = whatsAppUsage.used_credits ?? whatsAppUsage.used;
  const totalWhatsAppCredits = whatsAppUsage.limit;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Cancelamento e reembolso</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Veja o impacto do cancelamento, registre pedido de reembolso e acompanhe eventos de cobrança sem depender de conversa solta.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Plano atual</h2>
          <p className="mt-2 text-3xl font-semibold capitalize">{condo?.plan ?? "free"}</p>
          <div className="mt-3">
            <StatusBadge tone={isCanceled ? "warning" : "success"}>
              {isCanceled ? "Cancelamento solicitado" : condo?.subscription_status ?? "active"}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Próxima cobrança: {nextBillingDate}</p>
        </Card>

        <Card className="p-5">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Créditos WhatsApp</h2>
          <p className="mt-2 text-3xl font-semibold">
            {usedWhatsAppCredits} / {totalWhatsAppCredits}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Compartilhamento manual não consome crédito. Automação consome conforme canal e provedor.
          </p>
        </Card>

        <Card className="border-amber-200 bg-amber-50 p-5">
          <AlertTriangle className="h-6 w-6 text-amber-700" />
          <h2 className="mt-4 text-lg font-semibold text-amber-950">Antes de cancelar</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            O acesso pago pode permanecer até o fim do ciclo. Depois, recursos acima do plano grátis podem ficar bloqueados.
          </p>
        </Card>
      </div>

      {limits ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Uso que pode ser afetado no downgrade</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PlanUsageMeter label="Blocos" used={usage.blocks} limit={limits.max_blocks} />
            <PlanUsageMeter label="Apartamentos" used={usage.apartments} limit={limits.max_total_apartments} />
            <PlanUsageMeter label="Admins" used={usage.admins} limit={limits.max_admins} />
            <PlanUsageMeter label="Síndicos" used={usage.syndics} limit={limits.max_syndics} />
            <PlanUsageMeter label="Guaritas" used={usage.doormen} limit={limits.max_doormen} />
            <PlanUsageMeter label="Áreas comuns" used={usage.common_areas} limit={limits.max_common_areas} />
            <PlanUsageMeter label="Armazenamento MB" used={usage.storage_mb} limit={limits.max_storage_mb} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Solicitar cancelamento</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Não cancelamos com um clique acidental. Revise o impacto, informe um motivo opcional e digite CANCELAR para confirmar.
          </p>
          <form action={requestCancellationAction} className="mt-5 space-y-4">
            <input type="hidden" name="condominium_id" value={condoId} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reason">Motivo opcional</label>
              <textarea
                id="reason"
                name="reason"
                className="min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Conte rapidamente o motivo. Isso ajuda a melhorar o Meus Condomínios."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmation">Digite CANCELAR</label>
              <Input id="confirmation" name="confirmation" placeholder="CANCELAR" required />
            </div>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Registrar cancelamento
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Solicitar reembolso</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O pedido fica pendente para análise. Pagamento duplicado, erro técnico e prazo de 7 dias podem ter tratamento diferente.
          </p>
          <form action={requestRefundAction} className="mt-5 space-y-4">
            <input type="hidden" name="condominium_id" value={condoId} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="amount_cents">Valor em centavos, se souber</label>
              <Input id="amount_cents" name="amount_cents" inputMode="numeric" placeholder="3990" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="refund_reason">Motivo do reembolso</label>
              <textarea
                id="refund_reason"
                name="reason"
                required
                className="min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Explique o motivo do pedido."
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Enviar pedido</Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Pedidos de reembolso</h2>
          <div className="mt-4 space-y-3">
            {(refundsResult.data ?? []).length ? (
              refundsResult.data?.map((refund) => (
                <div key={refund.id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{refund.amount_cents ? `R$ ${(refund.amount_cents / 100).toFixed(2)}` : "Valor a avaliar"}</strong>
                    <StatusBadge tone={refund.status === "approved" || refund.status === "refunded" ? "success" : "warning"}>
                      {refund.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{refund.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Histórico de cobrança</h2>
          <div className="mt-4 space-y-3">
            {(eventsResult.data ?? []).length ? (
              eventsResult.data?.map((event) => (
                <div key={event.id} className="rounded-lg border bg-background p-3 text-sm">
                  <strong>{event.event_type}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento de cobrança registrado.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Add-ons ativos</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(addonsResult.data ?? []).length ? (
            addonsResult.data?.map((addon) => (
              <div key={`${addon.addon_type}-${addon.created_at}`} className="rounded-lg border bg-background p-3 text-sm">
                <strong>{addon.addon_type}</strong>
                <p className="mt-1 text-muted-foreground">
                  Quantidade: {addon.quantity} · Créditos: {addon.credits}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Status: {addon.status} · Validade: {addon.valid_until ? new Date(addon.valid_until).toLocaleDateString("pt-BR") : "ciclo atual"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum add-on ativo.</p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Dados, retenção e exclusão</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Antes de excluir um condomínio, recomendamos baixar os dados e revisar
          solicitações pendentes. Após cancelamento, alguns dados podem ser
          retidos temporariamente para segurança, cobrança, auditoria, backups e
          obrigações legais.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/app/${condoId}/configuracoes/dados`}>
              Exportar ou solicitar exclusão
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/meus-dados">Meus dados pessoais</Link>
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <Link href={`/app/${condoId}/assinatura`}>Voltar para assinatura</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/politica-de-cancelamento">Ler política pública</Link>
        </Button>
      </div>
    </div>
  );
}
