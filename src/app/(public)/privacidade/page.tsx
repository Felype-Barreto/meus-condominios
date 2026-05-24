import type { Metadata } from "next";
import Link from "next/link";
import { Download, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Política de Privacidade do Meus Condomínios",
  description:
    "Entenda como o Meus Condomínios trata dados pessoais em condomínios, incluindo moradores, visitantes, WhatsApp, QR público, pagamentos, cookies e direitos dos titulares.",
  path: "/privacidade",
});

const sections = [
  {
    id: "quem-somos",
    title: "1. Quem somos",
    body: [
      `O Meus Condomínios é uma plataforma de gestão para condomínios. O contato oficial para privacidade, suporte e solicitações de dados é ${officialContact}.`,
      "Esta Política explica, de forma simples, como dados pessoais podem ser tratados no uso do Meus Condomínios.",
    ],
  },
  {
    id: "papel-morai",
    title: "2. Papel do Meus Condomínios e do condomínio",
    body: [
      "Em muitos casos, o condomínio assinante, o administrador ou o síndico decide quais dados cadastrar, quem pode acessar e para quais finalidades os dados serão usados dentro da rotina condominial.",
      "Nesses casos, o condomínio pode atuar como controlador dos dados e o Meus Condomínios fornece a plataforma para processar essas informações, podendo atuar como operador, conforme o contexto.",
      "Em outros dados, como conta do usuário, segurança da plataforma, prevenção de abuso, cobrança, suporte e melhoria do serviço, o Meus Condomínios pode atuar como controlador.",
      "A definição exata pode depender do uso real, do contrato, da convenção do condomínio e de análise jurídica específica.",
    ],
  },
  {
    id: "dados-coletados",
    title: "3. Dados pessoais que podemos tratar",
    body: [
      "Podemos tratar nome, e-mail, telefone, foto ou avatar, condomínio vinculado, bloco, apartamento, papel ou função, dados de cadastro, dados de autenticação e preferências de privacidade.",
      "Também podemos tratar registros de comunicados, confirmação de leitura, reservas, solicitações, encomendas, ocorrências, documentos enviados, logs de acesso, logs administrativos e ações realizadas no sistema.",
      "Quando o QR público for usado, podemos tratar termo pesquisado, nome e telefone do visitante quando preenchidos, mensagem enviada, solicitação de contato e logs de segurança.",
    ],
  },
  {
    id: "pagamento",
    title: "4. Dados de pagamento",
    body: [
      "Quando houver plano pago, podemos tratar plano contratado, status da assinatura, histórico de cobrança, add-ons, créditos, dados fiscais necessários e informações retornadas pelo gateway de pagamento.",
      "Quando o pagamento for processado por gateway externo, o Meus Condomínios não precisa armazenar dados completos de cartão. Esses dados ficam sob responsabilidade do provedor de pagamento, conforme as regras dele.",
    ],
  },
  {
    id: "whatsapp",
    title: "5. Dados de WhatsApp",
    body: [
      "Para recursos de WhatsApp, podemos tratar telefone, consentimento, opt-in, opt-out, logs de envio, status de mensagem, créditos usados, templates e dados técnicos necessários ao envio.",
      "Mensagens automáticas só devem ocorrer conforme plano, consentimento, créditos disponíveis, configuração técnica e regras da plataforma oficial. O modo grátis usa compartilhamento manual.",
    ],
  },
  {
    id: "qr-publico",
    title: "6. Dados do QR público",
    body: [
      "O QR público foi desenhado para permitir solicitação de contato sem listar moradores publicamente e sem exibir telefone por padrão.",
      "O sistema pode registrar dados informados voluntariamente pelo visitante, mensagem, condomínio relacionado, resultado genérico e logs para segurança e prevenção de abuso. Quando possível, buscas do QR são registradas como hash em vez de texto puro.",
      "O condomínio é responsável por decidir onde instalar QR Codes físicos e por orientar moradores e equipe sobre privacidade.",
    ],
  },
  {
    id: "qr-seguro",
    title: "6.1. Proteção anti-enumeração no QR",
    body: [
      "O QR público não deve revelar se um morador, apartamento, telefone ou e-mail existe. As mensagens públicas são genéricas tanto quando há opção compatível quanto quando não é possível concluir a solicitação.",
      "Para logs de abuso, o Meus Condomínios registra hashes de IP, navegador e termo pesquisado, evitando guardar a busca em texto puro quando ela não é necessária.",
      "O visitante envia uma solicitação controlada. O condomínio e o morador continuam responsáveis por configurar consentimentos, permissões e local de instalação do QR físico.",
    ],
  },
  {
    id: "finalidades",
    title: "7. Finalidades do tratamento",
    body: [
      "Usamos dados para criar conta, autenticar usuário, gerenciar condomínio, comunicar moradores, controlar reservas, registrar encomendas, registrar solicitações, permitir administração por síndico/admin, apoiar guarita/cancela, prestar suporte, realizar cobrança, cumprir obrigações legais e prevenir fraude ou abuso.",
      "Também usamos dados para auditoria, segurança, controle de permissões, atendimento de pedidos de titulares e melhoria da experiência da plataforma.",
    ],
  },
  {
    id: "bases-legais",
    title: "8. Bases legais",
    body: [
      "Dependendo do contexto, o tratamento pode ocorrer para execução de contrato, legítimo interesse, consentimento, cumprimento de obrigação legal ou exercício regular de direitos.",
      "Consentimento é especialmente relevante para WhatsApp automático, certas preferências de contato, exposição controlada no QR público e cookies não essenciais quando aplicável.",
    ],
  },
  {
    id: "compartilhamento",
    title: "9. Compartilhamento de dados",
    body: [
      "Dados podem ser compartilhados com provedores de hospedagem, backend, banco de dados, armazenamento, autenticação, pagamento, comunicação, e-mail, suporte, segurança e autoridades quando exigido por lei.",
      "Também podemos usar provedores como Supabase ou infraestrutura equivalente, gateways de pagamento e provedores de comunicação, como WhatsApp/Meta, quando o recurso estiver ativado.",
      "Não vendemos dados pessoais de moradores ou visitantes.",
    ],
  },
  {
    id: "seguranca",
    title: "10. Segurança",
    body: [
      "O Meus Condomínios adota boas práticas como controle de acesso, permissões por cargo, isolamento multi-tenant, políticas no banco, logs, QR público cuidadoso, telefone oculto por padrão e armazenamento privado para documentos.",
      "Apesar dessas medidas, nenhum sistema é absolutamente livre de risco. Condomínios e usuários também devem proteger senhas, revisar permissões e evitar exposição indevida de dados.",
    ],
  },
  {
    id: "direitos",
    title: "11. Direitos dos titulares",
    body: [
      "Titulares podem solicitar confirmação de tratamento, acesso, correção, exclusão, portabilidade ou exportação quando aplicável, revogação de consentimento, oposição quando aplicável e informações sobre compartilhamento.",
      "Alguns pedidos podem depender de validação de identidade, análise do condomínio controlador ou manutenção temporária por obrigação legal, segurança, auditoria ou exercício de direitos.",
    ],
  },
  {
    id: "exercer-direitos",
    title: "12. Como exercer seus direitos",
    body: [
      `Você pode usar o painel do Meus Condomínios, quando disponível, ou enviar solicitação para ${officialContact}.`,
      "Informe seu nome, e-mail, condomínio relacionado, papel no condomínio e o pedido desejado. Isso ajuda a localizar os dados e validar a solicitação com segurança.",
    ],
  },
  {
    id: "retencao",
    title: "13. Retenção dos dados",
    body: [
      "Dados podem ser mantidos enquanto a conta ou o condomínio estiver ativo e pelo período necessário para operação, suporte, auditoria, segurança, prevenção de fraude, cumprimento de obrigações legais ou exercício regular de direitos.",
      "Após cancelamento ou encerramento, pode haver retenção temporária para backup, obrigações legais e segurança. Depois disso, os dados podem ser excluídos ou anonimizados, conforme aplicável.",
    ],
  },
  {
    id: "cookies",
    title: "14. Cookies",
    body: [
      "Usamos cookies essenciais para funcionamento, login e segurança. Cookies de medição e anúncios dependem de preferência quando aplicável.",
      "Veja detalhes na Política de Cookies.",
    ],
  },
  {
    id: "menores",
    title: "15. Crianças e adolescentes",
    body: [
      "O Meus Condomínios não busca coletar dados de crianças ou adolescentes além do necessário para a finalidade condominial.",
      "Se o condomínio cadastrar dados de menores, isso deve ocorrer apenas quando necessário, com base adequada e sob responsabilidade do condomínio/controlador.",
    ],
  },
  {
    id: "alteracoes",
    title: "16. Alterações desta política",
    body: [
      "Esta Política de Privacidade pode ser atualizada para refletir mudanças no produto, legislação, integrações, segurança ou práticas operacionais.",
      "Quando houver mudanças relevantes, o Meus Condomínios buscará comunicar por meio adequado.",
    ],
  },
];

