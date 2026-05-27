import { z } from "zod";

export const inviteDoormanSchema = z.object({
  condominium_id: z.string().uuid(),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().optional(),
});

export const acceptDoormanInviteSchema = z.object({
  token: z.string().min(10),
  full_name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  terms: z.literal("on", {
    error: "Você precisa aceitar os termos.",
  }),
  acceptable_use: z.literal("on", {
    error: "Você precisa aceitar a política de uso aceitável.",
  }),
});

export const gateSearchSchema = z.object({
  condominium_id: z.string().uuid(),
  search: z.string().min(1, "Digite o bloco ou número do apartamento."),
});

export const gatePackageSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid("Selecione um apartamento válido."),
  recipient_name: z.string().min(2, "Informe o destinatário."),
  description: z.string().optional(),
  photo_url: z.string().optional(),
});

export const gateVisitorSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid("Selecione um apartamento válido."),
  visitor_name: z.string().min(2, "Informe o nome do visitante."),
  visitor_phone: z.string().optional(),
  message: z.string().optional(),
});

export const gateIncidentSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid().optional(),
  title: z.string().min(3, "Informe o título da ocorrência."),
  description: z.string().min(5, "Descreva a ocorrência."),
});
