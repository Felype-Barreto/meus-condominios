export type CommunicationChannelType =
  | "app"
  | "whatsapp_manual"
  | "whatsapp_official"
  | "email"
  | "push";

export type CommunicationScope =
  | "all"
  | "block"
  | "apartment"
  | "role"
  | "staff"
  | "council"
  | "garage"
  | "gate";

export type CommunicationPriority = "low" | "normal" | "important" | "urgent";

export type CommunicationMessageType =
  | "announcement"
  | "maintenance"
  | "booking"
  | "package"
  | "security"
  | "meeting"
  | "summary"
  | "other";

export type CommunicationPlanLimits = {
  plan: string;
  max_channels: number;
  whatsapp_messages: number;
  automatic_1_1: boolean;
  official_groups: boolean;
  manual_groups: boolean;
  templates: boolean;
  advanced_logs: boolean;
};

export type CommunicationChannelLimit = {
  allowed: boolean;
  used: number;
  limit: number;
  percent: number;
  warn: boolean;
  blocked: boolean;
};

export const communicationChannelTypeLabels: Record<CommunicationChannelType, string> = {
  app: "App Meus Condomínios",
  whatsapp_manual: "WhatsApp manual",
  whatsapp_official: "WhatsApp oficial",
  email: "E-mail",
  push: "Push",
};

export const communicationScopeLabels: Record<CommunicationScope, string> = {
  all: "Todos",
  block: "Bloco",
  apartment: "Apartamento",
  role: "Papel",
  staff: "Funcionários",
  council: "Conselho",
  garage: "Garagem",
  gate: "Guarita/Cancela",
};

export const communicationMessageTypeLabels: Record<CommunicationMessageType, string> = {
  announcement: "Aviso geral",
  maintenance: "Manutenção",
  booking: "Agendamento",
  package: "Encomenda",
  security: "Segurança",
  meeting: "Assembleia",
  summary: "Resumo",
  other: "Outro",
};

export const communicationPlanDescriptions = {
  free: "1 canal WhatsApp manual, sem envio automático.",
  premium: "2 canais manuais, sem envio automatico de WhatsApp.",
  pro: "6 canais, envio 1:1, multi-grupos manual e segmentação por bloco.",
  total: "20 canais, grupos oficiais elegíveis e logs avançados.",
} as const;

export const communicationAddons = [
  { id: "extra_channel", label: "Canal extra", price: "R$ 9,90/mês" },
  { id: "automatic_multi_groups", label: "Multi-grupos automático", price: "R$ 49,90/mês" },
  { id: "messages_500", label: "Pacote 500 mensagens", price: "R$ 29,90" },
  { id: "messages_1000", label: "Pacote 1.000 mensagens", price: "R$ 49,90" },
  { id: "messages_5000", label: "Pacote 5.000 mensagens", price: "R$ 199,90" },
] as const;

export function createManualCommunicationShareText({
  condominiumName,
  title,
  body,
  priority,
}: {
  condominiumName: string;
  title: string;
  body: string;
  priority: CommunicationPriority;
}) {
  const prefix = priority === "urgent" ? "URGENTE" : "Comunicado";
  return [
    `${prefix} - ${condominiumName}`,
    "",
    title.trim(),
    "",
    body.trim(),
    "",
    "Mensagem oficial preparada no Meus Condomínios.",
  ].join("\n");
}
