import { LegalPage } from "@/components/public/legal-page";

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Política de Cookies"
      description="O Meus Condomínios usa cookies e armazenamento local com moderação para manter o serviço funcional, seguro e compatível com as preferências do usuário."
      sections={[
        {
          title: "1. Cookies essenciais",
          body: [
            "São necessários para login, autenticação, segurança, prevenção de abuso, manutenção de sessão, preferências básicas e funcionamento do produto. Eles não podem ser desativados pelo painel de consentimento.",
          ],
        },
        {
          title: "2. Cookies de medição",
          body: [
            "Quando autorizados, podem ajudar a entender uso agregado do produto, páginas acessadas, erros e desempenho. Eles servem para melhorar o Meus Condomínios sem liberar acesso indevido a dados internos do condomínio.",
          ],
        },
        {
          title: "3. Cookies de anúncios",
          body: [
            "Quando autorizados, podem permitir anúncios discretos em condomínios do plano grátis. O Meus Condomínios não carrega anúncios em login, cadastro, páginas legais, QR público ou telas sensíveis.",
            "Se não houver consentimento para anúncios ou se a configuração de anúncios estiver vazia, os slots não são carregados.",
          ],
        },
        {
          title: "4. Como gerenciar",
          body: [
            "Você pode aceitar essenciais, aceitar todos, rejeitar não essenciais ou configurar categorias no banner de cookies.",
            "Depois da primeira escolha, o botão flutuante \"Cookies\" permite alterar suas preferências.",
          ],
        },
        {
          title: "5. Relação com LGPD",
          body: [
            "Cookies baseados em consentimento devem ser apresentados de forma clara, com opção de recusa e mudança posterior. O Meus Condomínios mantém essa estrutura para apoiar uma experiência mais transparente.",
          ],
        },
      ]}
    />
  );
}
