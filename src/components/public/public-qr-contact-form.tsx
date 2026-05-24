"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import {
  submitPublicQrRequestAction,
  type PublicQrRequestState,
} from "@/app/(public)/visitante/[publicCode]/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: PublicQrRequestState = { status: "idle" };

export function PublicQrContactForm({ publicCode }: { publicCode: string }) {
  const [state, action, pending] = useActionState(
    submitPublicQrRequestAction,
    initialState,
  );

  return (
    <Card className="p-5 sm:p-6">
      <form action={action} className="space-y-4">
        <input name="public_code" type="hidden" value={publicCode} />
        <div>
          <label className="text-sm font-semibold" htmlFor="search">
            Com quem você deseja falar?
          </label>
          <Input
            id="search"
            name="search"
            autoComplete="off"
            placeholder="Nome ou apartamento"
            required
            className="mt-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold" htmlFor="visitor_name">
              Qual é o seu nome?
            </label>
            <Input
              id="visitor_name"
              name="visitor_name"
              autoComplete="name"
              placeholder="Seu nome"
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="visitor_phone">
              Seu telefone
            </label>
            <Input
              id="visitor_phone"
              name="visitor_phone"
              autoComplete="tel"
              placeholder="Opcional"
              className="mt-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="message">
            Mensagem
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={500}
            className="mt-2 min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Explique rapidamente o motivo do contato."
          />
        </div>

        {state.message ? (
          <div
            className={
              state.status === "success"
                ? "rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-success"
                : "rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-foreground"
            }
          >
            {state.message}
            {state.requestId ? (
              <Link
                href={`/visitante/solicitacao/${state.requestId}`}
                className="mt-2 block font-semibold underline"
              >
                Acompanhar solicitação
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button className="w-full" disabled={pending}>
          <Send className="h-4 w-4" />
          {pending ? "Aguarde alguns instantes..." : "Solicitar contato"}
        </Button>
      </form>
    </Card>
  );
}
