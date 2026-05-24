import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export function ArticlePage({
  title,
  description,
  path,
  keyword,
  date,
}: {
  title: string;
  description: string;
  path: string;
  keyword: string;
  date: string;
}) {
  const sections = [
    {
      title: `Por que ${keyword} precisa ser simples`,
      body: "Condomínios têm rotinas recorrentes e pessoas com diferentes níveis de familiaridade digital. Um sistema bom reduz passos, deixa responsabilidades claras e evita que informações importantes fiquem espalhadas em conversas, planilhas ou papéis.",
    },
    {
      title: "O que observar antes de contratar",
      body: "Verifique se há controle por papéis, histórico de ações, política de privacidade, suporte a celular, convites seguros e regras no backend. A interface ajuda, mas segurança não pode depender apenas do frontend.",
    },
    {
      title: "Como o Meus Condomínios aborda o problema",
      body: "O Meus Condomínios organiza dados por condomínio, usa permissões por perfil e mantém fluxos claros para moradores, síndicos, administradores e guarita. A ideia é apoiar a rotina sem prometer automação milagrosa.",
    },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Blog", path: "/blog" }, { name: title, path }])} />
      <JsonLd data={articleJsonLd({ title, description, path, datePublished: date })} />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-primary">Blog Meus Condomínios</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal md:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm text-muted-foreground">Atualizado em 19 de maio de 2026.</p>

        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <Card key={section.title} className="p-6">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-green-200 bg-green-50 p-6">
          <h2 className="text-xl font-semibold text-green-900">Checklist prático</h2>
          <div className="mt-4 space-y-3">
            {[
              "Funciona bem no celular para moradores e portaria.",
              "Possui permissões claras para síndico, admin e guarita.",
              "Evita expor telefone, visitante e dados de apartamento sem necessidade.",
              "Registra ações sensíveis em auditoria.",
            ].map((item) => (
              <div key={item} className="flex gap-3 text-sm text-green-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/cadastro">
              Testar o Meus Condomínios <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/recursos">Ver recursos</Link>
          </Button>
        </div>
      </article>
    </>
  );
}
