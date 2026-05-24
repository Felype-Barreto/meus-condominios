import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  DoorOpen,
  Inbox,
  Megaphone,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Demo interativa do Meus Condomínios para condomínios",
  description:
    "Veja o Meus Condomínios funcionando com dados fictícios. Entre como morador, síndico ou guarita e teste a experiência sem criar conta.",
  path: "/demo",
  keywords: [
    "demo sistema para condomínio",
    "app para condomínio",
    "sistema para síndico",
    "software para portaria de condomínio",
  ],
});

const demoProfiles = [
  {
    title: "Entrar como morador",
    href: "/demo/morador",
    icon: UserRound,
    description: "Avisos, agenda, encomendas, solicitação e perfil em experiência mobile.",
  },
  {
    title: "Entrar como síndico",
    href: "/demo/sindico",
    icon: UsersRound,
    description: "Painel administrativo, comunicação, reservas pendentes e relatórios.",
  },
  {
    title: "Entrar como guarita",
    href: "/demo/guarita",
    icon: DoorOpen,
    description: "Busca limitada de apartamento, encomendas, visitantes e ocorrências.",
  },
];

const previewCards = [
  [Megaphone, "Comunicados", "Avisos oficiais com histórico e leitura."],
  [CalendarDays, "Reservas", "Agenda visual para áreas comuns."],
  [Inbox, "Encomendas", "Controle simples para portaria e moradores."],
  [ShieldCheck, "Privacidade", "Dados fictícios, sem acessar informações reais."],
];

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Demo pública</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal md:text-6xl">
            Veja como o Meus Condomínios funciona
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Entre como morador, síndico ou guarita e teste uma experiência fictícia, sem criar
            conta e sem tocar em dados reais.
          </p>
          <div className="mt-8 grid gap-3 sm:max-w-xl">
            {demoProfiles.map(({ title, href, icon: Icon, description }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-20 items-center gap-4 rounded-lg border bg-white p-4 shadow-[0_12px_32px_rgba(17,24,39,0.05)] transition hover:border-[#7C5C3E]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F5EFE6] text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#111827]">{title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {description}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-primary transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Residencial Aurora</p>
              <h2 className="text-xl font-semibold">Experiência fictícia</h2>
            </div>
            <StatusBadge tone="success">Sem login</StatusBadge>
          </div>
          <div className="mt-5 rounded-[1.5rem] border bg-[#F5EFE6] p-4">
            <div className="rounded-[1.2rem] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary">Hoje no condomínio</p>
                  <p className="mt-1 text-lg font-semibold">Tudo em uma tela</p>
                </div>
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 grid gap-3">
                {previewCards.map(([Icon, title, body]) => (
                  <div key={String(title)} className="flex items-start gap-3 rounded-lg border bg-[#FAF7F2] p-3">
                    <Icon className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{String(title)}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{String(body)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Não exige login", "Você pode navegar pela demo sem criar conta."],
          ["Não salva ações", "Botões simulam sucesso apenas para demonstrar o fluxo."],
          ["Dados realistas", "Apartamentos, avisos e eventos são fictícios."],
        ].map(([title, body]) => (
          <Card key={title} className="p-5">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-10 rounded-lg border bg-white p-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Próximo passo</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            Depois da demo, crie seu condomínio grátis.
          </h2>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-0">
          <Button asChild>
            <Link href="/cadastro">Criar meu condomínio grátis</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/precos">Ver planos</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
