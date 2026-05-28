import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RequestStatus = {
  found?: boolean;
  status?: string;
  resident_name?: string | null;
  whatsapp_url?: string | null;
  expires_at?: string | null;
  remaining_seconds?: number | null;
};

function remainingText(seconds?: number | null) {
  const safeSeconds = Math.max(0, Number(seconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  if (safeSeconds <= 0) return "expirada";
  if (minutes <= 0) return `${rest} segundos`;
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export default async function VisitorRequestStatusPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_contact_request_status", {
    request_id: requestId,
  });
  const status = (data ?? {}) as RequestStatus;
  const released = status.status === "contact_released";
  const releasedWithWhatsapp = released && status.whatsapp_url;
  const rejected = status.status === "rejected";
  const expired = status.status === "expired";
  const waiting = status.status === "created";

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <Card className="mx-auto max-w-xl p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageCircle className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-primary">Meus Condomínios</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Solicitação de contato
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {!status.found
            ? "Solicitação não encontrada."
            : releasedWithWhatsapp
              ? "O responsável liberou o contato."
              : released
                ? "O responsável autorizou o contato. A portaria foi avisada para orientar o acesso."
                : expired
                  ? "A solicitação expirou porque não foi respondida em 10 minutos. Tente novamente pelo QR Code."
                  : rejected
                    ? "O responsável não liberou o contato no momento."
                    : "Aguarde alguns instantes. O responsável foi avisado e tem até 10 minutos para responder."}
        </p>

        {waiting ? (
          <div className="mt-5 rounded-lg border bg-muted p-4 text-sm">
            <p className="font-semibold">Tempo restante</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {remainingText(status.remaining_seconds)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Atualize esta página para ver se o responsável respondeu.
            </p>
          </div>
        ) : null}

        {releasedWithWhatsapp ? (
          <Button asChild className="mt-6">
            <a href={status.whatsapp_url ?? "#"} target="_blank" rel="noreferrer">
              Abrir WhatsApp
            </a>
          </Button>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link href="/">Voltar</Link>
            </Button>
            {waiting ? (
              <Button asChild>
                <Link href={`/visitante/solicitacao/${requestId}`}>Atualizar status</Link>
              </Button>
            ) : null}
          </div>
        )}
      </Card>
    </main>
  );
}
