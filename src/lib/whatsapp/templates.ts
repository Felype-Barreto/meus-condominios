import type { WhatsAppEventType } from "@/lib/whatsapp/events";

export type WhatsAppTemplateDefinition = {
  key: string;
  providerName: string;
  language: string;
  category: "essential" | "automation" | "summary" | "group";
  bodyPreview: string;
  events: WhatsAppEventType[];
};

export const whatsappTemplateCatalog: Record<string, WhatsAppTemplateDefinition> = {
  package_created: {
    key: "package_created",
    providerName: "morai_package_created",
    language: "pt_BR",
    category: "essential",
    bodyPreview: "Uma encomenda chegou para o seu apartamento. Confira no Meus Condomínios.",
    events: ["package_created"],
  },
  booking_approved: {
    key: "booking_approved",
    providerName: "morai_booking_approved",
    language: "pt_BR",
    category: "essential",
    bodyPreview: "Seu agendamento foi aprovado. Confira os detalhes no Meus Condomínios.",
    events: ["booking_approved"],
  },
  booking_rejected: {
    key: "booking_rejected",
    providerName: "morai_booking_rejected",
    language: "pt_BR",
    category: "essential",
    bodyPreview: "Seu agendamento foi recusado. Veja os detalhes no Meus Condomínios.",
    events: ["booking_rejected"],
  },
  urgent_announcement: {
    key: "urgent_announcement",
    providerName: "morai_urgent_announcement",
    language: "pt_BR",
    category: "essential",
    bodyPreview: "Comunicado urgente do condomínio disponível no Meus Condomínios.",
    events: ["urgent_announcement_created"],
  },
  visitor_contact_request: {
    key: "visitor_contact_request",
    providerName: "morai_visitor_contact_request",
    language: "pt_BR",
    category: "essential",
    bodyPreview: "Um visitante solicitou contato pelo QR público do condomínio.",
    events: ["visitor_contact_request_created"],
  },
  booking_reminder: {
    key: "booking_reminder",
    providerName: "morai_booking_reminder",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Lembrete de agendamento do condomínio.",
    events: ["booking_reminder_24h", "booking_reminder_2h"],
  },
  ticket_status_changed: {
    key: "ticket_status_changed",
    providerName: "morai_ticket_status_changed",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Sua solicitação recebeu uma atualização.",
    events: ["ticket_status_changed"],
  },
  important_announcement: {
    key: "important_announcement",
    providerName: "morai_important_announcement",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Comunicado importante do condomínio disponível no Meus Condomínios.",
    events: ["announcement_created_important"],
  },
  package_waiting_reminder: {
    key: "package_waiting_reminder",
    providerName: "morai_package_waiting_reminder",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Você ainda possui encomenda aguardando retirada.",
    events: ["package_waiting_reminder"],
  },
  daily_summary: {
    key: "daily_summary",
    providerName: "morai_daily_summary",
    language: "pt_BR",
    category: "summary",
    bodyPreview: "Resumo diário do condomínio disponível no Meus Condomínios.",
    events: ["daily_summary"],
  },
  weekly_summary: {
    key: "weekly_summary",
    providerName: "morai_weekly_summary",
    language: "pt_BR",
    category: "summary",
    bodyPreview: "Resumo semanal do condomínio disponível no Meus Condomínios.",
    events: ["weekly_summary"],
  },
  group_announcement: {
    key: "group_announcement",
    providerName: "morai_group_announcement",
    language: "pt_BR",
    category: "group",
    bodyPreview: "Comunicado para grupo oficial do condomínio.",
    events: ["group_announcement", "block_group_announcement"],
  },
  meeting_reminder: {
    key: "meeting_reminder",
    providerName: "morai_meeting_reminder",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Lembrete de assembleia ou reunião do condomínio.",
    events: ["meeting_reminder"],
  },
  maintenance_reminder: {
    key: "maintenance_reminder",
    providerName: "morai_maintenance_reminder",
    language: "pt_BR",
    category: "automation",
    bodyPreview: "Lembrete de manutenção programada no condomínio.",
    events: ["maintenance_reminder"],
  },
};

export function getWhatsAppTemplate(templateKey: string) {
  return whatsappTemplateCatalog[templateKey] ?? null;
}

export function validateWhatsAppTemplateForEvent(
  templateKey: string,
  event: WhatsAppEventType,
) {
  const template = getWhatsAppTemplate(templateKey);
  return Boolean(template?.events.includes(event));
}
