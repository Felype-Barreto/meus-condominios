"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useActionState } from "react";
import Link from "next/link";
import {
  acceptDoormanInviteAction,
  type AcceptInviteState,
} from "@/app/(public)/convite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CondominiumCodeCard } from "@/components/common/condominium-code-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AcceptInviteState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-destructive">{errors[0]}</p>;
}

export function DoormanInviteForm({
  token,
  condominiumName,
  condominiumCode,
  invitedEmail,
}: {
  token: string;
  condominiumName: string;
  condominiumCode?: string;
  invitedEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    acceptDoormanInviteAction,
    initialState,
  );

  return (
    <Card className="p-6">
      <KeyRound className="h-8 w-8 text-primary" />
      <h1 className="mt-5 text-2xl font-semibold">Convite para Guarita/Cancela</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Você foi convidado para operar a portaria em {condominiumName}. O acesso
        é simples e não mostra dados sensíveis sem permissão.
      </p>
      <CondominiumCodeCard
        code={condominiumCode}
        compact
        className="mt-5"
        helper="Salve este código para realizar login no condomínio depois. Se perder, peça o código ao administrador."
      />

      {state.status === "error" ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-destructive">
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome</Label>
          <Input id="full_name" name="full_name" placeholder="Seu nome" />
          <FieldError errors={state.fieldErrors?.full_name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={invitedEmail}
              readOnly={Boolean(invitedEmail)}
              placeholder="voce@email.com"
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" placeholder="Opcional" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
        <label className="flex gap-3 rounded-lg border bg-muted p-4 text-sm">
          <input name="terms" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
          <span>Aceito os termos de uso do Meus Condomínios.</span>
        </label>
        <FieldError errors={state.fieldErrors?.terms} />
        <label className="flex gap-3 rounded-lg border bg-muted p-4 text-sm">
          <input name="acceptable_use" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
          <span>
            Aceito a{" "}
            <Link className="font-semibold text-primary" href="/uso-aceitavel" target="_blank">
              política de uso aceitável
            </Link>
            .
          </span>
        </label>
        <FieldError errors={state.fieldErrors?.acceptable_use} />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Aceitar convite
        </Button>
      </form>
    </Card>
  );
}
