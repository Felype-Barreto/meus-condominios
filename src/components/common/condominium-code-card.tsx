"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CondominiumCodeCard({
  code,
  className,
  compact = false,
  helper = "Envie este código aos moradores, síndico e guarita para login no condomínio.",
}: {
  code?: string | null;
  className?: string;
  compact?: boolean;
  helper?: string;
}) {
  const [copied, setCopied] = useState(false);
  const value = code?.trim() || "codigo-indisponivel";

  async function copyCode() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código do condomínio</p>
      <div className="mt-2 flex items-center gap-2">
        <strong className={cn("break-all font-semibold tracking-normal", compact ? "text-xl" : "text-3xl")}>
          {value}
        </strong>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={copyCode}
          aria-label="Copiar código do condomínio"
          title={copied ? "Copiado" : "Copiar código"}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}
