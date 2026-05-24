"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  Inbox,
  Megaphone,
  PackageCheck,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";

type DemoRole = "morador" | "sindico" | "guarita";

const roleLabels: Record<DemoRole, string> = {
  morador: "Morador",
  sindico: "Síndico",
  guarita: "Guarita/Cancela",
};

const roleDescriptions: Record<DemoRole, string> = {
  morador:
    "Acompanhe avisos, notificações da portaria, reservas, encomendas e solicitações pelo celular.",
  sindico:
    "Veja uma rotina administrativa simples: aprovar moradores, organizar apartamentos, publicar avisos e acompanhar pedidos.",
  guarita:
    "Simule uma portaria segura: buscar apartamento, registrar encomenda, visitante e ocorrência sem acessar dados desnecessários.",
};

function DemoNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
      Dados fictícios. A demo não acessa dados reais, não exige login e não salva ações.
    </div>
  );
}

function PersistentCta() {
  return (
    <div className="sticky bottom-0 z-30 mt-8 border-t bg-[#F5EFE6]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[#111827]">
          Gostou da experiência? Crie seu condomínio em poucos minutos.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="sm">
            <Link href="/cadastro">Criar meu condomínio grátis</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/precos">Ver planos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SimulatedActionButton({
  children,
  success,
}: {
  children: React.ReactNode;
  success: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  function simulate() {
    setMessage(success);
    window.setTimeout(() => setMessage(null), 2600);
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={simulate}>
        {children}
      </Button>
      {message ? (
        <p className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs font-semibold text-success">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function QuickNav({ active }: { active: DemoRole }) {
  const links: Array<{ role: DemoRole; href: string }> = [
    { role: "morador", href: "/demo/morador" },
    { role: "sindico", href: "/demo/sindico" },
    { role: "guarita", href: "/demo/guarita" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {links.map((item) => (
        <Link
          key={item.role}
          href={item.href}
          className={`min-h-11 rounded-lg border px-4 py-3 text-sm font-semibold ${
            active === item.role
              ? "border-[#7C5C3E] bg-[#7C5C3E] text-white"
              : "bg-white text-[#111827]"
          }`}
        >
          {roleLabels[item.role]}
        </Link>
      ))}
    </div>
  );
}

function DemoHeader({ role }: { role: DemoRole }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <QuickNav active={role} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Demo pública do Meus Condomínios</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-5xl">
            Entrando como {roleLabels[role].toLowerCase()}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {roleDescriptions[role]}
          </p>
        </div>
        <DemoNotice />
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  tone = "neutral",
}: {
  icon: typeof Bell;
  value: string;
  label: string;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      <strong className="mt-4 block text-2xl">{value}</strong>
    </Card>
  );
}

function MoradorDemo() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Bell} value="3 alertas" label="Novos" tone="warning" />
        <MetricCard icon={CalendarDays} value="2 reservas" label="Agenda" />
        <MetricCard icon={Inbox} value="1 encomenda" label="Portaria" tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Avisos e notificações</h2>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["Visitante na portaria", "João aguarda autorização no portão.", "Responder"],
              ["Manutenção de água", "Amanhã, das 9h às 12h.", "Importante"],
              ["Encomenda recebida", "Pacote pequeno aguardando retirada.", "Portaria"],
            ].map(([title, detail, badge]) => (
              <div key={title} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                  </div>
                  <StatusBadge tone={badge === "Importante" ? "warning" : "neutral"}>{badge}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Agendar área comum</h2>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
            {Array.from({ length: 28 }, (_, index) => {
              const day = index + 1;
              const active = [7, 12, 18, 23].includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={`min-h-11 rounded-lg border text-sm font-semibold ${
                    active ? "border-[#7C5C3E] bg-[#7C5C3E] text-white" : "bg-white text-[#111827]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <SimulatedActionButton success="Pedido fictício enviado para aprovação.">
              Solicitar salão de festas
            </SimulatedActionButton>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <DoorOpen className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Portaria e QR</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visitantes pedem contato sem ver telefone. O responsável decide se libera o WhatsApp.
          </p>
          <SimulatedActionButton success="Contato fictício liberado para o visitante.">
            Liberar contato
          </SimulatedActionButton>
        </Card>
        <Card className="p-5">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Solicitações</h2>
          <p className="mt-2 text-sm text-muted-foreground">Abra reclamação, manutenção ou sugestão para a administração.</p>
          <SimulatedActionButton success="Solicitação fictícia enviada para análise.">
            Enviar solicitação
          </SimulatedActionButton>
        </Card>
        <Card className="p-5">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Privacidade</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Telefone oculto por padrão. Crianças não aparecem em listagens públicas.
          </p>
          <StatusBadge tone="success">Dados protegidos</StatusBadge>
        </Card>
      </div>
    </div>
  );
}

function SindicoDemo() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={UsersRound} value="4" label="Moradores pendentes" tone="warning" />
        <MetricCard icon={CalendarDays} value="3" label="Reservas pendentes" tone="warning" />
        <MetricCard icon={ClipboardList} value="7" label="Solicitações abertas" />
        <MetricCard icon={Building2} value="96" label="Apartamentos" tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Apartamentos</h2>
            </div>
            <StatusBadge tone="success">Grade editável</StatusBadge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["A-101", "2 responsáveis", "Ativo"],
              ["A-102", "cadastro pendente", "Pendente"],
              ["B-204", "encomenda aguardando", "Portaria"],
              ["C-310", "reserva aprovada", "Agenda"],
            ].map(([unit, detail, status]) => (
              <div key={unit} className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{unit}</strong>
                  <StatusBadge tone={status === "Pendente" ? "warning" : "neutral"}>{status}</StatusBadge>
                </div>
                <p className="mt-2 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Publicar aviso</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-primary">Prévia</p>
              <p className="mt-1 font-semibold">Manutenção de elevador</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviar para todos ou escolher apartamentos específicos. No plano grátis, copie o texto para compartilhar manualmente.
              </p>
            </div>
            <SimulatedActionButton success="Aviso fictício publicado no app. Texto pronto para copiar.">
              Simular publicação
            </SimulatedActionButton>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Permissões</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando o plano permitir, módulos extras aparecem para quem receber autorização.
          </p>
        </Card>
        <Card className="p-5">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Reservas pendentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">Salão, churrasqueira e coworking aguardam aprovação.</p>
          <SimulatedActionButton success="Reserva fictícia aprovada.">
            Aprovar próxima reserva
          </SimulatedActionButton>
        </Card>
        <Card className="p-5">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Solicitações</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reclamações e manutenção ficam organizadas por prioridade e status.
          </p>
        </Card>
      </div>
    </div>
  );
}

function GuaritaDemo() {
  const [query, setQuery] = useState("A-101");
  const result = useMemo(() => {
    if (!query.trim()) return null;
    return {
      unit: query.toUpperCase(),
      resident: "Responsável autorizado",
      phone: "(11) 9****-**42",
      note: "Telefone completo só aparece quando houver permissão.",
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Search} value="Busca limitada" label="Seguro" tone="success" />
        <MetricCard icon={Inbox} value="6 encomendas" label="Aguardando" tone="warning" />
        <MetricCard icon={DoorOpen} value="4 visitantes" label="Hoje" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Buscar apartamento</h2>
          </div>
          <label className="mt-4 block text-sm font-semibold" htmlFor="demo-search">
            Apartamento
          </label>
          <input
            id="demo-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#7C5C3E]"
            placeholder="Ex: A-101"
          />
          {result ? (
            <div className="mt-4 rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <strong>{result.unit}</strong>
                <StatusBadge tone="success">Encontrado</StatusBadge>
              </div>
              <p className="mt-3 text-sm font-medium">{result.resident}</p>
              <p className="mt-1 text-sm text-muted-foreground">{result.phone}</p>
              <p className="mt-1 text-xs text-muted-foreground">{result.note}</p>
              <div className="mt-4">
                <SimulatedActionButton success="Chamada fictícia registrada.">
                  Chamar responsável
                </SimulatedActionButton>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Registrar encomenda</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="min-h-11 rounded-lg border bg-white px-3 text-sm" value="B-204" readOnly />
            <input className="min-h-11 rounded-lg border bg-white px-3 text-sm" value="Pacote pequeno" readOnly />
          </div>
          <div className="mt-3 rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
            Foto opcional. Na versão real, a imagem é enviada para storage privado.
          </div>
          <div className="mt-4">
            <SimulatedActionButton success="Encomenda fictícia registrada e morador avisado no app.">
              Registrar encomenda
            </SimulatedActionButton>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Visitantes recentes</h2>
          <div className="mt-4 space-y-2">
            {[
              ["Entrega de mercado", "A-101", "Liberado"],
              ["Prestador de manutenção", "B-204", "Aguardando"],
              ["Visitante familiar", "C-310", "Finalizado"],
            ].map(([name, unit, status]) => (
              <div key={`${name}-${unit}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-muted-foreground">{unit}</p>
                </div>
                <StatusBadge tone={status === "Aguardando" ? "warning" : "neutral"}>{status}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Ocorrências</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registre algo para a administração sem acessar financeiro, documentos ou dados sensíveis.
          </p>
          <div className="mt-4">
            <SimulatedActionButton success="Ocorrência fictícia enviada para a administração.">
              Criar ocorrência
            </SimulatedActionButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DemoExperience({ role }: { role: DemoRole }) {
  return (
    <main>
      <DemoHeader role={role} />
      {role === "morador" ? <MoradorDemo /> : null}
      {role === "sindico" ? <SindicoDemo /> : null}
      {role === "guarita" ? <GuaritaDemo /> : null}
      <PersistentCta />
    </main>
  );
}
