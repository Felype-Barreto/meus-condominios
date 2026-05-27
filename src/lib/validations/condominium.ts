import { z } from "zod";

export const planSchema = z.enum(["free", "premium", "pro", "total"]);
const initialCondominiumPlan = "free";

export const createCondominiumSchema = z
  .object({
    name: z.string().min(2, "Informe o nome do condomínio."),
    contact_email: z.string().email("Informe um e-mail válido."),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
    plan: planSchema.default(initialCondominiumPlan),
    syndic_choice: z.enum(["self", "invite", "later"]),
    syndic_email: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.syndic_choice === "invite") {
      const parsed = z.string().email().safeParse(data.syndic_email);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["syndic_email"],
          message: "Informe o e-mail do síndico convidado.",
        });
      }
    }
  });

export const acceptSyndicInviteSchema = z.object({
  token: z.string().min(10),
  full_name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  professional_note: z.string().optional(),
  start_date: z.string().optional(),
  terms: z.literal("on", {
    error: "Você precisa aceitar os termos.",
  }),
  privacy: z.literal("on", {
    error: "Você precisa aceitar a política de privacidade.",
  }),
  acceptable_use: z.literal("on", {
    error: "Você precisa aceitar a política de uso aceitável.",
  }),
  confirmation: z.literal("on", {
    error: "Confirme que entende o cadastro como síndico.",
  }),
});
