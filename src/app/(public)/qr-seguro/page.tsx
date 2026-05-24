import type { Metadata } from "next";
import { AlertTriangle, MapPin, QrCode, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";

export const metadata: Metadata = {
  title: "QR Code seguro para visitantes | Meus Condomínios",
  description:
    "Entenda como o QR público do Meus Condomínios permite solicitação de contato sem listar moradores, apartamentos, telefones ou e-mails.",
  alternates: {
    canonical: "/qr-seguro",
  },
};

const protections = [
  "Não lista apartamentos.",
  "Não lista moradores.",
  "Não mostra telefone ou e-mail.",
  "Não confirma publicamente se uma pessoa mora em uma unidade.",
  "Usa mensagens genéricas para reduzir enumeração.",
  "Registra tentativas de abuso com hashes, sem expor a busca em texto puro nos logs.",
];

const recommendations = [
  "Cole o QR apenas em locais aprovados pelo condomínio.",
  "Revise as permissões dos moradores antes de ativar.",
  "Mantenha WhatsApp direto desativado por padrão.",
  "Oriente portaria e síndico a tratar solicitações com cuidado.",
  "Remova o QR físico se houver suspeita de uso indevido.",
];

export default function SecureQrPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">QR público</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">
            QR Code para visitantes sem expor dados dos moradores
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            O QR público do Meus Condomínios foi desenhado para receber solicitações de
            contato de forma controlada. Ele não funciona como lista de
            moradores, apartamentos, telefones ou e-mails.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/cadastro">Criar condomínio grátis</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seguranca">Ver segurança</Link>
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <QrCode className="h-8 w-8 text-primary" />
          <h2 className="mt-5 text-xl font-semibold">Como o visitante vê</h2>
          <div className="mt-5 space-y-3 rounded-lg border bg-background p-4 text-sm">
            <p className="font-semibold">Com quem você deseja falar?</p>
            <div className="rounded-lg border bg-card p-3 text-muted-foreground">
              Campo de busca
            </div>
            <div className="rounded-lg border bg-card p-3 text-muted-foreground">
              Nome, telefone e mensagem do visitante
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Mesmo quando houver correspondência autorizada, a tela mostra
              apenas mensagem genérica e cria uma solicitação controlada.
            </p>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">O que fica protegido</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              {protections.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Responsabilidade do condomínio</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O condomínio decide se o QR será ativado, onde será impresso e
              quais moradores autorizam contato público. O recurso deve ser usado
              com bom senso, em locais adequados e com revisão periódica das
              permissões.
            </p>
          </Card>

          <Card className="p-5">
            <MapPin className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Recomendações de uso</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              {recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold">Mensagens públicas seguras</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Quando há opção compatível</p>
              <p className="mt-2 text-sm text-muted-foreground">
                “Encontramos uma opção compatível. Envie sua solicitação de contato.”
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Quando não é possível concluir</p>
              <p className="mt-2 text-sm text-muted-foreground">
                “Não foi possível concluir a solicitação. Verifique os dados ou
                fale com a portaria.”
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Para dúvidas sobre privacidade, uso responsável ou denúncia de falha,
            fale com {officialContact}.
          </p>
        </Card>
      </section>
    </main>
  );
}
