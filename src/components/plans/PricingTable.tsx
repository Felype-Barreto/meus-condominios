import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plans } from "@/lib/plans";

export function PricingTable() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {Object.values(plans).map((plan) => {
        const comingSoon = plan.id === "pro" || plan.id === "total";

        return (
          <Card
            key={plan.id}
            className={
              plan.featured
                ? "border-primary p-6 shadow-[0_16px_40px_rgba(124,92,62,0.12)]"
                : "p-6"
            }
          >
            <div className="mb-4 flex min-h-7 flex-wrap gap-2">
              {plan.featured ? (
                <span className="inline-flex rounded-full bg-[#F1E3D2] px-3 py-1 text-xs font-semibold text-[#5F432C] ring-1 ring-[#E7DCCB]">
                  Mais escolhido
                </span>
              ) : null}
              {comingSoon ? (
                <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Em breve
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">
              {plan.description}
            </p>
            <div className="mt-6">
              <strong className="text-3xl font-semibold">{plan.monthlyPrice}</strong>
              {plan.id !== "free" ? (
                <span className="text-sm text-muted-foreground">/mes</span>
              ) : null}
              {plan.annualPrice ? (
                <p className="mt-1 text-sm text-muted-foreground">{plan.annualPrice}</p>
              ) : null}
            </div>
            {comingSoon ? (
              <Button className="mt-6 w-full" variant="outline" disabled>
                Em breve
              </Button>
            ) : (
              <Button asChild className="mt-6 w-full" variant={plan.featured ? "default" : "outline"}>
                <Link href={plan.id === "free" ? "/cadastro" : "/contato"}>
                  {plan.id === "free" ? "Comecar gratis" : "Escolher plano"}
                </Link>
              </Button>
            )}
            <div className="mt-5 rounded-lg border bg-background p-3 text-sm">
              <p className="font-semibold">{plan.limits.condominiums} condominio(s) por conta</p>
              <p className="mt-1 text-muted-foreground">
                {plan.limits.blocks} blocos por condominio, {plan.limits.totalApartments} apartamentos no total.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex gap-3 text-sm leading-6">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
