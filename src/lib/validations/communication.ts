import { z } from "zod";

export const communicationChannelTypeSchema = z.enum([
  "app",
  "whatsapp_manual",
  "whatsapp_official",
  "email",
  "push",
]);

export const communicationScopeSchema = z.enum([
  "all",
  "block",
  "apartment",
  "role",
  "staff",
  "council",
  "garage",
  "gate",
]);

export const communicationPrioritySchema = z.enum(["low", "normal", "important", "urgent"]);

export const communicationMessageTypeSchema = z.enum([
  "announcement",
  "maintenance",
  "booking",
  "package",
  "security",
  "meeting",
  "summary",
  "other",
]);

export const communicationChannelSchema = z.object({
  condominium_id: z.string().uuid(),
  name: z.string().min(2, "Informe o nome do canal.").max(120),
  type: communicationChannelTypeSchema,
  scope: communicationScopeSchema,
  block_id: z.string().uuid().optional().or(z.literal("")),
  role: z.string().max(40).optional(),
  status: z.enum(["active", "inactive", "pending", "failed", "manual_only"]).default("active"),
  plan_required: z.enum(["free", "premium", "pro", "total"]).default("free"),
  allowed_message_types: z.array(communicationMessageTypeSchema).min(1),
});

export const communicationChannelUpdateSchema = communicationChannelSchema.extend({
  channel_id: z.string().uuid(),
});

export const communicationChannelToggleSchema = z.object({
  condominium_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  status: z.enum(["active", "inactive", "pending", "failed", "manual_only"]),
});

export const communicationChannelTestSchema = z.object({
  condominium_id: z.string().uuid(),
  channel_id: z.string().uuid(),
});

export const communicationDispatchSchema = z.object({
  condominium_id: z.string().uuid(),
  title: z.string().min(3, "Informe um título claro.").max(160),
  body: z.string().min(8, "Escreva a mensagem.").max(2000),
  priority: communicationPrioritySchema.default("normal"),
  message_type: communicationMessageTypeSchema,
  target_type: z.enum(["all", "block", "apartment", "role", "channel"]),
  target_id: z.string().uuid().optional().or(z.literal("")),
  channel_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos um canal."),
  scheduled_at: z.string().optional(),
  confirmed: z.literal(true, {
    error: "Confirme que revisou o conteúdo antes de disparar.",
  }),
});

export const communicationDispatchWizardSchema = z.object({
  condominium_id: z.string().uuid(),
  title: z.string().min(3, "Informe um título claro.").max(160),
  body: z.string().min(8, "Escreva a mensagem.").max(2500),
  message_type: z.enum([
    "announcement",
    "maintenance",
    "meeting",
    "security",
    "booking",
    "package",
    "ticket",
    "visitor",
    "summary",
    "other",
  ]),
  priority: communicationPrioritySchema,
  target_type: z.enum(["all", "block", "apartment", "role", "channel"]),
  target_id: z.string().max(80).optional(),
  channel_ids: z.array(z.string().uuid()).default([]),
  scheduled_at: z.string().optional(),
  intent: z.enum(["draft", "send", "schedule"]),
  confirmed: z.boolean().default(false),
});

export const communicationTemplateSchema = z.object({
  condominium_id: z.string().uuid(),
  name: z.string().min(2, "Informe o nome do modelo.").max(120),
  category: z.string().min(2).max(80),
  title_template: z.string().min(3).max(160),
  body_template: z.string().min(8).max(2000),
  message_type: communicationMessageTypeSchema,
  safe_for_groups: z.boolean().default(false),
  requires_private_channel: z.boolean().default(false),
  suggested_priority: communicationPrioritySchema.default("normal"),
});

export const communicationTemplateDuplicateSchema = z.object({
  condominium_id: z.string().uuid(),
  template_id: z.string().uuid(),
});

export const communicationTemplateToggleSchema = z.object({
  condominium_id: z.string().uuid(),
  template_id: z.string().uuid(),
  active: z.boolean(),
});
