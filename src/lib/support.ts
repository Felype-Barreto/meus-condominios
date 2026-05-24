export const supportCategoryLabels = {
  duvida: "Dúvida",
  cobranca: "Cobrança",
  cancelamento: "Cancelamento",
  reembolso: "Reembolso",
  problema_tecnico: "Problema técnico",
  privacidade_lgpd: "Privacidade/LGPD",
  seguranca: "Segurança",
  whatsapp: "WhatsApp",
  outro: "Outro",
} as const;

export type SupportCategory = keyof typeof supportCategoryLabels;
