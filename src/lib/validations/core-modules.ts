import { z } from "zod";

export const apartmentUpdateSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  status: z.string().min(1),
  floor: z.string().optional(),
  notes_private: z.string().optional(),
});

export const announcementSchema = z.object({
  condominium_id: z.string().uuid(),
  title: z.string().min(3, "Informe o título."),
  body: z.string().min(5, "Informe o conteúdo."),
  target_type: z.enum(["all", "block", "apartment", "role"]).default("all"),
  target_id: z.string().uuid().optional().or(z.literal("")),
  target_ids: z.string().optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
  duration_preset: z.enum(["1", "3", "7", "custom", "indefinite"]).default("3"),
  urgent: z.boolean().default(false),
  pinned: z.boolean().default(false),
});

export const announcementUpdateSchema = announcementSchema.extend({
  announcement_id: z.string().uuid(),
});

export const announcementDeleteSchema = z.object({
  condominium_id: z.string().uuid(),
  announcement_id: z.string().uuid(),
});

export const commonAreaSchema = z.object({
  condominium_id: z.string().uuid(),
  name: z.string().min(2, "Informe o nome."),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1, "Informe a capacidade máxima da área."),
  rules: z.string().optional(),
  requires_approval: z.boolean().default(false),
  active: z.boolean().default(true),
  available_days: z.array(z.coerce.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  available_start_time: z.string().default("08:00"),
  available_end_time: z.string().default("22:00"),
  min_duration_minutes: z.coerce.number().int().min(30).default(60),
  max_duration_minutes: z.coerce.number().int().min(30).default(240),
  min_notice_hours: z.coerce.number().int().min(0).default(24),
  max_notice_days: z.coerce.number().int().min(1).default(60),
  max_bookings_per_apartment_month: z.coerce.number().int().min(1).default(4),
});

export const bookingSchema = z.object({
  condominium_id: z.string().uuid(),
  common_area_id: z.string().uuid(),
  apartment_id: z.string().uuid("Selecione o apartamento da reserva."),
  title: z.string().min(2),
  start_at: z.string().min(1, "Selecione o horário inicial."),
  end_at: z.string().min(1, "Selecione o horário final."),
  notes: z.string().optional(),
});

export const ticketSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(["reclamacao", "manutencao", "sugestao", "barulho", "seguranca", "limpeza", "outros"]),
  title: z.string().min(3),
  description: z.string().min(5),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  attachments: z.string().optional(),
});

export const packageSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  recipient_name: z.string().optional(),
  description: z.string().optional(),
  photo_url: z.string().optional(),
});

export const documentSchema = z.object({
  condominium_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  file_url: z
    .string()
    .min(3, "Informe o caminho privado do arquivo.")
    .refine((value) => !/^https?:\/\//i.test(value), {
      message: "Use o caminho privado do Storage, nao uma URL publica.",
    }),
  file_type: z.string().optional(),
  visibility: z.enum(["residents", "admins", "public", "owners"]).default("residents"),
  file_size: z.coerce.number().int().min(0).default(0),
});

export const incidentSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid().optional().or(z.literal("")),
  type: z.string().min(2),
  title: z.string().min(3),
  description: z.string().min(5),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  attachments: z.string().optional(),
});
