import { CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plans, type PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isBuyablePlan(value: string | undefined): value is "premium" {
  return value === "premium";
}

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { plano } = await searchParams;
  const planId: PlanId = isBuyablePlan(plano) ? plano : "premium";
  const plan = plans[planId];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-primary">Assinatura</p>
              <StatusBadge tone="warning">Checkout em preparação</StatusBadge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Comprar plano {plan.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Este será o ponto de compra dos planos. O botão já deixa o fluxo
              preparado para conectar o gateway de pagamento sem mudar a
              navegação depois.
            </p>

            <div className="mt-6 rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Plano selecionado</p>
              <p className="mt-2 text-2xl font-semibold">
                {plan.name} · {plan.monthlyPrice}/mês
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.limits.condominiums} condomínios, {plan.limits.blocks}{" "}
                blocos por condomínio e {plan.limits.totalApartments} apartamentos.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button disabled>Finalizar compra em breve</Button>
              <Button asChild variant="outline">
                <Link href="/app/assinatura">Voltar aos planos</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
