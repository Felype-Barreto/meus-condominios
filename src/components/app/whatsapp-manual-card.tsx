"use client";

import { Copy, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createManualWhatsAppShareAction,
  type WhatsAppActionState,
} from "@/app/(app)/app/[condoId]/whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  whatsappShareTypeLabels,
  type WhatsAppShareType,
} from "@/lib/whatsapp-share";

const initialState: WhatsAppActionState = { status: "idle" };

const shareTypes = Object.entries(whatsappShareTypeLabels) as [
  WhatsAppShareType,
  string,
][];

export function WhatsAppManualCard({
  condoId,
  condominiumName,
}: {
  condoId: string;
  condominiumName: string;
}) {
  const [state, action, pending] = useActionState(
    createManualWhatsAppShareAction,
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

  async function nativeShare() {
    if (!state.text) return;

    if (navigator.share) {
      try {
        await navigator.share({ text: state.text });
        setShared(true);
        window.setTimeout(() => setShared(false), 1600);
      } catch {
        await copyText();
      }
      return;
    }

    await copyText();
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">WhatsApp manual</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escolha o tipo, gere o texto e compartilhe manualmente. O Meus Condomínios não
            envia automaticamente e não consome créditos neste modo.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-foreground">
        O envio automático por WhatsApp ficará disponível apenas nos planos Pro
        e Total, quando forem liberados.
      </div>

      <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="condominium_id" value={condoId} />
        <input type="hidden" name="condominium_name" value={condominiumName} />
        <select
          name="type"
          className="h-11 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          {shareTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input name="phone" placeholder="Telefone opcional para abrir WhatsApp" />
        <Input name="title" placeholder="Título, área comum ou assunto" />
        <Input name="apartment" placeholder="Apartamento, se aplicável" />
        <Input name="date" placeholder="Data, se aplicável" />
        <Input name="time" placeholder="Horário, se aplicável" />
        <Input
          name="link"
          placeholder="Link do Meus Condomínios, convite ou QR público"
          className="md:col-span-2"
        />
        <textarea
          name="body"
          maxLength={1000}
          className="min-h-32 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:col-span-2"
          placeholder="Mensagem, descrição da encomenda ou observação."
        />
        <Button disabled={pending} className="md:w-fit">
          <MessageCircle className="h-4 w-4" />
          {pending ? "Gerando..." : "Gerar texto"}
        </Button>
      </form>

      {state.message ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            state.status === "success"
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {state.text ? (
        <div className="mt-4 rounded-lg border bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm leading-6">{state.text}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={copyText}>
              <Copy className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar mensagem"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={nativeShare}>
              <Share2 className="h-4 w-4" />
              {shared ? "Compartilhado" : "Compartilhar no WhatsApp"}
            </Button>
            {state.waMeUrl ? (
              <Button asChild size="sm">
                <a href={state.waMeUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Abrir WhatsApp
                </a>
              </Button>
            ) : null}
            {state.shareUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={state.shareUrl} target="_blank" rel="noreferrer">
                  Compartilhar via wa.me
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
