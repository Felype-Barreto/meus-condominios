import { MessageCircle, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import type { WhatsAppPlanLimits, WhatsAppUsageCheck } from "@/lib/whatsapp";

export function WhatsAppUsageCard({
  limits,
  usage,
}: {
  limits: WhatsAppPlanLimits;
  usage: WhatsAppUsageCheck;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-muted p-3 text-primary ring-1 ring-border">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">WhatsApp do plano</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plano atual: {usage.plan}
            </p>
          </div>
        </div>
        <StatusBadge tone={limits.automatic_enabled ? "success" : "neutral"}>
          {limits.automatic_enabled ? "Automático habilitado" : "Manual"}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Usadas no mês</p>
          <strong className="mt-1 block text-2xl font-semibold">{usage.used}</strong>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Limite total</p>
          <strong className="mt-1 block text-2xl font-semibold">{usage.limit}</strong>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Restantes</p>
          <strong className="mt-1 block text-2xl font-semibold">{usage.remaining}</strong>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(usage.percent, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {usage.percent}% do limite mensal utilizado.
        </p>
      </div>

      {usage.warn ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {usage.blocked
            ? "Limite mensal atingido. Compre um pacote ou faça upgrade para liberar envios automáticos."
            : "Uso acima de 80%. Considere comprar um pacote adicional."}
        </div>
      ) : null}
    </Card>
  );
}
