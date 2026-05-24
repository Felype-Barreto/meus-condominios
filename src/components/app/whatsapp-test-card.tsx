"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import {
  queueWhatsAppTestAction,
  type WhatsAppActionState,
} from "@/app/(app)/app/[condoId]/whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const initialState: WhatsAppActionState = { status: "idle" };

export function WhatsAppTestCard({ condoId }: { condoId: string }) {
  const [state, action, pending] = useActionState(queueWhatsAppTestAction, initialState);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Teste controlado</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Registra um teste nos logs sem chamar a API da Meta. O envio real fica
        isolado no adapter.
      </p>
      <form action={action} className="mt-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <Button disabled={pending} variant="outline">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Testar fila
        </Button>
      </form>
      {state.message ? (
        <p
          className={`mt-4 rounded-lg border p-3 text-sm ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </Card>
  );
}
