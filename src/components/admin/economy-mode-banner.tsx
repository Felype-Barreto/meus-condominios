import { Gauge, HardDrive, MessageCircle, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { EconomyModeSnapshot } from "@/lib/economy-mode";

function metric(value: number) {
  return value.toLocaleString("pt-BR");
}

export function EconomyModeBanner({ snapshot }: { snapshot: EconomyModeSnapshot }) {
  if (!snapshot.enabled) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <Gauge className="h-4 w-4" />
            Modo econômico ativo
          </div>
          <h2 className="mt-3 text-xl font-semibold">Rodando com limites de infraestrutura gratuita</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
            Recursos de alto custo ficam reduzidos enquanto o Meus Condomínios usa Vercel Hobby e Supabase Free. Isso mantém o app estável sem comprometer RLS, permissões, captcha, rate limit e storage privado.
          </p>
        </div>
        <div className="grid min-w-72 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              Storage estimado
            </p>
            <strong className="mt-1 block">{metric(snapshot.storageUsedMb)} MB</strong>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Server className="h-4 w-4" />
              Banco
            </p>
            <strong className="mt-1 block">{metric(snapshot.databaseRows)} linhas monitoradas</strong>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </p>
            <strong className="mt-1 block">{metric(snapshot.whatsappUsedThisMonth)} créditos no mês</strong>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Alertas de custo</h3>
          <div className="mt-2 space-y-1 text-sm">
            {snapshot.alerts.length ? (
              snapshot.alerts.map((alert) => <p key={alert}>{alert}</p>)
            ) : (
              <p>Nenhum alerta crítico agora.</p>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Recomendação</h3>
          <div className="mt-2 space-y-1 text-sm">
            {snapshot.recommendations.slice(0, 3).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
