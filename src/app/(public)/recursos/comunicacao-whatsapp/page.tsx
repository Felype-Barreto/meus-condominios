import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { breadcrumbJsonLd, createSeoMetadata, faqJsonLd } from "@/lib/seo";

const path = "/recursos/comunicacao-whatsapp";

export const metadata: Metadata = createSeoMetadata({
  title: "Comunicação de condomínio com WhatsApp e app organizado | Meus Condomínios",
  description:
    "Organize comunicados, grupos de WhatsApp, avisos por bloco, reservas, encomendas e solicitações em um só lugar com o Meus Condomínios.",
  path,
  keywords: [
    "comunicação de condomínio com WhatsApp",
    "grupos de WhatsApp condomínio",
    "comunicados para condomínio",
    "app para condomínio com WhatsApp",
    "sistema para síndico WhatsApp",
  ],
});

const faq = [
  {
    question: "O Meus Condomínios substitui o WhatsApp do condomínio?",
    answer:
      "Não precisa substituir. O Meus Condomínios organiza a comunicação oficial e ajuda o síndico a usar WhatsApp com mais controle, histórico e cuidado com privacidade.",
  },
  {
    question: "Dá para enviar avisos por bloco?",
    answer:
      "Sim. A Central de Comunicação foi pensada para canais como grupo geral, blocos, portaria, garagem, conselho e moradores.",
  },
  {
    question: "Mensagens privadas podem ir para grupos?",
    answer:
      "O Meus Condomínios ajuda a evitar esse erro. Encomendas, visitantes, reclamações e dados pessoais devem ficar em canais privados.",
  },
  {
    question: "Existe confirmação de leitura?",
    answer:
      "Sim. O Meus Condomínios registra leitura no app e oferece relatórios de alcance conforme o plano contratado.",
  },
];

const problems = [
  "Comunicado importante some no meio das conversas",
  "Reserva de salão vira confusão",
  "Encomenda fica sem controle",
  "Morador diz que não viu o aviso",
  "Síndico precisa repetir a mesma mensagem várias vezes",
  "Dados pessoais podem ser expostos sem querer",
];

const solutionItems = [
  ["App interno", "Avisos oficiais ficam organizados e com histórico."],
  ["WhatsApp privado", "Mensagens individuais podem seguir para quem permitiu contato."],
  ["Grupos por bloco", "Bloco A, Bloco B e outros canais recebem só o que faz sentido."],
  ["Grupo geral", "Comunicados importantes podem ser compartilhados sem virar bagunça."],
  ["Portaria", "A equipe recebe orientações sem acessar dados desnecessários."],
  ["Modelos prontos", "Falta de água, assembleia, manutenção e segurança em poucos cliques."],
  ["Logs de envio", "O síndico acompanha o que foi enviado e por onde."],
  ["Confirmação de leitura", "Relatórios ajudam a acompanhar alcance e visualização no app."],
];

const groups = ["Grupo Geral", "Bloco A", "Bloco B", "Portaria", "Garagem", "Conselho"];

const securityItems = [
  "Telefone oculto por padrão",
  "Mensagens privadas não vão para grupo",
  "Encomendas não expõem nome",
  "Reclamações ficam privadas",
  "QR Code com privacidade",
  "Permissões por cargo",
];

const comparisonRows = [
  ["Conversa se perde", "Comunicação organizada"],
  ["Sem calendário", "Calendário de reservas"],
  ["Sem histórico", "Histórico por comunicado"],
  ["Sem relatórios", "Leitura por apartamento"],
  ["Sem controle de permissão", "Canais por bloco"],
  ["Sem regra por tipo de mensagem", "Alertas contra envio indevido"],
];

const plans = [
  ["Grátis", "Compartilhar manualmente", "Comece organizando avisos e copiando mensagens prontas."],
  ["Premium", "WhatsApp manual", "Mesma base simples do gratuito, sem anuncios no painel."],
  ["Pro", "Canais avançados", "Relatórios por canal, resumos e segmentação mais completa."],
  ["Total", "Multi-grupos conforme elegibilidade", "Para condomínios com vários canais, respeitando configuração e regras oficiais."],
];

