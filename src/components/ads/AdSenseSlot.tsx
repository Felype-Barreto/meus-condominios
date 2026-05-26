"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useCanShowAds } from "@/hooks/useCanShowAds";
import { adsConfig, isAdRouteAllowed } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseSlot({
  plan,
  pathname,
  slot = adsConfig.dashboardSlot,
  label = "Publicidade",
  devFallback = true,
}: {
  plan?: string | null;
  pathname?: string;
  slot?: string;
  label?: string;
  devFallback?: boolean;
}) {
  const routeAllowed = isAdRouteAllowed(pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/"));
  const canShowAds = useCanShowAds({ plan, pathname, safePlacement: routeAllowed });
  const canShowFallback = devFallback && plan === "free" && routeAllowed && !adsConfig.clientId;

  useEffect(() => {
    if (!canShowAds || !slot) return;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers and preview environments can stop AdSense.
    }
  }, [canShowAds, slot]);

  if (!canShowAds || !slot) {
    if (!canShowFallback || process.env.NODE_ENV === "production") return null;

    return (
      <Card className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          Espaço reservado para publicidade discreta no plano grátis. Configure `NEXT_PUBLIC_ADSENSE_CLIENT_ID` para ativar em produção.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ins
        className="adsbygoogle block min-h-24"
        style={{ display: "block" }}
        data-ad-client={adsConfig.clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </Card>
  );
}
