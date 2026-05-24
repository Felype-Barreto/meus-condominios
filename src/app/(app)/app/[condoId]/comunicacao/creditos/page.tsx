import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, MessageCircle, PackagePlus, ShieldCheck, WalletCards } from "lucide-react";
import { CommunicationNav } from "@/components/app/communication-nav";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvailableAddons, getWhatsAppUsage } from "@/lib/whatsapp";
import { purchaseCommunicationAddonMockAction } from "../actions";

type AddonRow = {
  id: string;
  addon_type: string;
  quantity: number;
  credits: number;
  price_cents: number;
  status: string;
  valid_until: string | null;
  created_at: string;
};

type MessageLogRow = {
  id: string;
  target_type: string;
  message_type: string;
  status: string;
  created_at: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function addonLabel(type: string) {
  const labels: Record<string, string> = {
    messages_500: "Pacote 500 mensagens",
    messages_1000: "Pacote 1.000 mensagens",
    messages_5000: "Pacote 5.000 mensagens",
    automatic_multi_groups: "Multi-grupos automatico",
    extra_channel: "Canal extra",
  };

  return labels[type] ?? type;
}

export default async function CommunicationCreditsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, usage, addons, { data: addonRows }, { data: messageLogs }] =
    await Promise.all([
      supabase.from("condominiums").select("name, plan").eq("id", condoId).single(),
      getWhatsAppUsage(condoId),
      getAvailableAddons(condoId),
      supabase
        .from("communication_addons")
        .select("id, addon_type, quantity, credits, price_cents, status, valid_until, created_at")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("whatsapp_message_logs")
        .select("id, target_type, message_type, status, created_at")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const used = Number(usage.used_credits ?? usage.used ?? 0);
  const included = Number(usage.included_credits ?? usage.included ?? 0);
  const addonCredits = Number(usage.addon_credits ?? usage.extra ?? 0);
  const limit = Number(usage.limit ?? included + addonCredits);
  const remaining = Number(usage.remaining ?? 0);
  const percent = Math.min(Number(usage.percent ?? 0), 100);
  const blockedSends = Number(usage.blocked_sends ?? 0);
  const progressTone = usage.blocked ? "bg-destructive" : usage.warn ? "bg-amber-600" : "bg-primary";
  const cycleEnd = format(addDays(new Date(), 30), "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Creditos WhatsApp</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Controle o custo de mensagens automaticas, compre pacotes e mantenha o envio manual
            gratuito quando o plano nao incluir automacao.
          </p>
        </div>
        <StatusBadge tone={usage.manual_only ? "warning" : "success"}>
          {usage.manual_only ? "Manual no plano gratis" : "Automacao habilitada"}
        </StatusBadge>
      </div>

      <CommunicationNav condoId={condoId} />

      {usage.warn ? (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {usage.blocked ? "Limite de WhatsApp atingido" : "Voce ja passou de 80% dos creditos"}
            </p>
            <p className="mt-1 text-sm">
              {usage.blocked
                ? "Envios automaticos foram bloqueados. O compartilhamento manual continua disponivel."
                : "Considere comprar um pacote antes de o saldo acabar."}
            </p>
          </div>
        </Card>
      ) : null}

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <MessageCircle className="h-5 w-5" />
              <p className="text-sm font-semibold">Uso do mes</p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              Voce usou {used} de {limit} mensagens WhatsApp deste mes.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Compartilhamento manual e comunicados dentro do app nao consomem creditos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Inclusas</p>
              <strong className="mt-1 block text-xl">{included}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Add-ons</p>
              <strong className="mt-1 block text-xl">{addonCredits}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Restantes</p>
              <strong className="mt-1 block text-xl">{remaining}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Bloqueios</p>
              <strong className="mt-1 block text-xl">{blockedSends}</strong>
            </div>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${progressTone}`} style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{percent}% usado</span>
          <span>Ciclo atual: {usage.month ?? "mes vigente"}</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Regra de cobranca</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            WhatsApp privado e grupo automatico consomem credito. App interno, copia de mensagem
            e compartilhamento manual nao consomem.
          </p>
        </Card>
        <Card className="p-5">
          <WalletCards className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Renovacao mensal</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Os creditos inclusos voltam conforme o plano todo mes. Pacotes comprados valem ate o
            fim do ciclo atual.
          </p>
        </Card>
        <Card className="p-5">
          <PackagePlus className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Gateway preparado</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A compra abaixo e mock/manual por enquanto, pronta para integrar Stripe, Mercado Pago
            ou Asaas.
          </p>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Comprar add-ons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha um pacote para liberar mais automacoes neste ciclo.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {addons.map((addon) => (
            <Card key={addon.addon_type} className="flex flex-col p-5">
              <div className="flex-1">
                <p className="text-sm font-semibold">{addon.label}</p>
                <p className="mt-3 text-2xl font-semibold">{money(addon.price_cents)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {addon.credits > 0
                    ? `${addon.credits} mensagens extras`
                    : addon.billing_cycle === "monthly"
                      ? "Cobrança mensal"
                      : "Add-on avulso"}
                </p>
              </div>
              <form action={purchaseCommunicationAddonMockAction} className="mt-5">
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="addon_type" value={addon.addon_type} />
                <Button className="w-full min-h-11" type="submit">
                  Comprar
                </Button>
              </form>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Add-ons ativos e historico</h2>
          <div className="mt-4 space-y-3">
            {((addonRows ?? []) as AddonRow[]).length ? (
              ((addonRows ?? []) as AddonRow[]).map((addon) => (
                <div key={addon.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{addonLabel(addon.addon_type)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {addon.credits > 0 ? `${addon.credits} creditos` : `${addon.quantity} unidade`} · {money(addon.price_cents)}
                      </p>
                    </div>
                    <StatusBadge tone={addon.status === "active" ? "success" : "warning"}>
                      {addon.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Validade: {addon.valid_until ? format(new Date(addon.valid_until), "dd/MM/yyyy") : cycleEnd}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum add-on comprado ainda.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Historico recente de WhatsApp</h2>
          <div className="mt-4 space-y-3">
            {((messageLogs ?? []) as MessageLogRow[]).length ? (
              ((messageLogs ?? []) as MessageLogRow[]).map((log) => (
                <div key={log.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{log.message_type}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{log.target_type}</p>
                    </div>
                    <StatusBadge tone={log.status === "sent" ? "success" : log.status === "failed" ? "error" : "warning"}>
                      {log.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
                Nenhum envio automatico registrado recentemente.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
