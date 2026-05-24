import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Files,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { breadcrumbJsonLd, createSeoMetadata, faqJsonLd } from "@/lib/seo";

const path = "/comparativo/whatsapp-condominio";

export const metadata: Metadata = createSeoMetadata({
  title: "WhatsApp para condomínio: quando ele não é suficiente | Meus Condomínios",
  description:
    "Veja por que grupos de WhatsApp ajudam na conversa, mas não substituem um sistema para comunicados, reservas, encomendas e solicitações do condomínio.",
  path,
  keywords: [
    "WhatsApp para condomínio",
    "grupo de WhatsApp condomínio",
    "sistema para condomínio com WhatsApp",
    "comunicados de condomínio",
    "app para síndico",
  ],
});

const whatsAppStrengths = [
  "Conversa rápida entre moradores e administração",
  "Avisos simples do dia a dia",
  "Contato emergencial quando algo precisa de atenção imediata",
  "Grupos por bloco, portaria, garagem ou conselho",
];

const whatsAppLimits = [
  "Histórico perdido no meio das conversas",
  "Reservas de salão e áreas comuns ficam confusas",
  "Falta de confirmação organizada por apartamento",
  "Excesso de mensagens e notificações",
  "Dados pessoais podem aparecer onde não deveriam",
  "Síndico fica sobrecarregado respondendo a mesma coisa",
  "A mesma mensagem precisa ser repetida em vários grupos",
];

const moraiComplements = [
  ["Comunicados", "Centraliza avisos oficiais com histórico e leitura."],
  ["Agendamentos", "Organiza reservas, horários e aprovações."],
  ["Encomendas", "Registra chegada, retirada e responsáveis."],
  ["Solicitações", "Mantém reclamações, sugestões e pedidos no lugar certo."],
  ["Permissões", "Cada cargo vê apenas o que precisa."],
  ["Canais certos", "Ajuda a decidir entre app, WhatsApp privado, bloco ou grupo geral."],
  ["Histórico", "Tudo fica consultável depois, sem depender de rolagem no grupo."],
  ["Cuidados de privacidade", "Ajuda a evitar dados sensíveis em canais abertos."],
];

const comparisonRows = [
  ["Comunicado com histórico", "Some no grupo com o tempo", "Fica registrado e fácil de consultar"],
  ["Confirmação por apartamento", "Depende de resposta manual", "Mostra leitura e alcance no app"],
  ["Calendário de reservas", "Vira conversa solta", "Tem agenda visual, status e conflitos"],
  ["Encomendas", "Avisos se misturam", "Controle de chegada e retirada"],
  ["Reclamações privadas", "Podem expor pessoas", "Ficam em canal reservado"],
  ["QR Code com privacidade", "Não resolve sozinho", "Visitante pede contato sem listar dados"],
  ["Permissões", "Todos no grupo veem tudo", "Acesso por papel: admin, síndico, guarita e morador"],
  ["Relatórios", "Não há visão organizada", "Mostra alcance, leitura e pendências"],
  ["Múltiplos grupos", "Exige repetição manual", "Sugere canais corretos por tipo de mensagem"],
  ["Cuidados de dados", "Depende do cuidado de cada envio", "Ajuda a bloquear mensagens sensíveis em grupos"],
];

const faq = [
  {
    question: "O Meus Condomínios substitui o grupo de WhatsApp do condomínio?",
    answer:
      "Não. O Meus Condomínios complementa o WhatsApp, organizando comunicados, reservas, encomendas, solicitações e histórico oficial.",
  },
  {
    question: "Ainda dá para compartilhar mensagens no WhatsApp?",
    answer:
      "Sim. O Meus Condomínios pode gerar textos prontos para copiar, compartilhar manualmente ou, em planos pagos, apoiar notificações automáticas conforme consentimento e limite do plano.",
  },
  {
    question: "Por que usar um sistema além do grupo?",
    answer:
      "Porque grupos são bons para conversa rápida, mas não foram feitos para controlar leitura, permissões, calendário, encomendas e solicitações privadas.",
  },
];

const heroChannels: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  { title: "App Meus Condomínios", description: "Histórico oficial", icon: CheckCircle2 },
  { title: "WhatsApp privado", description: "Com consentimento", icon: ShieldCheck },
  { title: "Grupo do bloco", description: "Só aviso seguro", icon: ClipboardCheck },
];

const proofCards: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Reservas sem confusão",
    body: "Calendário visual para salão, churrasqueira e áreas comuns.",
    icon: CalendarDays,
  },
  {
    title: "Leitura organizada",
    body: "Comunicados oficiais deixam de depender apenas de resposta no grupo.",
    icon: ClipboardCheck,
  },
  {
    title: "Dados no canal certo",
    body: "Telefone, visitante, reclamação e encomenda têm controles para reduzir exposição indevida.",
    icon: ShieldCheck,
  },
];

