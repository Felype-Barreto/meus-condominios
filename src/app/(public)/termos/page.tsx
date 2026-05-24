import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Termos de Uso do Meus Condomínios",
  description:
    "Termos de Uso do Meus Condomínios para condomínios, síndicos, administradores, moradores, guarita, proprietários e administradoras.",
  path: "/termos",
});

const sections = [
  {
    id: "o-que-e",
    title: "1. O que é o Meus Condomínios",
    body: [
      "O Meus Condomínios é uma plataforma online criada para auxiliar condomínios na organização de comunicados, reservas de áreas comuns, encomendas, solicitações, QR Code público, permissões por cargo e canais de comunicação.",
      "O Meus Condomínios é uma ferramenta de apoio à rotina condominial. Ele não substitui obrigações legais, contábeis, administrativas, fiscais, trabalhistas, assembleares ou jurídicas do condomínio, do síndico, da administradora ou dos demais responsáveis.",
      "Decisões sobre gestão, regras internas, aprovação de moradores, publicação de comunicados, contratação de serviços, cobrança, assembleias e uso de dados continuam sob responsabilidade do condomínio e de seus representantes autorizados.",
    ],
  },
  {
    id: "quem-pode-usar",
    title: "2. Quem pode usar",
    body: [
      "Podem usar o Meus Condomínios condomínios, síndicos, administradores, moradores, proprietários, porteiros, equipes de guarita/cancela/portaria e administradoras, quando aplicável.",
      "Cada pessoa deve acessar a plataforma com seu próprio usuário e apenas dentro das permissões concedidas pelo condomínio. O uso por menores de idade, quando ocorrer, deve ser supervisionado pelos responsáveis legais e autorizado conforme as regras do condomínio.",
    ],
  },
  {
    id: "responsabilidade-condominio",
    title: "3. Responsabilidade do condomínio assinante",
    body: [
      "O condomínio assinante, seus administradores e síndicos são responsáveis pelos dados inseridos na plataforma, pelos convites enviados, pelas aprovações de usuários, pelo conteúdo publicado e pelas permissões configuradas.",
      "O condomínio deve possuir autorização, base legal ou justificativa adequada para cadastrar moradores, proprietários, contatos, apartamentos, telefones, e-mails, documentos, visitantes e demais informações tratadas no Meus Condomínios.",
      "O condomínio também é responsável por revisar quem tem acesso, remover usuários que não devem mais acessar, configurar corretamente os cargos e orientar portaria, moradores e administradores sobre o uso adequado da plataforma.",
      "Comunicados, documentos, mensagens, ocorrências, respostas e demais conteúdos publicados pelo condomínio devem ser lícitos, respeitosos e compatíveis com a finalidade condominial.",
    ],
  },
  {
    id: "responsabilidade-usuarios",
    title: "4. Responsabilidade dos usuários",
    body: [
      "Usuários devem manter seus dados corretos, proteger sua senha, não compartilhar credenciais e avisar a administração do condomínio ou o Meus Condomínios em caso de suspeita de acesso indevido.",
      "É proibido usar o sistema para abuso, perseguição, exposição indevida, constrangimento, spam, assédio, discriminação, ameaça, fraude ou qualquer finalidade incompatível com a rotina legítima do condomínio.",
      "Usuários não podem tentar acessar dados de outros condomínios, outros apartamentos ou outras pessoas sem autorização, nem publicar informações falsas, ofensivas, ilegais ou que violem direitos de terceiros.",
    ],
  },
  {
    id: "planos-limites",
    title: "5. Planos, limites e add-ons",
    body: [
      "O Meus Condomínios pode oferecer plano grátis e planos pagos, como Premium, Pro e Total. Cada plano possui recursos e limites próprios, incluindo quantidade de blocos, apartamentos, administradores, síndicos, usuários de guarita, áreas comuns, canais, créditos WhatsApp, armazenamento, relatórios, exportações e funcionalidades avançadas.",
      "Ao atingir limites do plano, determinados recursos podem ser bloqueados, reduzidos ou exigir upgrade. Esses limites podem ser aplicados tanto na interface quanto no backend, para evitar uso acima do contratado.",
      "Add-ons, como pacotes de mensagens WhatsApp, canais extras ou recursos adicionais, podem ser contratados separadamente quando disponíveis. As condições, preços, validade e limites de cada add-on devem ser informados antes da contratação.",
      "O plano grátis pode conter marca do Meus Condomínios, anúncios quando aplicável e restrições de automação, permissões avançadas, relatórios, armazenamento e canais.",
    ],
  },
  {
    id: "pagamentos",
    title: "6. Pagamentos",
    body: [
      "Planos pagos podem ser cobrados mensalmente ou anualmente, conforme a opção escolhida no momento da contratação. A renovação pode ocorrer de forma automática quando houver meio de pagamento válido e gateway configurado.",
      "Em caso de inadimplência, falha de pagamento, contestação, suspeita de fraude ou impossibilidade de cobrança, o acesso a recursos pagos pode ser limitado, suspenso ou rebaixado para um plano gratuito, quando disponível.",
      "Impostos, taxas, tarifas de gateway, encargos de cartão, emissão fiscal e demais custos aplicáveis podem variar conforme o meio de pagamento, a legislação e o modelo comercial vigente.",
      "Quando houver gateway de pagamento integrado, a finalização, aprovação, estorno ou contestação de pagamento também poderá depender das regras desse provedor.",
    ],
  },
  {
    id: "cancelamento",
    title: "7. Cancelamento",
    body: [
      "O cliente pode solicitar cancelamento do plano pago pelos canais disponíveis no produto ou pelo contato oficial. Quando a regra configurada for manter o período já pago, o plano poderá continuar ativo até o fim do ciclo contratado.",
      "Após o cancelamento ou fim do período pago, recursos pagos podem ser removidos, bloqueados ou reduzidos, incluindo automações, canais adicionais, créditos, relatórios, armazenamento, permissões avançadas e funcionalidades de planos superiores.",
      "Dados do condomínio podem ser retidos temporariamente por prazo operacional razoável para permitir exportação, suporte, auditoria, segurança, cumprimento de obrigações legais ou prevenção de fraude. Depois desse período, dados podem ser excluídos, anonimizados ou mantidos apenas quando houver base legítima.",
    ],
  },
  {
    id: "reembolso",
    title: "8. Reembolso",
    body: [
      "Quando aplicável pela legislação, o cliente poderá exercer direito de arrependimento em até 7 dias após a contratação realizada fora de estabelecimento comercial, observadas as condições legais e operacionais do caso.",
      "Após esse prazo, pedidos de reembolso serão analisados conforme a política vigente da plataforma, o plano contratado, o período de uso, a forma de pagamento, a existência de consumo de recursos e as regras do gateway.",
      "Créditos WhatsApp, add-ons, canais extras, pacotes de mensagens ou recursos consumíveis podem ter regras próprias de reembolso, expiração ou não estorno, desde que informadas antes da compra.",
      "Pagamentos duplicados, cobranças indevidas ou erro técnico comprovado serão avaliados pelo suporte para correção, crédito, estorno ou outra solução adequada.",
    ],
  },
  {
    id: "whatsapp",
    title: "9. WhatsApp e canais de comunicação",
    body: [
      "O Meus Condomínios pode oferecer recursos de apoio ao WhatsApp, incluindo compartilhamento manual, textos prontos, logs, créditos, templates, notificações privadas e estrutura para integração oficial, conforme plano e configuração.",
      "A integração depende de consentimento dos usuários quando necessário, créditos disponíveis, plano elegível, configuração técnica correta, número apto, políticas da plataforma oficial e disponibilidade de serviços externos.",
      "Não há garantia de entrega absoluta de mensagens, nem garantia de integração automática com qualquer grupo. Grupos podem depender de elegibilidade, configuração, aprovação, limitações técnicas e regras da plataforma oficial.",
      "No plano grátis, o WhatsApp funciona em modo manual, com recursos como copiar mensagem, compartilhar no WhatsApp ou abrir WhatsApp. Mensagens automáticas respeitam limites do plano, opt-in, opt-out, créditos e regras de segurança.",
      "O condomínio deve evitar enviar dados pessoais, visitantes, encomendas individuais, reclamações privadas, cobranças individuais ou informações sensíveis para grupos ou canais inadequados.",
    ],
  },
  {
    id: "qr-publico",
    title: "10. QR Code público",
    body: [
      "O QR Code público é um recurso controlado para visitantes solicitarem contato sem expor listas de moradores, telefones, apartamentos ou nomes completos publicamente.",
      "Moradores podem ter configurações de privacidade relacionadas à busca pública, contato, WhatsApp e visibilidade. O condomínio deve respeitar essas escolhas e orientar a equipe sobre o uso adequado do recurso.",
      "O condomínio é responsável por decidir onde instalar QR Codes físicos, como portaria, entrada, elevador, mural ou área comum, e por avaliar riscos de exposição, vandalismo, uso indevido ou acesso por terceiros.",
      "O QR público não deve ser usado para constranger moradores, expor dados, permitir perseguição, facilitar spam ou substituir protocolos de segurança da portaria.",
    ],
  },
  {
    id: "disponibilidade",
    title: "11. Disponibilidade",
    body: [
      "O Meus Condomínios busca manter o serviço estável e funcional, mas não promete disponibilidade ininterrupta ou ausência total de falhas.",
      "Podem ocorrer manutenções, atualizações, instabilidades de internet, falhas de infraestrutura, indisponibilidade de serviços externos, problemas de autenticação, banco de dados, WhatsApp, gateways de pagamento, e-mail, hospedagem ou outros fornecedores.",
      "Sempre que possível, manutenções planejadas e mudanças relevantes serão comunicadas de forma adequada aos usuários afetados.",
    ],
  },
  {
    id: "seguranca",
    title: "12. Segurança",
    body: [
      "O Meus Condomínios adota boas práticas de segurança, como autenticação, permissões por cargo, separação de dados por condomínio, validações no servidor, logs administrativos, armazenamento privado para documentos e controles contra abuso.",
      "Essas medidas reduzem riscos, mas nenhum sistema digital é absolutamente imune a incidentes, falhas humanas, senhas fracas, configuração incorreta, ataques externos ou uso indevido por pessoas autorizadas.",
      "Usuários e condomínios também devem colaborar com a segurança: usar senhas fortes, não compartilhar acesso, revisar permissões, remover usuários antigos, orientar a equipe e comunicar suspeitas rapidamente.",
    ],
  },
  {
    id: "uso-proibido",
    title: "13. Uso proibido",
    body: [
      "É proibido tentar invadir, testar vulnerabilidades sem autorização, fazer scraping, automatizar acessos abusivos, enviar spam, assediar, perseguir, expor moradores, publicar dados sensíveis indevidos ou usar a plataforma para finalidade ilegal.",
      "Também é proibido tentar burlar limites de plano, contornar permissões, acessar APIs não autorizadas, fazer engenharia reversa indevida, interferir na disponibilidade do serviço, criar contas falsas ou simular identidade de terceiros.",
      "O Meus Condomínios pode registrar tentativas suspeitas, limitar uso, bloquear ações, suspender acessos e tomar medidas cabíveis para proteger a plataforma, os condomínios e os usuários.",
    ],
  },
  {
    id: "suspensao",
    title: "14. Suspensão e encerramento",
    body: [
      "O Meus Condomínios pode suspender, limitar ou encerrar contas e condomínios em caso de abuso, inadimplência, fraude, risco de segurança, violação destes termos, ordem legal, tentativa de invasão, uso que prejudique terceiros ou descumprimento de políticas da plataforma.",
      "Quando possível e seguro, o responsável será comunicado sobre a medida. Em situações urgentes, a suspensão pode ocorrer antes da comunicação para reduzir risco de dano, vazamento ou continuidade do abuso.",
    ],
  },
  {
    id: "propriedade",
    title: "15. Propriedade intelectual",
    body: [
      "A marca Meus Condomínios, interface, identidade visual, textos, componentes, estrutura, código, documentação e elementos do produto pertencem ao proprietário do serviço ou a seus licenciadores.",
      "O conteúdo inserido pelo condomínio ou pelos usuários continua pertencendo ao condomínio, aos usuários ou a quem tiver direito sobre esse conteúdo, conforme aplicável. O Meus Condomínios recebe apenas as autorizações necessárias para operar, armazenar, processar, exibir e transmitir esses dados dentro da finalidade do serviço.",
    ],
  },
  {
    id: "alteracoes",
    title: "16. Alterações nos termos",
    body: [
      "Estes Termos de Uso podem ser atualizados para refletir mudanças no produto, planos, legislação, segurança, formas de pagamento, integrações ou práticas operacionais.",
      "Quando houver mudanças relevantes, o Meus Condomínios buscará avisar os usuários por meio adequado, como aviso no sistema, e-mail ou publicação atualizada nesta página. O uso contínuo após a atualização indica ciência dos termos vigentes.",
    ],
  },
  {
    id: "contato",
    title: "17. Contato",
    body: [
      `Dúvidas, suporte, denúncias, solicitações sobre conta, cancelamento, reembolso, privacidade ou estes Termos de Uso podem ser enviadas para ${officialContact}.`,
      "Ao entrar em contato, informe seu nome, e-mail, condomínio relacionado, papel no condomínio e uma descrição objetiva do pedido.",
    ],
  },
];

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Termos</p>
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
          <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-primary">Meus Condomínios</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">Termos de Uso</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Estes termos explicam as regras de uso do Meus Condomínios por condomínios, síndicos, administradores, moradores,
              guarita, proprietários e administradoras. O texto busca ser claro e prático, sem juridiquês excessivo.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Última atualização: 20 de maio de 2026.</p>
          </div>

          <div className="mt-5 space-y-4">
            {sections.map((section) => (
              <Card key={section.id} id={section.id} className="scroll-mt-24 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[#111827]">{section.title}</h2>
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
