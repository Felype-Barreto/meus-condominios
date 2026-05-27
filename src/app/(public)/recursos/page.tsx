import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturePage } from "@/components/public/feature-page";
import { JsonLd } from "@/components/seo/json-ld";
import { Card } from "@/components/ui/card";
import { featurePages } from "@/lib/public-content";
import { createSeoMetadata, itemListJsonLd } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Recursos do Meus Condomínios para gestão de condomínio online",
  description:
    "Conheça recursos do Meus Condomínios para síndicos, moradores, portaria, comunicados, reservas, encomendas e QR Code público.",
  path: "/recursos",
  keywords: ["sistema para condomínio", "app para condomínio", "gestão de condomínio online"],
});

export default function RecursosPage() {
  const main = featurePages["sistema-condominio"];
  const pages = Object.values(featurePages).filter((page) => page.path !== "/recursos");

  return (
    <>
      <JsonLd
        data={itemListJsonLd(
          pages.map((page) => ({
            name: page.title,
            path: page.path,
            description: page.description,
          })),
        )}
      />
      <FeaturePage
        eyebrow="Recursos"
        title={main.title}
        description={main.description}
        icon={main.icon}
        path="/recursos"
        bullets={[...main.bullets]}
        sections={[...main.sections]}
        faq={[...main.faq]}
      />
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-normal">Explore por necessidade</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.path} className="p-5">
              <page.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{page.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p>
              <Link href={page.path} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Ver recurso <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
