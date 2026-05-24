import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Política de cancelamento e reembolso do Meus Condomínios",
  description:
    "Entenda planos, cobrança, cancelamento, reembolso, créditos WhatsApp, add-ons, downgrade e retenção de dados no Meus Condomínios.",
  path: "/politica-de-cancelamento",
});

const highlightCards = [
  { label: "Planos claros", icon: CreditCard },
  { label: "Reembolso analisado", icon: RotateCcw },
  { label: "Créditos WhatsApp", icon: MessageCircle },
  { label: "Dados preservados", icon: ShieldCheck },
];

const sections = [
  {
    id: "planos",
    title: "1. Planos e add-ons",
    body: [
      "O Meus Condomínios pode oferecer plano Grátis, Premium, Pro e Total, além de add-ons como pacotes de créditos WhatsApp, canal extra ou recursos avançados.",
      "Cada plano possui limites próprios de blocos, apartamentos, usuários, canais, armazenamento, permissões, relatórios, automações e créditos WhatsApp.",
    ],
  },
  {
    id: "cobranca",
    title: "2. Cobrança",
    body: [
      "Planos pagos podem ser cobrados mensalmente ou anualmente, conforme a opção contratada. Quando houver renovação automática, ela ocorrerá de acordo com a configuração do gateway de pagamento.",
      "A cobrança pode ser feita por gateway externo quando implementado. Impostos, taxas, tarifas e regras de contestação podem depender do provedor de pagamento e da legislação aplicável.",
    ],
  },
  {
    id: "cancelamento",
    title: "3. Cancelamento",
    body: [
      "O cliente pode cancelar a qualquer momento. A regra recomendada do Meus Condomínios é manter o acesso ao plano pago até o fim do período já pago.",
      "Após o fim do ciclo, o condomínio pode voltar para o plano grátis ou ficar limitado conforme as regras vigentes. Recursos acima do limite podem ficar bloqueados até upgrade, ajuste de uso ou contratação de add-on.",
    ],
  },
  {
    id: "reembolso",
    title: "4. Reembolso",
    body: [
      "Quando aplicável, a contratação inicial pode ter reembolso integral dentro de 7 dias, conforme direito de arrependimento e condições legais.",
      "Pagamentos duplicados ou erros técnicos serão analisados. Depois do prazo, o reembolso pode não ser obrigatório, salvo falha comprovada do serviço, regra específica do plano ou obrigação legal.",
      "Planos anuais podem ter regra própria. Créditos WhatsApp e add-ons podem ter política específica, informada antes da compra.",
    ],
  },
  {
    id: "creditos",
    title: "5. Créditos WhatsApp",
    body: [
      "Créditos incluídos no plano renovam mensalmente. Créditos não usados podem expirar ao fim do ciclo, conforme a regra do plano contratado.",
      "Envio manual não consome crédito. Envio automático consome crédito conforme o tipo de mensagem, canal e status do provedor.",
      "Falhas podem ou não consumir crédito conforme o retorno do provedor. A arquitetura do Meus Condomínios prevê registro de logs e possibilidade de reembolso de crédito quando aplicável.",
    ],
  },
  {
    id: "downgrade",
    title: "6. Downgrade",
    body: [
      "Se o cliente reduzir o plano, recursos acima do novo limite podem ser bloqueados. Dados não devem ser excluídos imediatamente sem aviso operacional razoável.",
      "O administrador deve ajustar blocos, usuários, canais, armazenamento, áreas comuns ou automações se o condomínio ficar acima do novo limite.",
    ],
  },
  {
    id: "inadimplencia",
    title: "7. Inadimplência",
    body: [
      "Quando houver falha de pagamento, o Meus Condomínios poderá notificar antes de suspender recursos pagos. Pode existir período de tolerância conforme regra comercial vigente.",
      "Durante inadimplência, automações, add-ons, relatórios, exportações ou recursos pagos podem ser suspensos. Dados podem ser mantidos por prazo operacional para regularização, exportação ou obrigações legais.",
    ],
  },
  {
    id: "dados",
    title: "8. Dados após cancelamento",
    body: [
      "Antes da exclusão definitiva, o condomínio pode solicitar exportação de dados quando aplicável. Backups podem permanecer por período limitado por segurança, auditoria e obrigações legais.",
      "Após o prazo de retenção definido operacionalmente, dados podem ser excluídos ou anonimizados, salvo quando houver base legítima para manutenção.",
    ],
  },
];

export default function CancellationPolicyPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Assinatura</p>
            <h2 className="mt-2 text-lg font-semibold">Sumário</h2>
            <nav className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {sections.map((section) => (
                <Link key={section.id} href={`#${section.id}`} className="rounded-md px-2 py-1.5 hover:bg-muted hover:text-foreground">
                  {section.title.replace(/^\d+\.\s/, "")}
                </Link>
              ))}
            </nav>
          </Card>
        </aside>

        <div>
          <Card className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-primary">Meus Condomínios</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">
              Política de cancelamento e reembolso
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Regras claras para assinatura, cobrança, downgrade, créditos WhatsApp, add-ons, cancelamento e pedidos de reembolso.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Última atualização: 20 de maio de 2026.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/cadastro">
                  Criar condomínio grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/precos">Ver planos</Link>
              </Button>
            </div>
          </Card>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {highlightCards.map(({ label, icon: Icon }) => (
              <Card key={label} className="p-4">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{label}</p>
              </Card>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {sections.map((section) => (
              <Card key={section.id} id={section.id} className="scroll-mt-24 p-5 sm:p-6">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-5 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Contato</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Para dúvidas sobre assinatura, cancelamento, reembolso, cobrança duplicada ou créditos, envie e-mail para{" "}
              <a className="font-semibold text-primary hover:text-[#5F432C]" href={`mailto:${officialContact}`}>
                {officialContact}
              </a>
              .
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
