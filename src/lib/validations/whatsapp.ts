import { z } from "zod";
import { whatsappConsentCategoryKeys } from "@/lib/whatsapp/consent";

export const whatsappShareTypeSchema = z.enum([
  "announcement",
  "resident_invite",
  "syndic_invite",
  "doorman_invite",
  "package_notice",
  "booking_notice",
  "public_qr",
  "condominium_signup",
]);

export const manualWhatsAppShareSchema = z.object({
  condominium_id: z.string().uuid(),
  type: whatsappShareTypeSchema,
  condominium_name: z.string().min(2).max(120),
  title: z.string().max(160).optional(),
  body: z.string().max(1000).optional(),
  link: z.string().max(500).optional(),
  apartment: z.string().max(80).optional(),
  date: z.string().max(40).optional(),
  time: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
});

export const queueWhatsAppTestSchema = z.object({
  condominium_id: z.string().uuid(),
  message_type: z.string().min(2).max(80).default("manual_test"),
  template_key: z.string().max(80).optional(),
});

export const whatsappAddonSchema = z.object({
  condominium_id: z.string().uuid(),
  addon_type: z.enum([
    "messages_500",
    "messages_1000",
    "messages_5000",
    "automatic_multi_groups",
    "extra_channel",
  ]),
});

export const whatsappGroupMessageTypeSchema = z.enum([
  "urgent_announcements",
  "daily_summary",
  "weekly_summary",
  "maintenance",
  "meetings",
]);

export const whatsappGroupSchema = z.object({
  condominium_id: z.string().uuid(),
  group_name: z.string().min(2, "Informe o nome do grupo.").max(120),
  group_id: z.string().max(160).optional(),
  block_id: z.string().uuid().optional().or(z.literal("")),
  enabled: z.boolean().default(false),
  allowed_message_types: z.array(whatsappGroupMessageTypeSchema).min(1),
});

export const whatsappGroupManualShareSchema = z.object({
  condominium_id: z.string().uuid(),
  condominium_name: z.string().min(2).max(120),
  group_name: z.string().max(120).optional(),
  title: z.string().min(2, "Informe um título.").max(160),
  body: z.string().min(2, "Informe a mensagem.").max(1000),
  category: whatsappGroupMessageTypeSchema,
  link: z.string().max(500).optional(),
});

export const whatsappGroupTestSchema = z.object({
  condominium_id: z.string().uuid(),
  group_id: z.string().uuid(),
});

export const whatsappConsentCategoriesSchema = z.object(
  Object.fromEntries(
    whatsappConsentCategoryKeys.map((key) => [key, z.boolean().default(false)]),
  ) as Record<(typeof whatsappConsentCategoryKeys)[number], z.ZodDefault<z.ZodBoolean>>,
);

export const whatsappOptInSchema = z.object({
  condominium_id: z.string().uuid(),
  user_id: z.string().uuid(),
  phone: z.string().min(8, "Informe um telefone válido.").max(40),
  opted_in: z.boolean(),
  categories: whatsappConsentCategoriesSchema.default({
    general: false,
    urgent_announcement: false,
    package: false,
    booking: false,
    visitor_contact: false,
    summary: false,
  }),
  consent_text_version: z.string().max(80).default("whatsapp-consent-v1"),
}).refine(
  (value) => !value.opted_in || value.phone.replace(/\D/g, "").length >= 10,
  {
    path: ["phone"],
    message: "Informe um telefone com DDD para receber WhatsApp.",
  },
);
