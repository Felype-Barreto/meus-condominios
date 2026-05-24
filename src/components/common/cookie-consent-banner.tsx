"use client";

import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cookiePreferencesKey,
  defaultCookiePreferences,
  type CookiePreferences,
} from "@/lib/ads";

function readPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(cookiePreferencesKey);
    return stored ? { ...defaultCookiePreferences(), ...JSON.parse(stored) } : null;
  } catch {
    return null;
  }
}

function savePreferences(preferences: CookiePreferences) {
  window.localStorage.setItem(cookiePreferencesKey, JSON.stringify(preferences));
  window.dispatchEvent(new Event("morai:cookies-updated"));
}

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedPreferences = readPreferences();

      setAnalytics(storedPreferences?.analytics ?? false);
      setAds(storedPreferences?.ads ?? false);
      setVisible(!storedPreferences);
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function persist(next: Pick<CookiePreferences, "analytics" | "ads">) {
    savePreferences({
      essential: true,
      analytics: next.analytics,
      ads: next.ads,
      updatedAt: new Date().toISOString(),
    });
    setAnalytics(next.analytics);
    setAds(next.ads);
    setVisible(false);
    setConfiguring(false);
  }

  if (!mounted) return null;

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-lg hover:text-foreground"
      >
        Cookies
      </button>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-lg border bg-card p-4 shadow-xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold">Preferências de cookies</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Usamos cookies essenciais para login, segurança e preferências. Com
              seu consentimento, também podemos usar cookies de medição e
              anúncios nos condomínios do plano grátis.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfiguring((value) => !value)}
          >
            <Settings2 className="h-4 w-4" />
            Configurar
          </Button>
        </div>

        {configuring ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">Essenciais</span>
              <span className="mt-1 block text-muted-foreground">
                Sempre ativos para autenticação e segurança.
              </span>
              <input className="mt-3" type="checkbox" checked readOnly />
            </label>
            <label className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">Medição</span>
              <span className="mt-1 block text-muted-foreground">
                Ajuda a entender uso e melhorar o produto.
              </span>
              <input
                className="mt-3 accent-[#7C5C3E]"
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
            </label>
            <label className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">Anúncios</span>
              <span className="mt-1 block text-muted-foreground">
                Permite AdSense discreto no plano grátis.
              </span>
              <input
                className="mt-3 accent-[#7C5C3E]"
                type="checkbox"
                checked={ads}
                onChange={(event) => setAds(event.target.checked)}
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => persist({ analytics: false, ads: false })}
          >
            Rejeitar não essenciais
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => persist({ analytics, ads })}
          >
            Salvar preferências
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => persist({ analytics: false, ads: false })}
          >
            Aceitar essenciais
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => persist({ analytics: true, ads: true })}
          >
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
