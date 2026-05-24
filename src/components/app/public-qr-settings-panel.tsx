"use client";

import { Copy, Download, ExternalLink, QrCode, Save, ShieldCheck } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useActionState, useMemo, useRef, useState } from "react";
import {
  savePublicQrSettingsAction,
  type PublicQrSettingsState,
} from "@/app/(app)/app/[condoId]/configuracoes/qr-publico/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const initialState: PublicQrSettingsState = { status: "idle" };

type PublicQrSettingsPanelProps = {
  condoId: string;
  publicUrl: string;
  publicCode: string;
  enabled: boolean;
  message: string;
  defaultPrivacy: {
    allow_public_contact?: boolean;
    allow_name_search?: boolean;
    allow_apartment_search?: boolean;
    allow_whatsapp_redirect?: boolean;
  };
};

export function PublicQrSettingsPanel({
  condoId,
  publicUrl,
  publicCode,
  enabled,
  message,
  defaultPrivacy,
}: PublicQrSettingsPanelProps) {
  const [state, action, pending] = useActionState(
    savePublicQrSettingsAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const initialMessage = useMemo(
    () =>
      message ||
      "Informe quem deseja contatar. A administração ou o morador autorizado receberá sua solicitação.",
    [message],
  );

  function downloadQrPng() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `morai-qr-${publicCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">QR público</h2>
            <p className="text-sm text-muted-foreground">
              Link seguro para visitantes solicitarem contato.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div ref={qrRef} className="w-fit rounded-lg border bg-white p-3">
            <QRCodeCanvas value={publicUrl} size={164} fgColor="#111827" />
          </div>
          <div className="min-w-0">
            <p className="break-all text-sm font-medium">{publicUrl}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O visitante não vê lista de apartamentos, moradores ou telefones.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadQrPng}>
                <Download className="h-4 w-4" />
                Baixar PNG
              </Button>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <form action={action} className="space-y-5">
          <input name="condominium_id" type="hidden" value={condoId} />
          <label className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
            <span>
              <span className="block text-sm font-semibold">Ativar QR público</span>
              <span className="block text-sm text-muted-foreground">
                Quando desativado, a tela pública não aceita solicitações.
              </span>
            </span>
            <Switch name="enabled" defaultChecked={enabled} />
          </label>

          <div>
            <label className="text-sm font-semibold" htmlFor="message">
              Mensagem pública
            </label>
            <textarea
              id="message"
              name="message"
              defaultValue={initialMessage}
              maxLength={300}
              className="mt-2 min-h-24 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Privacidade padrão dos moradores</h3>
              <p className="text-sm text-muted-foreground">
                Usada como referência para novos cadastros e revisão manual.
              </p>
            </div>
            {[
              ["allow_public_contact", "Permitir contato pelo QR público"],
              ["allow_name_search", "Permitir busca por nome"],
              ["allow_apartment_search", "Permitir busca por apartamento"],
              ["allow_whatsapp_redirect", "Permitir WhatsApp direto via QR"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4 text-sm font-medium"
              >
                {label}
                <Switch
                  name={key}
                  defaultChecked={
                    defaultPrivacy[key as keyof typeof defaultPrivacy] === true
                  }
                />
              </label>
            ))}
            <p className="text-xs leading-5 text-muted-foreground">
              Recomendação: mantenha WhatsApp direto desativado por padrão e use
              solicitação controlada, especialmente em áreas públicas.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Checklist antes de ativar</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  O QR pode ser visto por qualquer pessoa que passar pelo local.
                  Confirme os cuidados abaixo.
                </p>
              </div>
            </div>
            {[
              ["qr_ack_public_place", "Entendo que o QR será público."],
              ["qr_ack_safe_location", "Entendo que não devo colar em locais indevidos ou sem controle do condomínio."],
              ["qr_ack_resident_consent", "Entendo que moradores devem controlar consentimento e preferências de busca."],
              ["qr_ack_phone_hidden", "Entendo que telefone não será exposto por padrão."],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm"
              >
                <input name={key} type="checkbox" className="mt-1 accent-[#7C5C3E]" />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {state.message ? (
            <p
              className={
                state.status === "success"
                  ? "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                  : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              }
            >
              {state.message}
            </p>
          ) : null}

          <Button disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
