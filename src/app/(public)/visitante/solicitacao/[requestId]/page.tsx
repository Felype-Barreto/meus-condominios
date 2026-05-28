import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestStatus = {
  found?: boolean;
  status?: string;
  resident_name?: string | null;
  whatsapp_url?: string | null;
};

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
                ? "O responsável autorizou o contato, mas não há WhatsApp público liberado. Aguarde a orientação da portaria."
                : rejected
                  ? "O responsável não liberou o contato no momento."
                  : "Aguarde alguns instantes. O responsável foi avisado."}
        </p>

        {releasedWithWhatsapp ? (
          <Button asChild className="mt-6">
            <a href={status.whatsapp_url ?? "#"} target="_blank" rel="noreferrer">
              Abrir WhatsApp
            </a>
          </Button>
        ) : (
          <Button asChild variant="outline" className="mt-6">
            <Link href="/">Voltar</Link>
          </Button>
        )}
      </Card>
    </main>
  );
}
