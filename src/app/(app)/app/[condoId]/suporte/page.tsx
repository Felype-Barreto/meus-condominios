import Link from "next/link";
import { LifeBuoy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { SupportTicketList } from "@/components/support/support-ticket-list";
import { officialContact } from "@/lib/app-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CondoSupportPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: tickets }] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase
      .from("support_tickets")
      .select("id,category,subject,message,status,priority,metadata,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Suporte do condomínio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Abra e acompanhe chamados ligados a este condomínio. Use categorias
            corretas para não perder pedidos de cobrança, cancelamento, LGPD ou
            problemas técnicos.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`mailto:${officialContact}`}>
            <Mail className="h-4 w-4" />
            {officialContact}
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <SupportTicketForm condominiumId={condoId} source="condo_support" />
        <Card className="p-5">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Pedidos sensíveis</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cancelamento, reembolso, privacidade e segurança devem ficar
            registrados. Evite tratar assuntos sensíveis apenas por grupo de
            WhatsApp.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/assinatura/cancelamento`}>
                Cancelamento e reembolso
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/configuracoes/dados`}>
                Dados e retenção
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/seguranca/incidentes`}>
                Incidentes de segurança
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Chamados deste condomínio</h2>
        <SupportTicketList tickets={(tickets ?? []) as never} />
      </section>
    </div>
  );
}
