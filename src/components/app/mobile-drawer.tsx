"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SidebarContent } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";

export function MobileDrawer({
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const condoId = pathname.match(/^\/app\/([^/]+)/)?.[1] ?? "";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex h-[100dvh] w-[min(82vw,320px)] flex-col overflow-hidden border-r bg-card shadow-2xl">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              condoId={condoId}
              isPlatformAdmin={isPlatformAdmin}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
