import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqSection } from "@/components/public/faq-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { breadcrumbJsonLd, faqJsonLd, type FaqItem } from "@/lib/seo";

export function FeaturePage({
  eyebrow,
  title,
  description,
  icon: Icon,
  path,
  bullets,
  sections,
  faq,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  bullets: string[];
  sections: Array<{ title: string; body: string }>;
  faq: FaqItem[];
}) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Recursos", path: "/recursos" }, { name: title, path }])} />
      <JsonLd data={faqJsonLd(faq)} />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">
                Criar condomínio <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/precos">Ver planos</Link>
            </Button>
          </div>
          <p className="mt-5 max-w-2xl text-xs leading-5 text-muted-foreground">
            Recursos variam por plano e configuração. O Meus Condomínios foi projetado com boas práticas
            de segurança e privacidade, sem substituir responsabilidades legais e operacionais
            do condomínio.
          </p>
        </div>
        <Card className="p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <div className="mt-6 space-y-3">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex gap-3 rounded-lg border bg-background p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
      <FaqSection items={faq} />
    </>
  );
}
