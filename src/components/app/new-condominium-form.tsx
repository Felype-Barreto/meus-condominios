"use client";

import { Building2, Check, Copy, Loader2, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  createCondominiumAction,
  type CreateCondoState,
} from "@/app/(app)/app/novo-condominio/actions";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CondominiumCreationEntitlement } from "@/lib/plans";

const initialState: CreateCondoState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-destructive">{errors[0]}</p>;
}

const freeFallbackLimits = {
  blocks: 2,
  condominiums: 1,
  apartmentsPerBlock: 24,
  totalApartments: 24,
  commonAreas: 2,
  bookingsPerMonth: 20,
  storageMb: 30,
  whatsappCredits: 0,
};

const creationMessages = [
  "Conferindo os dados do condomínio",
  "Criando um endereço único para o painel",
  "Preparando o primeiro bloco vazio",
  "Preparando as primeiras permissões",
  "Deixando o dashboard pronto para começar",
];

function CondominiumCreationOverlay({
  active,
  condominiumName,
}: {
  active: boolean;
  condominiumName: string;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % creationMessages.length);
    }, 1450);

    return () => window.clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Criando condomínio"
      className="fixed inset-0 z-[70] grid place-items-center bg-background/88 p-4 backdrop-blur-md"
    >
      <Card className="w-full max-w-lg overflow-hidden p-6 shadow-2xl shadow-black/15 md:p-8">
        <div className="flex items-start gap-4">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-[#7C5C3E]/20">
            <Building2 className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border-2 border-card bg-success" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Criando condomínio</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              {condominiumName.trim() || "Seu novo condomínio"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Estamos preparando uma base organizada para você começar sem telas incompletas.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-muted p-4">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{creationMessages[messageIndex]}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-muted-foreground">Estrutura</p>
            <strong className="mt-1 block">Bloco inicial</strong>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-muted-foreground">Unidades</p>
            <strong className="mt-1 block">Você monta depois</strong>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-muted-foreground">Painel</p>
            <strong className="mt-1 block">Em preparo</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function NewCondominiumForm({
  entitlement,
}: {
  entitlement: CondominiumCreationEntitlement | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createCondominiumAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [syndicChoice, setSyndicChoice] = useState("self");
  const [copied, setCopied] = useState(false);

  const limits = entitlement?.limits ?? freeFallbackLimits;

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-success">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Condomínio criado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>

          {state.inviteUrl ? (
            <div className="mt-6 space-y-4 rounded-lg border bg-muted p-4">
              <div>
                <p className="text-sm font-semibold">Link do síndico</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {state.inviteUrl}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.inviteUrl ?? "");
                  setCopied(true);
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Link copiado" : "Copiar link do síndico"}
              </Button>
              <div>
                <p className="text-sm font-semibold">Mensagem para WhatsApp</p>
                <p className="mt-2 rounded-lg bg-card p-3 text-sm text-muted-foreground">
                  {state.whatsappText}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={`/app/${state.condominiumId}/dashboard`}>
                Ir para o dashboard
              </Link>
            </Button>
            {state.message?.includes("definir o síndico") ? (
              <Button asChild variant="outline">
                <Link href={`/app/${state.condominiumId}/sindico`}>
                  Definir síndico agora
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="mx-auto max-w-5xl space-y-6"
    >
      <CondominiumCreationOverlay
        active={isPending}
        condominiumName={name}
      />
      <div>
        <p className="text-sm font-semibold text-primary">Novo condomínio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Configure a base do Meus Condomínios
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O criador será sempre o assinante principal. O síndico pode ser você,
          uma pessoa convidada ou definido depois.
        </p>
      </div>

      {state.status === "error" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-destructive">
          {state.message}
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Plano da conta</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Seu plano atual: {entitlement?.planLabel ?? "Free"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Você monta blocos, andares e apartamentos depois, no painel de apartamentos.
            </p>
          </div>
          {(entitlement?.plan ?? "free") === "free" ? (
            <Button asChild variant="outline">
              <Link href="/precos">Fazer upgrade</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-muted-foreground">Estrutura</p>
            <strong className="mt-1 block">{limits.blocks} blocos</strong>
            <span>{limits.totalApartments} apartamentos no total</span>
            <span className="mt-1 block">{limits.condominiums} condominio(s) por conta</span>
          </div>
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-muted-foreground">Rotina</p>
            <strong className="mt-1 block">{limits.commonAreas} áreas comuns</strong>
            <span>{limits.bookingsPerMonth} agendamentos/mês</span>
          </div>
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-muted-foreground">Armazenamento</p>
            <strong className="mt-1 block">{limits.storageMb} MB</strong>
            <span>{limits.whatsappCredits} créditos WhatsApp/mês</span>
          </div>
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-muted-foreground">Monetização</p>
            <strong className="mt-1 block">
              {(entitlement?.plan ?? "free") === "free" ? "Anuncio intersticial" : "Sem anuncios"}
            </strong>
            <span>
              {entitlement?.currentUsage.activeCondominiums ?? 0} condomínio(s) ativo(s) na conta
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <StatusBadge>Etapa 1</StatusBadge>
        <h2 className="mt-3 text-xl font-semibold">Dados básicos</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nome do condomínio</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Residencial Jardim"
            />
            <p className="text-xs text-muted-foreground">
              O Meus Condomínios cria automaticamente um endereço interno único para este condomínio.
            </p>
            <FieldError errors={state.fieldErrors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">E-mail de contato obrigatório</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              autoComplete="email"
              placeholder="contato@condominio.com"
            />
            <FieldError errors={state.fieldErrors?.contact_email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Telefone de contato</Label>
            <Input id="contact_phone" name="contact_phone" placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Endereço opcional</Label>
            <Input id="address" name="address" placeholder="Rua, número, bairro e cidade" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Plano aplicado</Label>
            <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
              O plano exibido acima define os limites. A estrutura real do prédio será montada em Apartamentos.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <StatusBadge>Etapa 2</StatusBadge>
        <h2 className="mt-3 text-xl font-semibold">Limites da estrutura</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Depois da criação, você adiciona blocos, andares e números de apartamentos do jeito real do condomínio.
        </p>
        <div className="mt-4 rounded-lg border bg-muted p-4 text-sm">
          Plano {entitlement?.planLabel ?? "Free"}: até {limits.blocks} bloco(s),{" "}
          {limits.totalApartments} apartamentos no total
          e {limits.condominiums} condominio(s) por conta.
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <UserRoundCheck className="h-6 w-6 text-primary" />
          <div>
            <StatusBadge>Etapa 3</StatusBadge>
            <h2 className="mt-3 text-xl font-semibold">
              Quem será o síndico deste condomínio?
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {[
            ["self", "Eu sou o síndico", "Você será subscriber_admin e também síndico principal."],
            ["invite", "Quero convidar outra pessoa como síndico", "O Meus Condomínios cria um convite seguro com validade de 7 dias."],
            ["later", "Definir síndico depois", "O dashboard mostrará um aviso até a definição."],
          ].map(([value, title, description]) => (
            <label
              key={value}
              className="flex cursor-pointer gap-3 rounded-lg border bg-card p-4 hover:border-primary/50"
            >
              <input
                type="radio"
                name="syndic_choice"
                value={value}
                checked={syndicChoice === value}
                onChange={() => setSyndicChoice(value)}
                className="mt-1 accent-[#7C5C3E]"
              />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </div>
        {syndicChoice === "invite" ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="syndic_email">E-mail do síndico convidado</Label>
            <Input
              id="syndic_email"
              name="syndic_email"
              type="email"
              placeholder="sindico@email.com"
            />
            <FieldError errors={state.fieldErrors?.syndic_email} />
          </div>
        ) : null}
      </Card>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isPending}
        >
          Criar condomínio
        </Button>
        <p className="text-sm text-muted-foreground">
          Ao criar, o Meus Condomínios prepara um Bloco A vazio para você montar a estrutura real.
        </p>
      </div>
    </form>
  );
}
