"use client";

import { useActionState } from "react";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createSecurityIncidentReportAction,
  type SecurityIncidentReportState,
} from "./actions";

const initialState: SecurityIncidentReportState = { status: "idle" };

export function SecurityIncidentReportForm() {
  const [state, formAction, isPending] = useActionState(
    createSecurityIncidentReportAction,
    initialState,
  );

  return (
    <Card className="p-6">
      <ShieldAlert className="h-8 w-8 text-primary" />
      <h1 className="mt-5 text-3xl font-semibold tracking-normal">
        Reportar falha ou incidente
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use este canal para relatar suspeita de vazamento, acesso indevido,
        abuso, spam no WhatsApp, uso indevido do QR publico ou outro problema
        de seguranca. Se preferir, escreva para codeflowbr1@gmail.com.
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reporter_name">
              Nome
            </label>
            <Input id="reporter_name" name="reporter_name" placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reporter_email">
              E-mail para retorno
            </label>
            <Input
              id="reporter_email"
              name="reporter_email"
              type="email"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="condominium_id">
            ID do condominio, se souber
          </label>
          <Input id="condominium_id" name="condominium_id" placeholder="Opcional" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="incident_type">
            Tipo de problema
          </label>
          <select
            id="incident_type"
            name="incident_type"
            required
            className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="suspected_data_leak">Suspeita de vazamento</option>
            <option value="unauthorized_access">Acesso indevido</option>
            <option value="abusive_use">Uso abusivo</option>
            <option value="whatsapp_spam">WhatsApp sem consentimento ou spam</option>
            <option value="qr_abuse">Uso indevido do QR publico</option>
            <option value="payment_issue">Problema de pagamento</option>
            <option value="account_takeover">Conta possivelmente invadida</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="title">
            Titulo
          </label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Ex.: suspeita de acesso indevido em comunicado"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="description">
            Descricao
          </label>
          <textarea
            id="description"
            name="description"
            required
            className="min-h-36 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Conte o que aconteceu, quando percebeu e quais telas ou recursos estavam envolvidos. Evite incluir dados pessoais desnecessarios."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="affected_data">
            Dados possivelmente afetados
          </label>
          <Input
            id="affected_data"
            name="affected_data"
            placeholder="Opcional. Ex.: telefone, documento, encomenda, QR publico"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="evidence_url">
            Link de anexo ou evidencia
          </label>
          <Input
            id="evidence_url"
            name="evidence_url"
            type="url"
            placeholder="Opcional. Ex.: link de imagem ou documento"
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>
              Para urgencias, bloqueie acessos suspeitos no painel quando
              possivel e envie tambem um e-mail para codeflowbr1@gmail.com.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar relato
        </Button>
      </form>
    </Card>
  );
}
