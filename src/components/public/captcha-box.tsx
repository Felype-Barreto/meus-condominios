"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset?: (widgetId?: string) => void;
    };
  }
}

export function CaptchaBox({ onTokenChange }: { onTokenChange: (token: string) => void }) {
  const rawId = useId();
  const elementId = `turnstile-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [scriptReady, setScriptReady] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || renderedRef.current || !window.turnstile) return;

    window.turnstile.render(`#${elementId}`, {
      sitekey: siteKey,
      theme: "light",
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
    renderedRef.current = true;
  }, [elementId, onTokenChange, scriptReady, siteKey]);

  if (!siteKey) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
        <Label htmlFor="captcha_fallback">Verificação anti-bot</Label>
        <p className="text-xs leading-5 text-muted-foreground">
          Para ambiente local sem chave de captcha, digite <strong>CONDOMINIO</strong>.
        </p>
        <Input id="captcha_fallback" name="captcha_fallback" placeholder="Digite CONDOMINIO" autoComplete="off" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/50 p-3">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <p className="mb-3 text-sm font-semibold">Verificação anti-bot</p>
      <div id={elementId} />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Esta etapa ajuda a reduzir cadastros automatizados e abuso da plataforma.
      </p>
    </div>
  );
}
