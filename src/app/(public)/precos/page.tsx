import type { Metadata } from "next";
import { PricingTable } from "@/components/plans/PricingTable";
import { JsonLd } from "@/components/seo/json-ld";
import { createSeoMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Preços do Meus Condomínios para condomínios",
  description:
    "Planos do Meus Condomínios para condomínios: grátis, premium, pro e total, com limites claros para moradores, áreas comuns, portaria e WhatsApp.",
  path: "/precos",
  keywords: ["preço sistema para condomínio", "app para condomínio", "gestão de condomínio online"],
});

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <JsonLd data={softwareApplicationJsonLd()} />
      <p className="text-sm font-semibold text-primary">Preços</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
        Planos claros para condomínios em crescimento.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        Comece grátis e evolua quando atingir limites de operação, portaria,
        relatórios, WhatsApp ou armazenamento.
      </p>
      <div className="mt-10">
        <PricingTable />
      </div>
      <p className="mt-6 max-w-3xl text-xs leading-5 text-muted-foreground">
        Planos possuem limites claros. WhatsApp automático depende de configuração,
        consentimento, créditos disponíveis e regras da plataforma oficial. Recursos
        com anúncios no plano grátis dependem de configuração e consentimento de cookies
        quando aplicável.
      </p>
    </section>
  );
}
