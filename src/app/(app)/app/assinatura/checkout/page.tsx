import { CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plans, type PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startPremiumCheckout } from "./actions";

function isBuyablePlan(value: string | undefined): value is "premium" {
  return value === "premium";
}

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; erro?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { plano, erro } = await searchParams;
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
              <StatusBadge tone="success">Pagamento seguro</StatusBadge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Comprar plano {plan.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O pagamento é processado pelo Asaas. O Meus Condomínios não
              armazena dados completos de cartão; a conta Premium só é liberada
              depois da confirmação segura do pagamento.
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

            {erro ? (
              <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {erro === "link"
                  ? "A assinatura foi iniciada, mas o link de pagamento não retornou. Tente novamente em instantes."
                  : decodeURIComponent(erro)}
              </div>
            ) : null}

            <form action={startPremiumCheckout} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Nome completo
                  <input
                    name="name"
                    required
                    minLength={3}
                    autoComplete="name"
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                    placeholder="Nome do responsável"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  CPF ou CNPJ
                  <input
                    name="cpfCnpj"
                    required
                    minLength={11}
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                    placeholder="Somente números"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Telefone
                  <input
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                    placeholder="Opcional"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Forma de pagamento
                  <select
                    name="billingType"
                    defaultValue="UNDEFINED"
                    className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="UNDEFINED">Escolher no Asaas</option>
                    <option value="PIX">Pix</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CREDIT_CARD">Cartão</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit">Ir para pagamento</Button>
                <Button asChild variant="outline">
                  <Link href="/app/assinatura">Voltar aos planos</Link>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
