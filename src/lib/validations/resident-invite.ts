import { z } from "zod";

export const createResidentInviteSchema = z.object({
  condominium_id: z.string().uuid(),
  invite_type: z.enum(["resident", "owner"]),
  email: z.string().email("Informe um e-mail válido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  apartment_id: z.string().uuid("Selecione o apartamento do convite."),
});

export const acceptResidentInviteSchema = z.object({
  token: z.string().min(10),
  full_name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().optional().default(""),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  apartment_id: z.string().uuid("Selecione um apartamento."),
  membership_kind: z.enum(["resident", "owner", "resident_owner"]),
  terms: z.literal("on", { error: "Você precisa aceitar os termos." }),
  privacy: z.literal("on", { error: "Você precisa aceitar a política de privacidade." }),
  acceptable_use: z.literal("on", { error: "Você precisa aceitar a política de uso aceitável." }),
  allow_admin_contact: z.boolean().default(true),
  allow_internal_search: z.boolean().default(true),
  allow_public_qr_by_apartment: z.boolean().default(false),
  allow_public_qr_by_name: z.boolean().default(false),
  allow_whatsapp_direct: z.boolean().default(false),
  whatsapp_opt_in: z.boolean().default(false),
  whatsapp_general: z.boolean().default(false),
  whatsapp_urgent_announcement: z.boolean().default(false),
  whatsapp_package: z.boolean().default(false),
  whatsapp_booking: z.boolean().default(false),
  whatsapp_visitor_contact: z.boolean().default(false),
  whatsapp_summary: z.boolean().default(false),
});
