"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, MessageCircle, Users } from "lucide-react";
import { useActionState } from "react";
import {
  acceptResidentInviteAction,
  type AcceptInviteState,
} from "@/app/(public)/convite/[token]/actions";
import { GoogleAuthButton } from "@/components/public/google-auth-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApartmentOption = {
  apartment_id: string;
  apartment_number: string;
  block_name: string | null;
};

const initialState: AcceptInviteState & { submitted?: boolean } = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-destructive">{errors[0]}</p>;
}

export function ResidentInviteForm({
  token,
  condominiumName,
  invitedEmail,
  currentUserEmail,
  currentUserName,
  emailVerified,
  apartments,
}: {
  token: string;
  condominiumName: string;
  invitedEmail?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  emailVerified?: boolean;
  apartments: ApartmentOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    acceptResidentInviteAction,
    initialState,
  );
  const loggedIn = Boolean(currentUserEmail);
  const fixedEmail = currentUserEmail ?? invitedEmail;

  if (state.submitted) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h1 className="mt-5 text-2xl font-semibold">Cadastro enviado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aguarde aprovação da administração do condomínio.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Users className="h-8 w-8 text-primary" />
      <h1 className="mt-5 text-2xl font-semibold">Cadastro no condomínio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete seu cadastro em {condominiumName}. Seus dados ficam pendentes
        até aprovação da administração.
      </p>

      {loggedIn ? (
        <div className="mt-5 rounded-lg border bg-muted p-4 text-sm">
          <p className="font-semibold">Conta conectada</p>
          <p className="mt-1 text-muted-foreground">
            Você está usando {currentUserEmail}.{" "}
            {emailVerified
              ? "E-mail verificado."
              : "A confirmação de e-mail fica recomendada para segurança."}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3 rounded-lg border bg-muted p-4 text-sm">
          <div>
            <p className="font-semibold">Cadastro com Gmail recomendado</p>
            <p className="mt-1 text-muted-foreground">
              O link continua preso a este convite. Depois do Gmail, você volta para esta tela para concluir o cadastro.
            </p>
          </div>
          <GoogleAuthButton nextPath={`/convite/${token}`} label="Cadastrar com Gmail" />
        </div>
      )}

      {state.status === "error" ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-destructive">
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input id="full_name" name="full_name" placeholder="Seu nome completo" defaultValue={currentUserName} />
          <FieldError errors={state.fieldErrors?.full_name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={fixedEmail}
              readOnly={Boolean(fixedEmail)}
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" placeholder="(11) 99999-9999 opcional" />
            <FieldError errors={state.fieldErrors?.phone} />
          </div>
        </div>
        {!loggedIn ? (
          <div className="space-y-2">
            <Label htmlFor="password">Senha, se preferir cadastrar por e-mail</Label>
            <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" />
            <FieldError errors={state.fieldErrors?.password} />
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apartment_id">Bloco e apartamento</Label>
            <select
              id="apartment_id"
              name="apartment_id"
              className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione</option>
              {apartments.map((apartment) => (
                <option key={apartment.apartment_id} value={apartment.apartment_id}>
                  {apartment.block_name ?? "Bloco"} - {apartment.apartment_number}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.apartment_id} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="membership_kind">Tipo</Label>
            <select
              id="membership_kind"
              name="membership_kind"
              className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="resident">Morador</option>
              <option value="owner">Proprietário</option>
              <option value="resident_owner">Morador e proprietário</option>
            </select>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border bg-muted p-4 text-sm">
          <p className="font-semibold">Privacidade</p>
          <label className="flex gap-3"><input name="allow_admin_contact" defaultChecked type="checkbox" className="mt-1 accent-[#7C5C3E]" />Permitir contato pela administração</label>
          <label className="flex gap-3"><input name="allow_internal_search" defaultChecked type="checkbox" className="mt-1 accent-[#7C5C3E]" />Permitir aparecer em busca interna</label>
          <label className="flex gap-3"><input name="allow_public_qr_by_apartment" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Permitir QR público encontrar por apartamento</label>
          <label className="flex gap-3"><input name="allow_public_qr_by_name" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Permitir QR público encontrar por nome</label>
          <label className="flex gap-3"><input name="allow_whatsapp_direct" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Permitir WhatsApp direto</label>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted p-4 text-sm">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Quer receber avisos pelo WhatsApp?</p>
              <p className="mt-1 leading-5 text-muted-foreground">
                Você pode desativar depois. Comunicados importantes continuam no app e seu telefone não aparece publicamente por padrão.
              </p>
            </div>
          </div>
          <label className="flex gap-3"><input name="whatsapp_opt_in" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Aceito receber avisos pelo WhatsApp quando o condomínio tiver esse recurso. O telefone precisa ser informado para ativar.</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex gap-3"><input name="whatsapp_general" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Avisos gerais</label>
            <label className="flex gap-3"><input name="whatsapp_urgent_announcement" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Avisos urgentes</label>
            <label className="flex gap-3"><input name="whatsapp_package" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Encomendas</label>
            <label className="flex gap-3"><input name="whatsapp_booking" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Agendamentos</label>
            <label className="flex gap-3"><input name="whatsapp_visitor_contact" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Visitantes pelo QR</label>
            <label className="flex gap-3"><input name="whatsapp_summary" type="checkbox" className="mt-1 accent-[#7C5C3E]" />Resumos</label>
          </div>
        </div>
        <label className="flex gap-3 rounded-lg border bg-muted p-4 text-sm">
          <input name="terms" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
          <span>Aceito os termos de uso.</span>
        </label>
        <FieldError errors={state.fieldErrors?.terms} />
        <label className="flex gap-3 rounded-lg border bg-muted p-4 text-sm">
          <input name="privacy" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
          <span>Aceito a política de privacidade.</span>
        </label>
        <FieldError errors={state.fieldErrors?.privacy} />
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
          Enviar cadastro
        </Button>
      </form>
    </Card>
  );
}
