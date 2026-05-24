"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSupportTicketAction,
  type SupportTicketState,
} from "@/lib/actions/support";
import { supportCategoryLabels } from "@/lib/support";

const initialState: SupportTicketState = { status: "idle" };

export function SupportTicketForm({
  condominiumId,
  source = "support_form",
  showPublicFields = false,
}: {
  condominiumId?: string;
  source?: string;
  showPublicFields?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    createSupportTicketAction,
    initialState,
  );

  return (
    <Card className="p-6">
      <Mail className="h-7 w-7 text-primary" />
      <h2 className="mt-4 text-xl font-semibold">Abrir chamado</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Descreva o pedido com clareza. O retorno depende da análise e do volume
        de solicitações.
      </p>

      {state.message ? (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm font-medium ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-success"
              : "border-red-200 bg-red-50 text-destructive"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="source" value={source} />
        {condominiumId ? (
          <input type="hidden" name="condominium_id" value={condominiumId} />
        ) : null}

        {showPublicFields ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-name">Nome</Label>
              <Input id="support-name" name="name" placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">E-mail</Label>
              <Input
                id="support-email"
                name="email"
                type="email"
                placeholder="voce@email.com"
              />
            </div>
          </div>
        ) : null}

        {!condominiumId && showPublicFields ? (
          <div className="space-y-2">
            <Label htmlFor="support-condo">ID do condomínio, se souber</Label>
            <Input id="support-condo" name="condominium_id" placeholder="Opcional" />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="support-category">Categoria</Label>
          <select
            id="support-category"
            name="category"
            required
            className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Object.entries(supportCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-subject">Assunto</Label>
          <Input
            id="support-subject"
            name="subject"
            required
            placeholder="Ex.: dúvida sobre cobrança"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-message">Mensagem</Label>
          <textarea
            id="support-message"
            name="message"
            required
            className="min-h-36 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Conte o que aconteceu, qual condomínio está relacionado e como podemos ajudar."
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar chamado
        </Button>
      </form>
    </Card>
  );
}
