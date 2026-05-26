import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Inbox,
  LockKeyhole,
  MessageCircle,
  Navigation,
  QrCode,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createSeoMetadata,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Meus Condomínios | Sistema para condomínio com comunicados, reservas e WhatsApp",
  description:
    "O Meus Condomínios organiza comunicados, reservas, encomendas, solicitações e WhatsApp do condomínio em um só lugar, com segurança para síndicos, moradores e administradoras.",
  path: "/",
  keywords: [
    "sistema para condomínio",
    "app para condomínio",
    "gestão de condomínio online",
    "sistema para síndico",
    "WhatsApp para condomínio",
    "controle de encomendas condomínio",
    "reserva de salão de festas condomínio",
  ],
});

const pains = [
  "Avisos importantes se perdem no grupo",
  "Reservas dão conflito e viram conversa solta",
  "Encomendas ficam sem controle na portaria",
  "Reclamações e sugestões somem sem histórico",
  "Síndico repete a mesma mensagem em vários grupos",
];

const solutions: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "Comunicados",
    description: "Avisos oficiais com histórico, prioridade e confirmação de leitura.",
    icon: Bell,
  },
  {
    title: "Calendário de reservas",
    description: "Agenda visual para salão, churrasqueira e áreas comuns.",
    icon: CalendarDays,
  },
  {
    title: "Encomendas",
    description: "Registro de chegada, retirada e avisos para moradores.",
    icon: Inbox,
  },
  {
    title: "Solicitações",
    description: "Reclamações, manutenção e sugestões organizadas por status.",
    icon: ClipboardList,
  },
  {
    title: "QR Code seguro",
    description: "Visitantes solicitam contato sem listar moradores, telefones ou apartamentos.",
    icon: QrCode,
  },
  {
    title: "WhatsApp organizado",
    description: "Textos prontos, canais sugeridos e automação sujeita a plano, consentimento e créditos.",
    icon: MessageCircle,
  },
];

const whatsAppItems = [
  "Grupos por bloco, portaria, conselho ou garagem",
  "Compartilhamento manual no plano grátis",
  "Notificações automáticas nos planos pagos, conforme consentimento e créditos",
  "Créditos mensais por plano para controlar custo",
  "Alertas para reduzir envio indevido de dados em grupo",
];

const mobileItems: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "PWA",
    description: "Acesso pelo navegador com sensação de app no celular.",
    icon: Smartphone,
  },
  {
    title: "Navegação inferior",
    description: "Atalhos simples para morador, síndico e guarita.",
    icon: Navigation,
  },
  {
    title: "Calendário bonito",
    description: "Reservas fáceis de tocar, filtrar e acompanhar.",
    icon: CalendarDays,
  },
  {
    title: "Formulários simples",
    description: "Menos campos, etapas claras e botões confortáveis.",
    icon: ClipboardList,
  },
];

const securityItems = [
  "Telefone oculto por padrão",
  "QR seguro para visitantes",
  "Permissões por cargo",
  "Logs de ações importantes",
  "Privacidade e LGPD explicadas em linguagem simples",
];

const plans = [
  ["Grátis", "R$ 0", "Comece com 2 blocos, até 24 apartamentos e compartilhamento manual no WhatsApp."],
  ["Premium", "R$ 39,90/mês", "Mais apartamentos, guarita, permissões por toggle e WhatsApp privado com créditos."],
  ["Pro", "R$ 99,90/mês", "Relatórios, exportação, canais avançados e mais capacidade para condomínios maiores."],
  ["Total", "R$ 249,90/mês", "Recursos avançados, alto volume com limites claros e suporte para operações maiores."],
];

const pricingPlans = [
  {
    name: "Grátis",
    price: "R$ 0",
    description: "Comece com 2 blocos, até 24 apartamentos e compartilhamento manual no WhatsApp.",
    href: "/cadastro?next=%2Fapp%2Fnovo-condominio",
    action: "Começar grátis",
    available: true,
  },
  {
    name: "Premium",
    price: "R$ 39,90/mês",
    description: "Mais apartamentos, guarita, permissões por toggle e sem anúncios no painel.",
    href: "/entrar?next=%2Fapp%2Fassinatura%2Fcheckout%3Fplano%3Dpremium",
    action: "Assinar Premium",
    available: true,
  },
  {
    name: "Pro",
    price: "R$ 99,90/mês",
    description: "Relatórios, exportação, canais avançados e mais capacidade para condomínios maiores.",
    href: null,
    action: "Em breve",
    available: false,
  },
  {
    name: "Total",
    price: "R$ 249,90/mês",
    description: "Recursos avançados, alto volume com limites claros e suporte para operações maiores.",
    href: null,
    action: "Em breve",
    available: false,
  },
];

