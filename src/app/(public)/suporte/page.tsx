import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SupportFaq } from "@/components/support/support-faq";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { createSeoMetadata } from "@/lib/seo";
import { officialContact } from "@/lib/app-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Suporte do Meus Condomínios",
  description:
    "Central de suporte do Meus Condomínios para dúvidas de cobrança, cancelamento, WhatsApp, privacidade, segurança e problemas técnicos.",
  path: "/suporte",
});

export default function PublicSupportPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-primary">Suporte</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal">
            Como podemos ajudar?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Abra um chamado ou envie e-mail para o contato oficial. Pedidos de
            cobrança, cancelamento e privacidade ficam mais fáceis de acompanhar
            quando registrados com categoria e descrição.
          </p>
          <Card className="mt-6 p-5">
            <div className="flex gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Atendimento por e-mail e chamados. Pedidos críticos de acesso,
                cobrança e segurança recebem prioridade; os demais são respondidos
                conforme ordem de chegada e informações enviadas.
              </p>
            </div>
            <a
              href={`mailto:${officialContact}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-[#5F432C]"
            >
              <Mail className="h-4 w-4" />
              {officialContact}
            </a>
          </Card>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/entrar">Entrar para ver meus chamados</Link>
          </Button>
        </div>
        <SupportTicketForm showPublicFields source="public_support" />
      </div>

      <div className="mt-10">
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-2 text-2xl font-semibold">Perguntas frequentes</h2>
        </div>
        <SupportFaq />
      </div>
    </section>
  );
}
