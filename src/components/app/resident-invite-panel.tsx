"use client";

import { Copy, Link2, Loader2, Mail, Send } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createResidentInviteAction,
  type InviteState,
} from "@/app/(app)/app/[condoId]/convites/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApartmentOption = {
  id: string;
  number: string;
  blocks?: { name: string | null } | null;
};

const initialState: InviteState = { status: "idle" };

export function ResidentInvitePanel({
  condoId,
  apartments,
  selectedApartmentId = "",
}: {
  condoId: string;
  apartments: ApartmentOption[];
  selectedApartmentId?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createResidentInviteAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  return (
    <Card className="p-6">
      <div>
        <h2 className="text-xl font-semibold">Convite para morador</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha o apartamento. O link expira em 10 minutos, só pode ser usado uma vez e deixa de contar como convite ativo depois disso.
        </p>
      </div>
      <form action={formAction} className="mt-5 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <input type="hidden" name="invite_type" value="resident" />
        <div className="space-y-2">
          <Label htmlFor="apartment_id">Apartamento do morador</Label>
          <select
            id="apartment_id"
            name="apartment_id"
            required
            defaultValue={selectedApartmentId}
            className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Escolha um apartamento</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.blocks?.name ?? "Bloco"} - Apartamento {apartment.number}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do morador opcional</Label>
            <Input id="email" name="email" type="email" placeholder="morador@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone opcional</Label>
            <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gerar convite
          </Button>
        </div>
      </form>

      {state.status === "error" ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-destructive">
          {state.message}
        </div>
      ) : null}

      {state.inviteUrl ? (
        <div className="mt-5 space-y-3 rounded-lg border bg-muted p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Link do apartamento criado</p>
          </div>
          <p className="break-all text-sm text-muted-foreground">{state.inviteUrl}</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            Este convite expira em 10 minutos. Depois de usado ou expirado, ele não aparece mais e libera espaço para outro convite.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.inviteUrl ?? "");
                setCopied(true);
              }}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.whatsappText ?? "");
                setCopied(true);
              }}
            >
              <Mail className="h-4 w-4" />
              Copiar mensagem
            </Button>
          </div>
          <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">
            {state.whatsappText}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
