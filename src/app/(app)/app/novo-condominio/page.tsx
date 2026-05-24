import { Building2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewCondominiumForm } from "@/components/app/new-condominium-form";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCondominiumCreationEntitlement,
  plans,
  type PlanId,
} from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const upgradePath: Record<PlanId, PlanId | null> = {
  free: "premium",
  premium: "pro",
  pro: "total",
  total: null,
};

function LimitReachedCard({
  entitlement,
}: {
  entitlement: NonNullable<
    Awaited<ReturnType<typeof getCondominiumCreationEntitlement>>
  >;
}) {
  const nextPlanId = upgradePath[entitlement.plan];
  const nextPlan = nextPlanId ? plans[nextPlanId] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning ring-1 ring-warning/25">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-primary">Novo condomínio</p>
              <StatusBadge tone="warning">Limite atingido</StatusBadge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Limite de condomínios do plano atingido
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {entitlement.blockedReason ??
                "Sua conta já atingiu o limite de condomínios ativos."}{" "}
              Para criar outro condomínio, atualize o plano da conta.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  Plano atual
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {entitlement.planLabel}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entitlement.currentUsage.activeCondominiums} de{" "}
                  {entitlement.limits.condominiums} condomínio(s) ativo(s)
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  {nextPlan ? "Próximo plano" : "Limite máximo"}
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {nextPlan?.name ?? "Total"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextPlan
                    ? `${nextPlan.limits.condominiums} condomínio(s) por conta`
                    : "Sua conta já está no maior limite disponível."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/app/assinatura">Ver planos e atualizar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/condominios">Voltar para condomínios</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default async function NewCondoPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/entrar");

  const entitlement = await getCondominiumCreationEntitlement(data.user.id);

  if (!entitlement.canCreate) {
    return <LimitReachedCard entitlement={entitlement} />;
  }

  return <NewCondominiumForm entitlement={entitlement} />;
}
