"use client";

import { Loader2, UserRoundCheck } from "lucide-react";
import { useActionState } from "react";
import Link from "next/link";
import {
  acceptSyndicInviteAction,
  type AcceptInviteState,
} from "@/app/(public)/convite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AcceptInviteState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-destructive">{errors[0]}</p>;
}

export function SyndicInviteForm({
  token,
  condominiumName,
  invitedEmail,
}: {
  token: string;
  condominiumName: string;
  invitedEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    acceptSyndicInviteAction,
    initialState,
  );

  return (
    <Card className="p-6">
      <UserRoundCheck className="h-8 w-8 text-primary" />
      <h1 className="mt-5 text-2xl font-semibold">Convite para síndico</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Você foi convidado para ser síndico em {condominiumName}. Complete
        apenas os dados necessários para iniciar.
      </p>

      {state.status === "error" ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-destructive">
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo</Label>
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
              placeholder="voce@email.com"
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha, se ainda não estiver logado</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
          />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="professional_note">Observação profissional</Label>
            <Input
              id="professional_note"
              name="professional_note"
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_date">Data de início</Label>
            <Input id="start_date" name="start_date" type="date" />
          </div>
        </div>
        <div className="space-y-3 rounded-lg border bg-muted p-4 text-sm">
          <label className="flex gap-3">
            <input name="terms" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
            <span>Aceito os termos de uso do Meus Condomínios.</span>
          </label>
          <FieldError errors={state.fieldErrors?.terms} />
          <label className="flex gap-3">
            <input name="privacy" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
            <span>Aceito a política de privacidade.</span>
          </label>
          <FieldError errors={state.fieldErrors?.privacy} />
          <label className="flex gap-3">
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
          <label className="flex gap-3">
            <input
              name="confirmation"
              type="checkbox"
              className="mt-1 accent-[#7C5C3E]"
            />
            <span>
              Entendo que serei cadastrado como síndico deste condomínio no Meus Condomínios.
            </span>
          </label>
          <FieldError errors={state.fieldErrors?.confirmation} />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Aceitar convite
        </Button>
      </form>
    </Card>
  );
}
