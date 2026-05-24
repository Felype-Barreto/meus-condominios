import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Política de Uso Aceitável do Meus Condomínios",
  description: "Regras para uso responsável do Meus Condomínios em condomínios, portaria, WhatsApp, QR público e comunicação interna.",
  path: "/uso-aceitavel",
});

const forbidden = [
  "assédio, perseguição, constrangimento ou vigilância abusiva",
  "exposição pública de moradores, crianças, adolescentes, visitantes ou funcionários",
  "envio de dados sensíveis em grupos ou canais públicos",
  "spam, WhatsApp sem consentimento ou mensagens repetitivas abusivas",
  "dados falsos, conteúdo ofensivo, discriminatório, ameaçador ou ilegal",
  "tentativa de invasão, scraping, engenharia reversa indevida ou uso de API não autorizado",
  "acessar outro condomínio, outro apartamento ou dados sem permissão",
  "burlar limites de plano, permissões, bloqueios ou controles de segurança",
  "usar QR público para mapear moradores, apartamentos ou rotinas",
  "publicar inadimplência individual, reclamações privadas ou dados pessoais em canais públicos",
];

export default function AcceptableUsePage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold text-primary">Uso responsável</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">Política de Uso Aceitável</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
          O Meus Condomínios organiza a rotina do condomínio, mas não pode ser usado para expor, perseguir, constranger,
          fazer spam ou divulgar dados indevidos. Esta política vale para síndicos, admins, moradores,
          proprietários, guarita e qualquer pessoa com acesso.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/denunciar">
              <AlertTriangle className="h-4 w-4" />
              Denunciar abuso
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/termos">Ver Termos de Uso</Link>
          </Button>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Uso permitido</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Use o Meus Condomínios para finalidades legítimas do condomínio: comunicados, reservas, encomendas,
            solicitações, portaria, QR público, permissões, documentos e comunicação respeitosa.
          </p>
        </Card>
        <Card className="border-red-200 bg-red-50 p-5">
          <AlertTriangle className="h-6 w-6 text-red-700" />
          <h2 className="mt-4 text-xl font-semibold text-red-950">Uso proibido</h2>
          <p className="mt-3 text-sm leading-7 text-red-900">
            Contas, conteúdos ou condomínios podem ser limitados, suspensos ou investigados em caso de abuso,
            risco de segurança ou violação desta política.
          </p>
        </Card>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Condutas proibidas</h2>
        <div className="mt-4 grid gap-3">
          {forbidden.map((item) => (
            <div key={item} className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Denúncias e análise</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Denúncias são tratadas com cuidado. O Meus Condomínios evita expor o denunciante para outros moradores e registra
          ações relevantes em auditoria quando houver vínculo com um condomínio. O condomínio também deve apurar
          situações internas com responsabilidade e respeito à privacidade.
        </p>
      </Card>
    </section>
  );
}