function PhoneMock() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-[#E7DCCB] bg-[#111827] p-3 shadow-2xl shadow-[#7C5C3E]/15">
      <div className="rounded-[1.5rem] bg-[#F5EFE6] p-4">
        <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold text-[#7C5C3E]">Central de Comunicação</p>
            <p className="text-sm font-semibold text-[#111827]">Aviso de manutenção</p>
          </div>
          <MessageCircle className="h-5 w-5 text-[#7C5C3E]" />
        </div>
        <div className="mt-4 space-y-3">
          {[
            ["App Meus Condomínios", "Recomendado", "success"],
            ["Grupo Bloco A", "Manual seguro", "warning"],
            ["WhatsApp privado", "Pro em breve", "neutral"],
          ].map(([name, status, tone]) => (
            <div key={name} className="rounded-lg border border-[#E7DCCB] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#111827]">{name}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    tone === "success"
                      ? "bg-green-50 text-green-700"
                      : tone === "warning"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-[#F5EFE6] text-[#4B5563]"
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#F5EFE6]">
                <div className="h-2 rounded-full bg-[#7C5C3E]" style={{ width: name === "App Meus Condomínios" ? "86%" : "54%" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-[#7C5C3E] p-3 text-white">
          <p className="text-xs font-semibold">Prévia segura para grupo</p>
          <p className="mt-1 text-xs leading-5 text-white/85">
            Haverá manutenção no abastecimento amanhã. Detalhes individuais ficam no Meus Condomínios.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppCommunicationFeaturePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Recursos", path: "/recursos" }, { name: "Comunicação com WhatsApp", path }])} />
      <JsonLd data={faqJsonLd(faq)} />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-primary">Comunicação com WhatsApp</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal md:text-6xl">
            Seu condomínio pode continuar usando WhatsApp. Só não precisa depender só dele.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            O Meus Condomínios organiza a comunicação do condomínio, centraliza avisos importantes e ajuda o
            síndico a enviar mensagens para os canais certos: app, moradores, blocos, portaria e
            grupos de WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">
                Criar condomínio grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/precos">Ver planos</Link>
            </Button>
          </div>
        </div>
        <PhoneMock />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-normal">No grupo de WhatsApp, tudo se perde</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <Card key={problem} className="p-5">
                <ClipboardList className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-medium leading-6">{problem}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">Escreva uma vez. O Meus Condomínios organiza o envio.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            A Central de Comunicação sugere os canais certos, separa o que é privado do que pode
            ir para grupo e mantém histórico para o síndico consultar depois.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {solutionItems.map(([title, body]) => (
            <Card key={title} className="p-5">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">Ideal para condomínios com vários grupos</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Muitos condomínios já têm grupos por bloco, garagem, portaria e conselho. O Meus Condomínios
              ajuda a decidir onde cada mensagem deve aparecer.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group} className="flex min-h-14 items-center gap-3 rounded-lg border bg-background p-4">
                <UsersRound className="h-5 w-5 text-primary" />
                <span className="font-semibold">{group}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">Sem expor dados dos moradores</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O Meus Condomínios ajuda a evitar que uma mensagem sensível vá parar em grupo. Telefone fica
              oculto por padrão e cada perfil acessa apenas o que faz sentido para sua função.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {securityItems.map((item) => (
              <Card key={item} className="p-5">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold">{item}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-normal">WhatsApp sozinho vs Meus Condomínios + WhatsApp</h2>
          <div className="mt-8 overflow-hidden rounded-lg border bg-white">
            <div className="grid grid-cols-2 border-b bg-[#F5EFE6] text-sm font-semibold">
              <div className="p-4">WhatsApp sozinho</div>
              <div className="border-l p-4">Meus Condomínios + WhatsApp</div>
            </div>
            {comparisonRows.map(([alone, morai]) => (
              <div key={alone} className="grid grid-cols-2 border-b last:border-b-0">
                <div className="p-4 text-sm text-muted-foreground">{alone}</div>
                <div className="border-l p-4 text-sm font-medium">{morai}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">Planos para cada fase do condomínio</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Comece manual e evolua para automação, relatórios e multi-grupos quando fizer sentido.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/precos">Comparar planos</Link>
          </Button>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">
          Integrações automáticas com WhatsApp dependem de configuração, opt-in, créditos e regras
          da plataforma oficial. Grupos automáticos dependem de disponibilidade ou elegibilidade.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map(([name, headline, body]) => (
            <Card key={name} className="p-5">
              <p className="text-sm font-semibold text-primary">{name}</p>
              <h3 className="mt-3 text-xl font-semibold">{headline}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="grid gap-6 border-[#E7DCCB] bg-white p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">Comece hoje</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Comece grátis e organize a comunicação do seu condomínio hoje.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Traga os avisos importantes para um lugar organizado, sem abandonar os canais que os
              moradores já usam.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar condomínio grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/recursos">Ver outros recursos</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
