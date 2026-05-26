"use client";

import { Download, MonitorSmartphone, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function getDeviceHint() {
  if (typeof navigator === "undefined") return "generic";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export function InstallMobileCard() {
  const device = useMemo(() => getDeviceHint(), []);
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const steps =
    device === "ios"
      ? ["Abra pelo Safari.", "Toque em Compartilhar.", "Escolha Adicionar à Tela de Início."]
      : device === "android"
        ? ["Abra pelo Chrome.", "Toque no menu de três pontos.", "Escolha Instalar app ou Adicionar à tela inicial."]
        : ["Abra o site no celular.", "Use Safari no iPhone ou Chrome no Android.", "Adicione à tela inicial para entrar como app."];

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setOpen(true);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[0.8fr_1.2fr]">
        <div className="flex min-h-44 items-center justify-center bg-primary p-6 text-primary-foreground">
          <div className="relative">
            <Smartphone className="h-20 w-20" />
            <MonitorSmartphone className="absolute -right-5 -top-4 h-9 w-9 rounded-lg bg-primary-foreground p-1.5 text-primary" />
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Download className="h-4 w-4" />
            Instale no celular
          </div>
          <h2 className="mt-3 text-xl font-semibold">Use como app, sem procurar no navegador</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Button
            className="mt-5 w-full sm:w-auto"
            variant={installPrompt ? "default" : "outline"}
            type="button"
            onClick={installPrompt ? installApp : () => setOpen((current) => !current)}
          >
            {installPrompt ? "Instalar agora" : open ? "Fechar passo a passo" : "Abrir passo a passo"}
          </Button>
          {installPrompt ? (
            <Button
              className="mt-5 w-full sm:ml-2 sm:w-auto"
              variant="outline"
              type="button"
              onClick={() => setOpen((current) => !current)}
            >
              Ver passo a passo
            </Button>
          ) : null}
          {open ? (
            <div className="mt-5 rounded-lg border bg-background p-4 text-sm leading-6">
              <p className="font-semibold">Depois de instalar</p>
              <p className="mt-2 text-muted-foreground">
                O ícone aparece junto dos aplicativos do celular. Ao abrir, entre com seu e-mail ou Gmail,
                permita notificações quando o navegador perguntar e acompanhe avisos, portaria, reservas e encomendas.
              </p>
              <p className="mt-3 font-semibold">Se não aparecer a opção de instalar</p>
              <p className="mt-2 text-muted-foreground">
                Atualize o navegador, abra a página inicial do painel e procure por Adicionar à tela inicial.
                No iPhone, essa opção fica no botão Compartilhar do Safari.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
