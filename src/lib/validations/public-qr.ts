import { z } from "zod";

export const publicQrRequestSchema = z.object({
  public_code: z.string().min(8, "Código público inválido.").max(80),
  contact_target: z.enum(["apartment", "staff"]).default("apartment"),
  search: z.string().trim().max(80).optional(),
  visitor_name: z.string().trim().max(120).optional(),
  visitor_phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(4, "Escreva uma mensagem curta.").max(500),
}).refine(
  (value) => value.contact_target === "staff" || (value.search?.trim().length ?? 0) >= 2,
  {
    path: ["search"],
    message: "Digite o bloco e apartamento, ou use a opção de contactar a guarita.",
  },
);

export const publicQrSettingsSchema = z.object({
  condominium_id: z.string().uuid("Condomínio inválido."),
  enabled: z.boolean(),
  message: z.string().trim().max(300).optional(),
  default_privacy: z.object({
    allow_public_contact: z.boolean(),
    allow_name_search: z.boolean(),
    allow_apartment_search: z.boolean(),
    allow_whatsapp_redirect: z.boolean(),
  }),
  safety_acknowledgements: z.object({
    public_place: z.boolean(),
    safe_location: z.boolean(),
    resident_consent: z.boolean(),
    phone_hidden: z.boolean(),
  }),
}).refine(
  (value) =>
    !value.enabled ||
    Object.values(value.safety_acknowledgements).every((checked) => checked),
  {
    path: ["safety_acknowledgements"],
    message: "Confirme o checklist de segurança antes de ativar o QR público.",
  },
);
