import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, LockKeyhole } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCondominiumCreationEntitlement, plans } from "@/lib/plans";

export default async function AccountSubscriptionPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const entitlement = await getCondominiumCreationEntitlement(user.id);
  const limits = entitlement.limits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Minha conta</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Assinatura</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Plano, limites e uso da sua conta. Esta área não depende de abrir um condomínio.
          </p>
        </div>
        <Button asChild>
          <Link href="/precos">Ver planos</Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CreditCard className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">{entitlement.planLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Status: {entitlement.subscriptionStatus}
            </p>
          </div>
          <StatusBadge tone={entitlement.canCreate ? "success" : "warning"}>
            {entitlement.currentUsage.activeCondominiums}/{limits.condominiums} condomínios
          </StatusBadge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Condomínios</p>
            <strong className="mt-1 block text-2xl">{limits.condominiums}</strong>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Blocos por condomínio</p>
            <strong className="mt-1 block text-2xl">{limits.blocks}</strong>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Apartamentos</p>
            <strong className="mt-1 block text-2xl">{limits.totalApartments}</strong>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Armazenamento</p>
            <strong className="mt-1 block text-2xl">{limits.storageMb} MB</strong>
          </div>
        </div>

        {!entitlement.canCreate ? (
          <p className="mt-4 rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm text-foreground">
            {entitlement.blockedReason}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(plans).map((plan) => {
          const comingSoon = plan.id === "pro" || plan.id === "total";
          const current = plan.id === entitlement.plan;
          const card = (
            <Card className="group h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/55 hover:shadow-xl hover:shadow-primary/10">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {comingSoon ? (
                  <StatusBadge tone="warning">Em breve</StatusBadge>
                ) : current ? (
                  <StatusBadge tone="success">Atual</StatusBadge>
                ) : null}
              </div>
            <p className="mt-2 text-sm text-muted-foreground">{plan.monthlyPrice}{plan.id === "free" ? "" : "/mês"}</p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>{plan.limits.condominiums} condomínio(s)</p>
              <p>{plan.limits.blocks} blocos por condomínio</p>
              <p>{plan.limits.totalApartments} apartamentos</p>
              <p>{plan.limits.storageMb} MB de armazenamento</p>
            </div>
              <div className="mt-5">
                {comingSoon ? (
                  <Button disabled variant="outline" className="w-full">
                    <LockKeyhole className="h-4 w-4" />
                    Em breve
                  </Button>
                ) : plan.id === "free" ? (
                  <Button disabled variant="outline" className="w-full">
                    Plano grátis
                  </Button>
                ) : (
                  <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-[#7C5C3E]/15 transition group-hover:bg-[#5F432C]">
                    Escolher plano
                  </span>
                )}
              </div>
            </Card>
          );

          return comingSoon || plan.id === "free" ? (
            <div key={plan.id}>{card}</div>
          ) : (
            <Link
              key={plan.id}
              href={`/app/assinatura/checkout?plano=${plan.id}`}
              className="block focus-visible:ring-2 focus-visible:ring-ring"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
