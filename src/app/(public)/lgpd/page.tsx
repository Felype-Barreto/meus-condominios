import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "LGPD no Meus Condomínios para condomínios",
  description:
    "Veja como o Meus Condomínios oferece recursos para apoiar direitos de privacidade, consentimento, segurança e gestão de dados em condomínios.",
  path: "/lgpd",
  keywords: ["LGPD condomínio", "privacidade moradores condomínio", "proteção de dados condomínio"],
});

const sections = [
  {
    id: "papeis",
    title: "Papéis no tratamento de dados",
    body: [
      "Em muitos usos do Meus Condomínios, o condomínio decide quais dados serão cadastrados, quais pessoas terão acesso e por quais finalidades os dados serão tratados. Nesses casos, o condomínio pode atuar como controlador.",
      "O Meus Condomínios fornece a plataforma, recursos técnicos, autenticação, permissões, logs e processamento necessário para operação do serviço. Dependendo do contexto, pode atuar como operador.",
      "Em dados de conta, segurança, cobrança, suporte e prevenção de abuso da própria plataforma, o Meus Condomínios pode atuar como controlador.",
    ],
  },
  {
    id: "direitos",
    title: "Direitos do titular",
    body: [
      "Titulares podem solicitar confirmação de tratamento, acesso, correção, exportação ou portabilidade quando aplicável, exclusão, revogação de consentimento, oposição quando aplicável e informações sobre compartilhamento.",
      "Alguns pedidos podem exigir validação de identidade, análise pelo condomínio responsável ou retenção temporária por obrigação legal, segurança, auditoria ou exercício regular de direitos.",
    ],
  },
  {
    id: "recursos",
    title: "Recursos do Meus Condomínios para apoiar privacidade",
    body: [
      "O sistema oferece permissões por cargo, telefone oculto por padrão, configurações de privacidade, opt-in/opt-out de WhatsApp, QR público sem listagem de moradores, logs administrativos e armazenamento privado para documentos.",
      "Esses recursos ajudam a reduzir riscos, mas dependem de configuração correta, uso responsável e revisão periódica pelo condomínio.",
    ],
  },
  {
    id: "whatsapp-qr",
    title: "WhatsApp e QR público",
    body: [
      "WhatsApp automático depende de plano, consentimento, créditos, configuração técnica e regras da plataforma oficial.",
      "O QR público registra solicitações de contato sem exibir telefone por padrão e sem listar moradores publicamente.",
    ],
  },
  {
    id: "solicitacoes",
    title: "Como solicitar acesso, correção ou exclusão",
    body: [
      `Use a área de privacidade dentro do painel ou envie e-mail para ${officialContact}.`,
      "Informe nome, e-mail, condomínio relacionado, papel no condomínio e o pedido desejado. Isso ajuda a localizar dados e validar a solicitação com segurança.",
    ],
  },
];

export default function LgpdPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold text-primary">LGPD</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">Privacidade e Proteção de Dados</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
          O Meus Condomínios oferece recursos para apoiar boas práticas de privacidade e proteção de dados em condomínios,
          sem prometer conformidade jurídica automática.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {sections.map((section) => (
            <Link key={section.id} href={`#${section.id}`} className="rounded-full border bg-background px-3 py-2 font-medium hover:bg-muted">
              {section.title}
            </Link>
          ))}
        </div>
      </Card>

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
        <h2 className="text-xl font-semibold">Política completa</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          A explicação detalhada sobre dados coletados, finalidades, bases legais, compartilhamento, cookies,
          retenção e direitos está na Política de Privacidade.
        </p>
        <Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[#5F432C]" href="/privacidade">
          Ler Política de Privacidade
        </Link>
      </Card>
    </section>
  );
}
