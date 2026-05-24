import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CommunicationLockedLayout({
  params,
}: {
  children: ReactNode;
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name")
    .eq("id", condoId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Comunicação avançada
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Canais, disparos automáticos, relatórios, modelos e créditos ficarão
          disponíveis nos planos Pro e Total.
        </p>
      </div>

      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-muted/45" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Recurso suspenso no lançamento</h2>
                <StatusBadge tone="warning">Pro e Total em breve</StatusBadge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Para controlar bem o lançamento, o Meus Condomínios começa com Avisos no app
                e WhatsApp manual. A automação por canais será liberada depois.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/app/${condoId}/comunicados`}>Ir para Avisos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/whatsapp`}>WhatsApp manual</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
