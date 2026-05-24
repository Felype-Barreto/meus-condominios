import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2, "Informe seu nome."),
  condoName: z.string().min(2, "Informe o nome do condomínio."),
  isSyndic: z.boolean().default(false),
  acceptTerms: z.literal(true, {
    error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
  }),
  acceptAcceptableUse: z.literal(true, {
    error: "Você precisa aceitar a Política de Uso Aceitável.",
  }),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "syndic", "doorman", "resident", "owner"]),
});
