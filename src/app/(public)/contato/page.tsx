import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { createSeoMetadata } from "@/lib/seo";
import { officialContact } from "@/lib/app-data";

export const metadata: Metadata = createSeoMetadata({
  title: "Contato do Meus Condomínios",
  description:
    "Fale com o Meus Condomínios sobre suporte, cobrança, cancelamento, reembolso, privacidade, segurança, WhatsApp ou dúvidas comerciais.",
  path: "/contato",
});

const links = [
  ["Termos de Uso", "/termos"],
  ["Privacidade", "/privacidade"],
  ["Cancelamento e reembolso", "/politica-de-cancelamento"],
  ["Segurança", "/seguranca"],
  ["Suporte", "/suporte"],
];

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <p className="text-sm font-semibold text-primary">Contato</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal">
          Fale com o Meus Condomínios
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
          Use este canal para dúvidas comerciais, suporte, cobrança,
          cancelamento, reembolso, privacidade, segurança, WhatsApp ou parcerias.
          O suporte é feito por e-mail e chamados. Prazos podem variar conforme
          análise e volume de solicitações.
        </p>
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Mail className="h-5 w-5 text-primary" />
            <a href={`mailto:${officialContact}`} className="hover:text-primary">
              {officialContact}
            </a>
          </div>
          <div className="mt-4 flex gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            Para agilizar, informe nome, e-mail, condomínio relacionado,
            categoria do pedido e uma descrição objetiva.
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <Button key={href} asChild variant="outline" size="sm">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <SupportTicketForm showPublicFields source="public_contact" />
    </section>
  );
}
