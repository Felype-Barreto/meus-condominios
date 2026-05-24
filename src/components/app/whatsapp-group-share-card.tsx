"use client";

import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createManualWhatsAppGroupShareAction,
  type WhatsAppActionState,
} from "@/app/(app)/app/[condoId]/whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: WhatsAppActionState = { status: "idle" };

const groupMessageTypes = [
  ["urgent_announcements", "Comunicado geral"],
  ["maintenance", "Manutenção"],
  ["meetings", "Assembleia/reunião"],
  ["daily_summary", "Resumo do dia"],
  ["weekly_summary", "Resumo semanal"],
] as const;

export function WhatsAppGroupShareCard({
  condoId,
  condominiumName,
}: {
  condoId: string;
  condominiumName: string;
}) {
  const [state, action, pending] = useActionState(
    createManualWhatsAppGroupShareAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function copyText() {
    if (!state.text) return;
    await navigator.clipboard.writeText(state.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareText() {
    if (!state.text) return;

    if (navigator.share) {
      try {
        await navigator.share({ text: state.text });
        setShared(true);
        window.setTimeout(() => setShared(false), 1600);
        return;
      } catch {
        await copyText();
        return;
      }
    }

    await copyText();
  }

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-lg font-semibold">Compartilhar manualmente no grupo</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Gere textos seguros para grupos, sem telefone, visitante, encomenda
          sensível, reclamação privada ou cobrança individual.
        </p>
      </div>

      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="condominium_id" value={condoId} />
        <input type="hidden" name="condominium_name" value={condominiumName} />
        <Input name="group_name" placeholder="Nome do grupo, opcional" />
        <select
          name="category"
          className="h-11 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          {groupMessageTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input name="title" placeholder="Título do aviso" />
        <textarea
          name="body"
          maxLength={1000}
          className="min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
          placeholder="Mensagem para o grupo. Use apenas informações gerais do condomínio."
        />
        <Input name="link" placeholder="Link do Meus Condomínios, opcional" />
        <Button disabled={pending} className="w-full sm:w-fit">
          <MessageCircle className="h-4 w-4" />
          {pending ? "Preparando..." : "Preparar mensagem"}
        </Button>
      </form>

      {state.message ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {state.text ? (
        <div className="mt-4 rounded-lg border bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm leading-6">{state.text}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" onClick={copyText}>
              <Copy className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar mensagem"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={shareText}>
              <Share2 className="h-4 w-4" />
              {shared ? "Compartilhado" : "Compartilhar no WhatsApp"}
            </Button>
            {state.shareUrl ? (
              <Button asChild size="sm">
                <a href={state.shareUrl} target="_blank" rel="noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
