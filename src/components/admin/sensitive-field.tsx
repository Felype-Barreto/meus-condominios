"use client";

import { useState, useTransition } from "react";
import { revealSensitiveFieldAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SensitiveField as SensitiveFieldKey } from "@/lib/admin/sensitive-data";

type SensitiveFieldProps = {
  entityType: string;
  entityId: string;
  field: SensitiveFieldKey;
  contextModule?: string;
  maskedValue?: string | null;
  label?: string;
};

export function SensitiveField({
  entityType,
  entityId,
  field,
  contextModule,
  maskedValue = "••••••",
  label,
}: SensitiveFieldProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const value = revealed ?? maskedValue ?? "••••••";

  function onReveal() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await revealSensitiveFieldAction({
          entityType,
          entityId,
          field,
          reason,
          contextModule,
        });
        setRevealed(result.value || "Sem dado cadastrado");
        setOpen(false);
        setReason("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Nao foi possivel revelar este dado.");
      }
    });
  }

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <span className="break-all font-mono text-xs">{value}</span>
      {!revealed ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              Revelar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revelar dado sensivel</DialogTitle>
              <DialogDescription>
                Informe o motivo. A acao sera registrada em log e o dado nao sera salvo no navegador.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex.: atendimento do chamado de suporte"
                minLength={10}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={onReveal} disabled={isPending || reason.trim().length < 10}>
                  {isPending ? "Revelando..." : "Confirmar revelacao"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </span>
  );
}