function ComparisonVisual() {
  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-[#E7DCCB] bg-white p-4 shadow-xl shadow-[#7C5C3E]/10">
      <div className="rounded-[1.5rem] bg-[#F5EFE6] p-4">
        <div className="flex items-center justify-between rounded-lg border bg-white p-3">
          <div>
            <p className="text-xs font-semibold text-primary">Meus Condomínios + WhatsApp</p>
            <p className="text-sm font-semibold text-[#111827]">Aviso para os canais certos</p>
          </div>
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>

        <div className="mt-4 grid gap-3">
          {heroChannels.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-[#E7DCCB] bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5EFE6] text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{title}</p>
                  <p className="mt-1 text-xs text-[#4B5563]">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-[#111827] p-4 text-white">
          <p className="text-xs font-semibold text-white/70">Proteção antes do envio</p>
          <p className="mt-2 text-sm font-semibold">Mensagem privada não vai para grupo.</p>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppCondoComparisonPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: "Comparativo", path: "/comparativo/whatsapp-condominio" },
          { name: "WhatsApp para condomínio", path },
        ])}
      />
      <JsonLd data={faqJsonLd(faq)} />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-primary">Comparativo</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal md:text-6xl">
            Grupo de WhatsApp ajuda. Mas não organiza o condomínio sozinho.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            O Meus Condomínios não precisa substituir completamente o WhatsApp. Ele organiza o que se perde
            nas conversas: comunicados oficiais, reservas, encomendas, solicitações, leitura e
            cuidados de privacidade dos moradores.
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
        <p className="mt-5 max-w-2xl text-xs leading-5 text-muted-foreground">
          WhatsApp continua sujeito às configurações do condomínio, consentimento dos moradores,
          créditos disponíveis e regras da plataforma oficial.
        </p>
      </div>
        <ComparisonVisual />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal">O que o WhatsApp faz bem</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O WhatsApp é parte da rotina dos moradores. Ele funciona muito bem para conversas
              rápidas, contato direto e avisos simples.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {whatsAppStrengths.map((item) => (
              <Card key={item} className="p-5">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold leading-6">{item}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">Onde ele começa a falhar</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            O problema não é conversar pelo WhatsApp. O problema é tentar administrar o condomínio
            inteiro dentro de grupos que não foram feitos para controle, histórico e privacidade.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {whatsAppLimits.map((item) => (
            <Card key={item} className="p-5">
              <TriangleAlert className="h-5 w-5 text-alert" />
              <p className="mt-4 text-sm font-medium leading-6">{item}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal">Como o Meus Condomínios complementa o WhatsApp</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O Meus Condomínios vira o lugar oficial da organização. O WhatsApp continua útil, mas deixa de
              ser o único arquivo, calendário e balcão de atendimento do condomínio.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {moraiComplements.map(([title, body]) => (
              <Card key={title} className="p-5">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">WhatsApp sozinho vs Meus Condomínios + WhatsApp</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Sem desmerecer o grupo: ele continua ajudando. A diferença é que o Meus Condomínios cria uma
              camada de organização para o que precisa ser registrado e acompanhado.
            </p>
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-primary md:flex">
            <Files className="h-4 w-4" />
            Comparação prática
          </div>
        </div>

        <div className="mt-8 hidden overflow-hidden rounded-lg border bg-white lg:block">
          <div className="grid grid-cols-[0.9fr_1fr_1fr] border-b bg-[#F5EFE6] text-sm font-semibold">
            <div className="p-4">Recurso</div>
            <div className="border-l p-4">WhatsApp sozinho</div>
            <div className="border-l p-4">Meus Condomínios + WhatsApp</div>
          </div>
          {comparisonRows.map(([feature, whatsapp, morai]) => (
            <div key={feature} className="grid grid-cols-[0.9fr_1fr_1fr] border-b last:border-b-0">
              <div className="p-4 text-sm font-semibold">{feature}</div>
              <div className="border-l p-4 text-sm text-muted-foreground">{whatsapp}</div>
              <div className="border-l p-4 text-sm font-medium">{morai}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:hidden">
          {comparisonRows.map(([feature, whatsapp, morai]) => (
            <Card key={feature} className="p-5">
              <h3 className="font-semibold">{feature}</h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border bg-[#F5EFE6] p-3">
                  <p className="text-xs font-semibold text-muted-foreground">WhatsApp sozinho</p>
                  <p className="mt-1 text-sm">{whatsapp}</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs font-semibold text-primary">Meus Condomínios + WhatsApp</p>
                  <p className="mt-1 text-sm font-medium">{morai}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {proofCards.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="grid gap-6 border-[#E7DCCB] bg-white p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">Organize sem abandonar o que já funciona</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Use o WhatsApp como apoio. Use o Meus Condomínios como organização.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Comece grátis e veja como fica mais fácil cuidar de comunicados, reservas,
              encomendas e solicitações do condomínio.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar condomínio grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/precos">Ver planos</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
