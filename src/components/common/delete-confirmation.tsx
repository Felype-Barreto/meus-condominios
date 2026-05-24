"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DeleteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

type DeleteAction = (
  state: DeleteActionState,
  formData: FormData,
) => Promise<DeleteActionState>;

const initialState: DeleteActionState = { status: "idle" };

export function DeleteConfirmation({
  action,
  description,
  disabled = false,
  fields,
  title,
  triggerLabel = "Excluir",
}: {
  action: DeleteAction;
  description: string;
  disabled?: boolean;
  fields: Record<string, string>;
  title: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, pending] = useActionState(action, initialState);
  const entries = useMemo(() => Object.entries(fields), [fields]);
  const canSubmit = confirmation === "EXCLUIR" && !disabled && !pending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Trash2 className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {entries.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-foreground">
            Esta ação remove dados vinculados e pode afetar histórico, convites,
            reservas, comunicados e relatórios. Revise antes de confirmar.
          </div>
          <div className="space-y-2">
            <label htmlFor={`confirm-${fields.id ?? fields.condominium_id}`} className="text-sm font-medium">
              Digite EXCLUIR para confirmar
            </label>
            <Input
              id={`confirm-${fields.id ?? fields.condominium_id}`}
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
            />
          </div>
          {state.status !== "idle" ? (
            <p className={`text-sm font-medium ${state.status === "success" ? "text-success" : "text-destructive"}`}>
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Confirmar exclusão
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
