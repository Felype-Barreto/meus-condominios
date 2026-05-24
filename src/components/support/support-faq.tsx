import { Card } from "@/components/ui/card";

const groups = [
  {
    title: "Cobrança",
    items: [
      ["Como vejo meu plano?", "Acesse Assinatura no painel do condomínio para ver plano, limites, créditos e add-ons."],
      ["Cobrança duplicada", "Abra um chamado de cobrança ou reembolso com data, valor e e-mail da conta. O caso será analisado."],
      ["Add-ons WhatsApp", "Pacotes e canais extras podem ter regras próprias de validade e uso, sempre indicadas antes da contratação."],
    ],
  },
  {
    title: "Cancelamento",
    items: [
      ["Como cancelar?", "Use a tela de cancelamento da assinatura ou abra um chamado de cancelamento informando o condomínio."],
      ["Perco acesso na hora?", "A regra pode variar por plano. Em geral, recursos pagos podem ficar ativos até o fim do ciclo já pago."],
      ["Antes de excluir dados", "Baixe os dados do condomínio e revise solicitações pendentes em Configurações > Dados."],
    ],
  },
  {
    title: "WhatsApp",
    items: [
      ["O plano grátis envia automático?", "Não. No grátis, o Meus Condomínios ajuda a copiar e compartilhar mensagens manualmente."],
      ["Por que uma mensagem não foi enviada?", "Envios automáticos dependem de plano, créditos, opt-in, configuração técnica e regras da plataforma oficial."],
      ["Grupos são garantidos?", "Não. Integração oficial com grupos depende de disponibilidade, elegibilidade e configuração."],
    ],
  },
  {
    title: "Privacidade",
    items: [
      ["Como exportar meus dados?", "Acesse /app/meus-dados ou a área de privacidade dentro do painel."],
      ["Como remover WhatsApp?", "Você pode revogar consentimento em Meus dados ou Perfil > Notificações."],
      ["Meu telefone aparece público?", "O telefone fica oculto por padrão e o QR público não lista moradores nem telefones."],
    ],
  },
];

export function SupportFaq() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.title} className="p-5">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <div className="mt-4 space-y-3">
            {group.items.map(([question, answer]) => (
              <div key={question} className="rounded-lg border bg-background p-3">
                <p className="text-sm font-semibold">{question}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
