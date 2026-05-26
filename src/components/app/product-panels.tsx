import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import {
  onboardingSteps,
  privacySeal,
  quickActionsByRole,
} from "@/lib/product-content";

type RoleKey = keyof typeof quickActionsByRole;

export function OnboardingChecklist({
  condoId,
  completed,
}: {
  condoId: string;
  completed: Record<string, boolean>;
}) {
  const done = onboardingSteps.filter((step) => completed[step.key]).length;
  const percent = Math.round((done / onboardingSteps.length) * 100);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Comece pelo essencial</p>
          <h2 className="mt-1 text-xl font-semibold">Checklist de ativação</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Complete os passos para o condomínio sair da configuração e virar rotina.
          </p>
        </div>
        <StatusBadge tone={percent === 100 ? "success" : "warning"}>{percent}% pronto</StatusBadge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {onboardingSteps.map((step) => {
          const StepIcon = step.icon;
          const checked = completed[step.key];
          return (
            <Link
              key={step.key}
              href={`/app/${condoId}/${step.href}`}
              className="flex min-h-14 items-center gap-3 rounded-lg border bg-background p-3 text-sm hover:bg-muted"
            >
              {checked ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <StepIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">{step.title}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

export function QuickActions({
  condoId,
  role,
}: {
  condoId: string;
  role: string;
}) {
  const normalizedRole = (role in quickActionsByRole ? role : "admin") as RoleKey;
  const actions = quickActionsByRole[normalizedRole];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Ações rápidas</p>
          <h2 className="mt-1 text-xl font-semibold">O que você precisa fazer agora?</h2>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={`/app/${condoId}/${action.href}`}
            className="flex min-h-24 flex-col justify-between rounded-lg border bg-background p-4 hover:bg-muted"
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function PriorityCards({
  items,
}: {
  items: Array<{ label: string; value: number | string; detail: string; tone?: "success" | "warning" | "error" | "neutral" }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <strong className="mt-3 block text-3xl font-semibold">{item.value}</strong>
            </div>
            <StatusBadge tone={item.tone ?? "neutral"}>{item.tone === "warning" ? "Atenção" : "OK"}</StatusBadge>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}

export function PrivacySeal() {
  return (
    <Card className="border-green-200 bg-green-50 p-5">
      <div className="flex gap-3">
        <span className="rounded-lg bg-white p-3 text-success ring-1 ring-green-200">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-green-900">{privacySeal.title}</h2>
          <p className="mt-1 text-sm leading-6 text-green-800">{privacySeal.description}</p>
        </div>
      </div>
    </Card>
  );
}

export function NotificationCenter({
  notifications,
  condoId,
}: {
  condoId: string;
  notifications: Array<{ id: string; title: string; body: string | null; href: string | null; created_at: string; read_at: string | null }>;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Central de notificações</h2>
        <StatusBadge tone="neutral">{notifications.filter((item) => !item.read_at).length} novas</StatusBadge>
      </div>
      <div className="mt-5 space-y-3">
        {notifications.length ? (
          notifications.map((item) => (
            <Link
              key={item.id}
              href={item.href ?? `/app/${condoId}/dashboard`}
              className="block rounded-lg border bg-background p-4 text-sm hover:bg-muted"
            >
              <p className="font-semibold">{item.title}</p>
              {item.body ? <p className="mt-1 text-muted-foreground">{item.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            Sem notificações internas por enquanto.
          </p>
        )}
      </div>
    </Card>
  );
}

export function ActivityTimeline({
  items,
  condoId,
}: {
  condoId: string;
  items: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }>;
}) {
  function label(item: { action: string; entity_type: string }) {
    const actionMap: Record<string, string> = {
      insert: "Criado",
      update: "Atualizado",
      delete: "Excluido",
      create_condominium: "Condominio criado",
      plan_limit_hit: "Limite do plano atingido",
    };
    const entityMap: Record<string, string> = {
      apartments: "apartamento",
      blocks: "bloco",
      memberships: "cadastro",
      bookings: "reserva",
      packages: "encomenda",
      tickets: "solicitacao",
      announcements: "aviso",
      condominiums: "condominio",
    };

    return `${actionMap[item.action] ?? item.action} ${entityMap[item.entity_type] ?? item.entity_type}`;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Últimas atividades</h2>
        <Link href={`/app/${condoId}/historico`} className="text-xs font-semibold text-primary hover:underline">
          Ver histórico
        </Link>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-semibold">{label(item)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            As atividades importantes do condomínio aparecem aqui conforme a rotina acontece.
          </p>
        )}
      </div>
    </Card>
  );
}