void plans;

const faq = [
  {
    question: "Precisa instalar app?",
    answer:
      "Não. O Meus Condomínios funciona pelo navegador e pode ser adicionado à tela inicial do celular como um app.",
  },
  {
    question: "Funciona no celular?",
    answer:
      "Sim. A experiência é mobile-first, com cards, botões grandes, navegação inferior e telas pensadas para moradores e portaria.",
  },
  {
    question: "O Meus Condomínios substitui o WhatsApp?",
    answer:
      "Não precisa substituir. O Meus Condomínios organiza o que é oficial e ajuda o síndico a usar WhatsApp com mais controle.",
  },
  {
    question: "Dá para usar grátis?",
    answer:
      "Sim. O plano grátis permite começar com um condomínio pequeno, compartilhamento manual no WhatsApp e marca Meus Condomínios.",
  },
  {
    question: "Dá para configurar vários grupos?",
    answer:
      "Sim. Os planos maiores permitem canais e grupos por bloco, portaria, conselho e outros usos, com limites por plano.",
  },
  {
    question: "Como funciona o síndico?",
    answer:
      "O assinante cria o condomínio e pode ser o síndico ou convidar outra pessoa. O síndico atua conforme permissões definidas pela administração.",
  },
  {
    question: "Os dados dos moradores ficam seguros?",
    answer:
      "O Meus Condomínios foi desenhado com controles de acesso, telefone oculto por padrão e canais adequados para reduzir exposição indevida.",
  },
];

function HeroMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-[#E7DCCB] bg-white p-4 shadow-2xl shadow-[#7C5C3E]/10">
      <div className="rounded-[1.5rem] bg-[#F5EFE6] p-4">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary">Residencial Aurora</p>
              <h2 className="mt-1 text-xl font-semibold text-[#111827]">Hoje no Meus Condomínios</h2>
            </div>
            <span className="rounded-lg bg-green-50 p-2 text-success ring-1 ring-green-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["4", "moradores pendentes"],
              ["3", "reservas para aprovar"],
              ["8", "encomendas na portaria"],
              ["72", "WhatsApp usados"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border bg-[#FAF7F2] p-3">
                <strong className="text-2xl text-[#111827]">{value}</strong>
                <p className="mt-1 text-xs leading-5 text-[#4B5563]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["Comunicado urgente", "App + grupo geral", "Importante"],
              ["Reserva do salão", "Aguardando aprovação", "Pendente"],
              ["Encomenda B-204", "Aviso privado", "Portaria"],
            ].map(([title, detail, badge]) => (
              <div key={title} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{title}</p>
                    <p className="mt-1 text-xs text-[#4B5563]">{detail}</p>
                  </div>
                  <span className="rounded-full bg-[#F5EFE6] px-2 py-1 text-[11px] font-semibold text-[#7C5C3E]">
                    {badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border bg-[#111827] p-2 text-white">
            {[
              [Bell, "Avisos"],
              [CalendarDays, "Agenda"],
              [MessageCircle, "Alertas"],
              [UsersRound, "Mais"],
            ].map(([Icon, label]) => (
              <div key={String(label)} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-semibold">
                <Icon className="h-4 w-4" />
                {String(label)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={faqJsonLd(faq)} />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-primary">
            Sistema para condomínio feito para a rotina brasileira
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
            Organize a comunicação do seu condomínio sem depender só do grupo de WhatsApp
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Com o Meus Condomínios, síndicos e moradores centralizam avisos, reservas, encomendas,
            solicitações e canais de WhatsApp com mais organização e cuidados de privacidade.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">
                Criar condomínio grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">Ver demonstração</Link>
            </Button>
          </div>
          <div className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {["Comece grátis", "Dados fictícios na demo", "Feito para celular"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <HeroMockup />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal">
              Seu condomínio vive no WhatsApp, mas nada fica organizado?
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O grupo ajuda na conversa rápida. Mas quando tudo depende dele, a rotina vira busca,
              repetição e perda de informação.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {pains.map((pain) => (
              <Card key={pain} className="p-5">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold leading-6">{pain}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">Tudo em um painel simples</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            O Meus Condomínios reúne os módulos que o condomínio usa todos os dias, sem tela poluída e sem
            pedir dados desnecessários.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-primary">WhatsApp organizado</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Continue usando WhatsApp, mas com controle
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O Meus Condomínios não força o condomínio a abandonar os grupos. Ele ajuda o síndico a escrever
              uma vez, escolher os canais certos e reduzir o risco de enviar informações ao lugar errado.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/recursos/comunicacao-whatsapp">Ver comunicação com WhatsApp</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/comparativo/whatsapp-condominio">Comparar com WhatsApp sozinho</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {whatsAppItems.map((item) => (
              <div key={item} className="rounded-lg border bg-white p-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="mt-3 text-sm font-semibold leading-6">{item}</p>
              </div>
            ))}
          </div>
          <p className="lg:col-span-2 text-xs leading-5 text-muted-foreground">
            WhatsApp automático depende de configuração técnica, consentimento dos moradores,
            créditos disponíveis e regras da plataforma oficial. No plano grátis, o uso é manual.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Mobile-first</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">Feito para o celular</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            A maioria dos moradores acessa pelo celular. Por isso, o Meus Condomínios prioriza toque fácil,
            cards claros, navegação simples e carregamento leve.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {mobileItems.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Card>
            ))}
          </div>
        </div>
        <Card className="p-5">
          <div className="rounded-[1.5rem] bg-[#111827] p-4 text-white">
            <div className="rounded-[1.1rem] bg-[#F5EFE6] p-4 text-[#111827]">
              <p className="text-xs font-semibold text-primary">Morador</p>
              <h3 className="mt-1 text-xl font-semibold">Início</h3>
              <div className="mt-4 space-y-3">
                {[
                  ["Reservar salão", "Escolha data e horário disponível"],
                  ["Ler comunicado", "Assembleia nesta quarta"],
                  ["Ver encomenda", "Aguardando retirada"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-lg border bg-white p-3">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-white p-2 text-[10px] font-semibold text-muted-foreground">
                {["Início", "Agenda", "Avisos", "Perfil"].map((item) => (
                  <span key={item} className="rounded-lg bg-[#F5EFE6] px-2 py-3 text-center">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-primary">Segurança e privacidade</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Dados dos moradores com controles de privacidade
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              O Meus Condomínios usa linguagem simples para privacidade e recursos práticos para reduzir
              exposição indevida de telefone, visitante, reclamação ou documento.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/seguranca">Ver segurança</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {securityItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border bg-white p-4">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold leading-6">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Recursos de segurança e privacidade reduzem riscos, mas dependem também de senhas
            protegidas, permissões bem configuradas e uso responsável pelo condomínio.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Comece grátis e cresça quando precisar
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/precos">Ver todos os detalhes</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan) => {
            const content = (
              <Card className="group h-full p-5 transition duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_18px_46px_rgba(124,92,62,0.16)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">{plan.name}</p>
                  {!plan.available ? (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-muted-foreground">
                      <LockKeyhole className="h-3 w-3" />
                      Em breve
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{plan.price}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {plan.action}
                  {plan.available ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /> : null}
                </div>
              </Card>
            );

            return plan.href ? (
              <Link key={plan.name} href={plan.href} className="block focus:outline-none focus:ring-2 focus:ring-primary/40">
                {content}
              </Link>
            ) : (
              <div key={plan.name} aria-disabled="true" className="opacity-75">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">
            Perguntas comuns antes de começar
          </h2>
          <div className="mt-8 grid gap-4">
            {faq.map((item) => (
              <Card key={item.question} className="p-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="grid gap-6 border-[#E7DCCB] bg-white p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">Pronto para organizar?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Crie seu condomínio grátis e teste o Meus Condomínios na prática.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Você pode começar pequeno, convidar moradores por link e evoluir para automações
              conforme o condomínio precisar.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar condomínio grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">Ver demonstração</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
