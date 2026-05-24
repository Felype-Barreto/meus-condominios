"use client";

import { useActionState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAbuseReportAction, type AbuseReportState } from "./actions";

const initialState: AbuseReportState = { status: "idle" };

export function AbuseReportForm() {
  const [state, formAction, isPending] = useActionState(createAbuseReportAction, initialState);

  return (
    <Card className="p-6">
      <AlertTriangle className="h-8 w-8 text-primary" />
      <h1 className="mt-5 text-3xl font-semibold tracking-normal">Denunciar abuso</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use este canal para denunciar exposição indevida, assédio, spam, uso abusivo do QR público,
        vazamento de dados ou tentativa de acesso indevido.
      </p>

      {state.message ? (
        <div className={`mt-5 rounded-lg border p-4 text-sm font-medium ${state.status === "success" ? "border-green-200 bg-green-50 text-success" : "border-red-200 bg-red-50 text-destructive"}`}>
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="condominium_id">ID do condomínio, se souber</label>
          <Input id="condominium_id" name="condominium_id" placeholder="Opcional" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reason">Motivo</label>
          <select id="reason" name="reason" required className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Selecione</option>
            <option value="assedio">Assédio, perseguição ou constrangimento</option>
            <option value="dados_sensiveis">Exposição de dados pessoais/sensíveis</option>
            <option value="spam_whatsapp">Spam ou WhatsApp sem consentimento</option>
            <option value="qr_abusivo">Uso abusivo do QR público</option>
            <option value="invasao">Tentativa de invasão ou acesso indevido</option>
            <option value="conteudo_ilegal">Conteúdo ofensivo, discriminatório ou ilegal</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="entity_type">Onde aconteceu?</label>
          <Input id="entity_type" name="entity_type" placeholder="Ex.: comunicado, WhatsApp, QR público, portaria" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="description">Descrição</label>
          <textarea id="description" name="description" required className="min-h-36 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Descreva o que aconteceu. Evite expor dados pessoais desnecessários." />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar denúncia
        </Button>
      </form>
    </Card>
  );
}
