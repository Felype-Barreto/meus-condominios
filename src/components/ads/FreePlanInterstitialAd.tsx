"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isAdRouteAllowed } from "@/lib/ads";

const storageKey = "morai-panel-navigation-count";

export function FreePlanInterstitialAd({ plan }: { plan?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (plan !== "free" || !isAdRouteAllowed(pathname)) return;
    if (lastPath.current === pathname) return;

    lastPath.current = pathname;
    const current = Number(window.localStorage.getItem(storageKey) ?? "0");
    const next = current + 1;
    window.localStorage.setItem(storageKey, String(next));

    if (next > 0 && next % 4 === 0) {
      window.setTimeout(() => setOpen(true), 0);
    }
  }, [pathname, plan]);

  if (plan !== "free") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(94vw,900px)] sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Publicidade</DialogTitle>
          <DialogDescription>
            Este anúncio ajuda a manter o plano grátis sem ocupar espaço fixo no painel.
          </DialogDescription>
        </DialogHeader>
        <AdSenseSlot
          plan={plan}
          pathname={pathname}
          label="Anúncio"
          className="min-h-[420px]"
          adClassName="min-h-[360px]"
        />
        <div className="flex justify-end">
          <Button type="button" onClick={() => setOpen(false)}>
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
