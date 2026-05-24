import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SupportFaq } from "@/components/support/support-faq";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { SupportTicketList } from "@/components/support/support-ticket-list";
import { officialContact } from "@/lib/app-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppSupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tickets } = user
    ? await supabase
        .from("support_tickets")
        .select("id,category,subject,message,status,priority,metadata,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Suporte</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Meus chamados
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Acompanhe pedidos de suporte, cobrança, cancelamento, reembolso,
            WhatsApp, segurança e privacidade. O atendimento é feito por chamado
            ou e-mail, com prazo conforme análise e volume de solicitações.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`mailto:${officialContact}`}>
            <Mail className="h-4 w-4" />
            E-mail oficial
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <SupportTicketForm source="app_support" />
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Atalhos úteis</h2>
          <div className="mt-4 grid gap-3">
            <Button asChild variant="outline">
              <Link href="/app/meus-dados">Meus dados e privacidade</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/politica-de-cancelamento">Política de cancelamento</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seguranca/reportar">Reportar falha de segurança</Link>
            </Button>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Chamados anteriores</h2>
        <SupportTicketList tickets={(tickets ?? []) as never} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">FAQ rápido</h2>
        <SupportFaq />
      </section>
    </div>
  );
}
