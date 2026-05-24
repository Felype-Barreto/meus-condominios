import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Acordo de Tratamento de Dados do Meus Condomínios",
  description:
    "Documento base sobre responsabilidades de tratamento de dados entre Meus Condomínios e condomínio assinante.",
  path: "/tratamento-de-dados",
});

const sections = [
  {
    id: "partes",
    title: "1. Partes",
    body: [
      "Este documento apresenta uma base simples para orientar o tratamento de dados entre o Meus Condomínios, como fornecedor da plataforma, e o condomínio assinante, administrador ou responsável contratado, como cliente.",
      "Ele não substitui contrato empresarial completo nem revisão jurídica específica. Condomínios, administradoras e empresas podem precisar adaptar este documento ao seu caso concreto.",
    ],
  },
  {
    id: "papeis",
    title: "2. Papéis no tratamento",
    body: [
      "Para dados de moradores, apartamentos, encomendas, solicitações, documentos, visitantes e comunicações, o condomínio normalmente decide as finalidades e os meios principais de tratamento.",
      "Nesses casos, o Meus Condomínios processa dados para prestar o serviço e pode atuar como operador, conforme o contexto e a relação contratual.",
      "Para dados de conta, cobrança, segurança, prevenção de abuso, suporte e melhoria da plataforma, o Meus Condomínios pode atuar com maior autonomia e, conforme o caso, como controlador.",
    ],
  },
  {
    id: "finalidade",
    title: "3. Finalidade do tratamento",
    body: [
      "Os dados são tratados para prestação do serviço, autenticação, organização do condomínio, comunicação com moradores, reservas, encomendas, solicitações, operação de guarita, segurança, auditoria, cobrança e suporte.",
      "O tratamento também pode ocorrer para cumprir obrigações legais, responder solicitações de titulares, prevenir fraude, investigar abuso e manter registros necessários à operação.",
    ],
  },
  {
    id: "categorias",
    title: "4. Categorias de dados",
    body: [
      "As categorias podem incluir dados cadastrais, dados de contato, dados de unidade ou apartamento, papel/função no condomínio, dados de uso, comunicações, reservas, solicitações, encomendas, documentos, logs e preferências de privacidade.",
      "Também podem existir dados de pagamento, dados de visitantes quando o QR público for usado, dados de WhatsApp quando houver opt-in e informações de auditoria relacionadas às ações realizadas.",
    ],
  },
  {
    id: "condominio",
    title: "5. Obrigações do condomínio",
    body: [
      "O condomínio deve garantir que possui base legal, autorização ou justificativa adequada para cadastrar e tratar dados de moradores, proprietários, visitantes, funcionários, prestadores e contatos.",
      "Também deve informar moradores quando necessário, configurar permissões corretamente, evitar dados excessivos, manter cadastros atualizados e não usar a plataforma para finalidade ilícita, abusiva ou incompatível com a rotina condominial.",
      "Quando atuar como controlador, o condomínio deve atender solicitações de titulares, orientar seus usuários e responder por decisões sobre conteúdo, permissões e uso dos dados.",
    ],
  },
  {
    id: "morai",
    title: "6. Obrigações do Meus Condomínios",
    body: [
      "O Meus Condomínios deve processar dados para prestar o serviço contratado, aplicar controles técnicos e organizacionais razoáveis, restringir acesso interno, manter logs quando aplicável e apoiar solicitações de titulares dentro dos limites técnicos e contratuais.",
      "O Meus Condomínios também deve analisar incidentes relevantes, tomar medidas de mitigação quando necessário e comunicar eventos aplicáveis conforme política definida, contrato e legislação.",
    ],
  },
  {
    id: "suboperadores",
    title: "7. Suboperadores e fornecedores",
    body: [
      "O Meus Condomínios pode usar provedores de hospedagem, backend, banco de dados, armazenamento, autenticação, pagamento, comunicação, e-mail, suporte, analytics ou anúncios quando aplicável.",
      "Esses fornecedores podem incluir Supabase ou infraestrutura equivalente, gateways de pagamento e provedores de comunicação como WhatsApp/Meta quando o recurso estiver ativado.",
      "O uso desses fornecedores deve ocorrer conforme a finalidade do serviço e com medidas razoáveis de segurança e confidencialidade.",
    ],
  },
  {
    id: "seguranca",
    title: "8. Segurança",
    body: [
      "O Meus Condomínios adota controles como autenticação, permissões por cargo, RLS, separação por condomínio, logs, storage privado, controle de acesso, backups e validações no servidor.",
      "Essas medidas reduzem riscos, mas não eliminam todos os riscos. O condomínio também deve revisar acessos, treinar usuários, proteger senhas e evitar compartilhamento indevido de dados.",
    ],
  },
  {
    id: "incidentes",
    title: "9. Incidentes",
    body: [
      "Em caso de suspeita de incidente, o Meus Condomínios realizará análise inicial, poderá aplicar medidas de mitigação e avaliará a necessidade de comunicação ao condomínio ou a terceiros conforme o caso.",
      `O canal para comunicar suspeitas de incidente, abuso ou vazamento é ${officialContact}.`,
    ],
  },
  {
    id: "retencao",
    title: "10. Retenção e exclusão",
    body: [
      "Dados podem ser mantidos enquanto o serviço estiver ativo e pelo período necessário para operação, suporte, auditoria, segurança, prevenção de fraude, cumprimento de obrigações legais ou exercício regular de direitos.",
      "Após cancelamento, pode haver prazo de retenção para exportação e encerramento operacional. Backups podem permanecer por período limitado antes de expiração ou substituição.",
      "Quando aplicável, o condomínio pode solicitar exportação antes da exclusão, observando permissões, segurança e responsabilidades sobre os dados.",
    ],
  },
  {
    id: "contato",
    title: "11. Contato",
    body: [
      `Dúvidas sobre tratamento de dados, incidentes, solicitações de titulares ou revisão deste documento podem ser enviadas para ${officialContact}.`,
    ],
  },
];

export default function DataProcessingAgreementPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dados</p>
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
              Acordo de Tratamento de Dados
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Documento base para explicar responsabilidades de tratamento de dados entre o Meus Condomínios e o condomínio assinante.
              Ele foi escrito em linguagem simples e pode exigir revisão jurídica para contratos empresariais.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Última atualização: 20 de maio de 2026.</p>
          </Card>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[
              { label: "Papéis claros", icon: FileText },
              { label: "RLS e permissões", icon: LockKeyhole },
              { label: "Logs e auditoria", icon: Database },
              { label: "Apoio à privacidade", icon: ShieldCheck },
            ].map(({ label, icon: Icon }) => (
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
        </div>
      </div>
    </section>
  );
}
