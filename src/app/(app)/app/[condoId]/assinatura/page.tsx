import { CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UpgradeBanner } from "@/components/app/upgrade-banner";
import { PricingTable } from "@/components/plans/PricingTable";
import { PlanLimitAlert } from "@/components/plans/PlanLimitAlert";
import { PlanUsageMeter } from "@/components/plans/PlanUsageMeter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getCostRisk } from "@/lib/cost-control";
import { getCurrentUsage } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWhatsAppUsage } from "@/lib/whatsapp";

type PlanLimitsRow = {
  max_blocks: number;
  max_total_apartments: number;
  max_admins: number;
  max_syndics: number;
  max_doormen: number;
  max_common_areas: number;
  max_bookings_per_month: number;
  max_tickets_per_month: number;
  max_announcements_per_month: number;
  max_packages_per_month: number;
  max_storage_mb: number;
  max_whatsapp_credits_per_month?: number;
  max_communication_channels?: number;
  max_upload_file_mb?: number;
  calendar_advance_days?: number;
  advanced_permissions: boolean;
};

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  if (!access.isAdmin) redirect(`/app/${condoId}/dashboard`);
  const [{ data: condo }, usage, whatsAppUsage, { data: billingEvents }, { data: refunds }, costRisk] = await Promise.all([
    supabase
      .from("condominiums")
      .select("name,plan,subscription_status,settings,plan_limits(*)")
      .eq("id", condoId)
      .single(),
    getCurrentUsage(condoId),
    getWhatsAppUsage(condoId),
    supabase
      .from("billing_events")
      .select("id,event_type,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("refund_requests")
      .select("id,status,reason,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(3),
    getCostRisk(condoId),
  ]);

  const joinedLimits = condo?.plan_limits as PlanLimitsRow | PlanLimitsRow[] | null;
  const limits = Array.isArray(joinedLimits) ? joinedLimits[0] : joinedLimits;
  const isFree = condo?.plan === "free";
  const settings = (condo?.settings ?? {}) as Record<string, unknown>;
  const nextBillingDate = settings.next_billing_date ? String(settings.next_billing_date) : "Não configurada";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Assinatura</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Acompanhe plano, limites, créditos WhatsApp, histórico de cobrança e solicitações de reembolso.
        </p>
      </div>

      {isFree ? (
        <UpgradeBanner
          condoId={condoId}
          title="Plano Grátis ativo"
          description="O plano grátis tem marca Meus Condomínios, anúncios e não permite permissões avançadas."
        />
      ) : null}

      {costRisk.storage.warn70 ? (
        <UpgradeBanner
          condoId={condoId}
          title={costRisk.storage.blocked ? "Armazenamento bloqueado" : "Armazenamento perto do limite"}
          description={`Este condomínio já usou ${costRisk.storage.usedMb} MB de ${costRisk.storage.limitMb} MB. Uploads são bloqueados ao chegar em 100%.`}
        />
      ) : null}

      {costRisk.monthly.some((item) => item.warn80) ? (
        <div className="space-y-3">
          {costRisk.monthly
            .filter((item) => item.warn80)
            .map((item) => (
              <PlanLimitAlert
                key={item.key}
                tone={item.blocked ? "error" : "warning"}
                message={`${item.label}: ${item.used} de ${item.limit} usos no mês. ${item.blocked ? "Novas criações estão bloqueadas até virar o mês ou alterar o plano." : "Ao chegar em 100%, novas criações serão bloqueadas."}`}
              />
            ))}
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Plano atual: {condo?.plan}</h2>
            <p className="text-sm text-muted-foreground">
              Status: {condo?.subscription_status ?? "active"} · Próxima cobrança: {nextBillingDate}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">WhatsApp no mês</p>
            <strong className="mt-1 block text-2xl font-semibold">
              {whatsAppUsage.used_credits ?? whatsAppUsage.used} / {whatsAppUsage.limit}
            </strong>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Reembolsos pendentes</p>
            <strong className="mt-1 block text-2xl font-semibold">
              {(refunds ?? []).filter((item) => item.status === "pending").length}
            </strong>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Eventos de cobrança</p>
            <strong className="mt-1 block text-2xl font-semibold">{billingEvents?.length ?? 0}</strong>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/precos">Alterar plano</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/${condoId}/assinatura/cancelamento`}>Cancelamento e reembolso</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/politica-de-cancelamento">Ler política</Link>
          </Button>
        </div>

        {!limits?.advanced_permissions ? (
          <div className="mt-5">
            <PlanLimitAlert message="Permissões avançadas estão bloqueadas neste plano." />
          </div>
        ) : null}
      </Card>

      {limits ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PlanUsageMeter label="Blocos" used={usage.blocks} limit={limits.max_blocks} />
          <PlanUsageMeter label="Apartamentos" used={usage.apartments} limit={limits.max_total_apartments} />
          <PlanUsageMeter label="Admins" used={usage.admins} limit={limits.max_admins} />
          <PlanUsageMeter label="Síndicos" used={usage.syndics} limit={limits.max_syndics} />
          <PlanUsageMeter label="Guaritas" used={usage.doormen} limit={limits.max_doormen} />
          <PlanUsageMeter label="Áreas comuns" used={usage.common_areas} limit={limits.max_common_areas} />
          <PlanUsageMeter label="Agendamentos no mês" used={usage.bookings_month} limit={limits.max_bookings_per_month} />
          <PlanUsageMeter label="Solicitações no mês" used={usage.tickets_month} limit={limits.max_tickets_per_month} />
          <PlanUsageMeter label="Comunicados no mês" used={usage.announcements_month} limit={limits.max_announcements_per_month} />
          <PlanUsageMeter label="Encomendas no mês" used={usage.packages_month} limit={limits.max_packages_per_month} />
          <PlanUsageMeter label="Armazenamento MB" used={usage.storage_mb} limit={limits.max_storage_mb} />
          <PlanUsageMeter label="Créditos WhatsApp" used={whatsAppUsage.used_credits ?? whatsAppUsage.used ?? 0} limit={limits.max_whatsapp_credits_per_month ?? whatsAppUsage.limit ?? 0} />
          <PlanUsageMeter label="Canais de comunicação" used={0} limit={limits.max_communication_channels ?? 1} />
          <PlanUsageMeter label="Upload por arquivo MB" used={0} limit={limits.max_upload_file_mb ?? 2} />
          <PlanUsageMeter label="Agenda em dias" used={0} limit={limits.calendar_advance_days ?? 60} />
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Comparar planos</h2>
        <PricingTable />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Histórico de pagamentos e eventos</h2>
          <div className="mt-4 space-y-3">
            {(billingEvents ?? []).length ? (
              billingEvents?.map((event) => (
                <div key={event.id} className="rounded-lg border bg-background p-3 text-sm">
                  <strong>{event.event_type}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento de cobrança registrado ainda.</p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Pedidos de reembolso</h2>
          <div className="mt-4 space-y-3">
            {(refunds ?? []).length ? (
              refunds?.map((refund) => (
                <div key={refund.id} className="rounded-lg border bg-background p-3 text-sm">
                  <strong>Status: {refund.status}</strong>
                  <p className="mt-1 text-muted-foreground">{refund.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum pedido de reembolso registrado.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
