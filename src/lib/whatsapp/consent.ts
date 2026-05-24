import type { WhatsAppEventType } from "@/lib/whatsapp/events";

export const WHATSAPP_CONSENT_TEXT_VERSION = "whatsapp-consent-v1";

export const whatsappConsentCategoryKeys = [
  "general",
  "urgent_announcement",
  "package",
  "booking",
  "visitor_contact",
  "summary",
] as const;

export type WhatsAppConsentCategory = (typeof whatsappConsentCategoryKeys)[number];

export type WhatsAppConsentCategories = Record<WhatsAppConsentCategory, boolean>;

export const defaultWhatsAppConsentCategories: WhatsAppConsentCategories = {
  general: false,
  urgent_announcement: false,
  package: false,
  booking: false,
  visitor_contact: false,
  summary: false,
};

export const whatsappConsentCategoryLabels: Record<
  WhatsAppConsentCategory,
  { label: string; description: string }
> = {
  general: {
    label: "Receber avisos pelo WhatsApp",
    description: "Avisos gerais do condomínio quando o plano permitir envio automático.",
  },
  urgent_announcement: {
    label: "Receber avisos urgentes pelo WhatsApp",
    description: "Mensagens importantes que a administração marcar como urgentes.",
  },
  package: {
    label: "Receber avisos de encomenda",
    description: "Avisos quando houver encomenda registrada para sua unidade.",
  },
  booking: {
    label: "Receber avisos de agendamento",
    description: "Aprovações, recusas e lembretes de reservas de áreas comuns.",
  },
  visitor_contact: {
    label: "Receber avisos de visitante",
    description: "Solicitações de contato feitas pelo QR público do condomínio.",
  },
  summary: {
    label: "Receber resumos",
    description: "Resumo diário ou semanal, quando disponível no plano do condomínio.",
  },
};

export function normalizeWhatsAppCategories(
  value: unknown,
): WhatsAppConsentCategories {
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};

  return whatsappConsentCategoryKeys.reduce<WhatsAppConsentCategories>(
    (categories, key) => ({
      ...categories,
      [key]: input[key] === true || input[key] === "true" || input[key] === "on",
    }),
    { ...defaultWhatsAppConsentCategories },
  );
}

export function isValidWhatsAppPhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export function mapEventToConsentCategory(
  event: WhatsAppEventType,
): WhatsAppConsentCategory {
  if (event.startsWith("package_")) return "package";
  if (event.startsWith("booking_") || event === "meeting_reminder") return "booking";
  if (event === "visitor_contact_request_created") return "visitor_contact";
  if (event === "urgent_announcement_created") return "urgent_announcement";
  if (event === "daily_summary" || event === "weekly_summary") return "summary";
  return "general";
}

export function hasCategoryConsent(
  categories: unknown,
  category: WhatsAppConsentCategory,
) {
  return normalizeWhatsAppCategories(categories)[category] === true;
}