export default function PrivacyPage() {
  const mailSubject = encodeURIComponent("Solicitação de privacidade - Meus Condomínios");
  const correctionBody = encodeURIComponent("Olá, quero solicitar correção dos meus dados no Meus Condomínios.\n\nNome:\nE-mail:\nCondomínio:\nO que precisa ser corrigido:\n");
  const deletionBody = encodeURIComponent("Olá, quero solicitar exclusão ou revisão de dados no Meus Condomínios.\n\nNome:\nE-mail:\nCondomínio:\nDescrição do pedido:\n");

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Privacidade</p>
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
            <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">Política de Privacidade</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Entenda como o Meus Condomínios trata dados pessoais em condomínios, incluindo conta, moradores, visitantes,
              WhatsApp, QR público, pagamentos, cookies e direitos dos titulares.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Última atualização: 20 de maio de 2026.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/app">
                  <Download className="h-4 w-4" />
                  Acessar meus dados
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${officialContact}?subject=${mailSubject}&body=${correctionBody}`}>
                  <PencilLine className="h-4 w-4" />
                  Solicitar correção
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${officialContact}?subject=${mailSubject}&body=${deletionBody}`}>
                  <Trash2 className="h-4 w-4" />
                  Solicitar exclusão
                </a>
              </Button>
            </div>
          </Card>

          <div className="mt-5 space-y-4">
            {sections.map((section) => (
              <Card key={section.id} id={section.id} className="scroll-mt-24 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#111827]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.id === "cookies" ? (
                    <p>
                      <Link className="font-semibold text-primary hover:text-[#5F432C]" href="/cookies">
                        Ler Política de Cookies
                      </Link>
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
