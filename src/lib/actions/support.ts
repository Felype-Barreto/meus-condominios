"use server";

import { z } from "zod";
import {
  blockIfCostRiskHigh,
  canRunExpensiveQuery,
  recordCostControlledAction,
} from "@/lib/cost-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupportTicketState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const supportTicketSchema = z.object({
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum([
    "duvida",
    "cobranca",
    "cancelamento",
    "reembolso",
    "problema_tecnico",
    "privacidade_lgpd",
    "seguranca",
    "whatsapp",
    "outro",
  ]),
  subject: z.string().min(4, "Informe um assunto."),
  message: z.string().min(15, "Descreva o pedido com um pouco mais de detalhe."),
  name: z.string().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().max(80).optional(),
});

export async function createSupportTicketAction(
  _previousState: SupportTicketState,
  formData: FormData,
): Promise<SupportTicketState> {
  const parsed = supportTicketSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados do chamado.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const rate = await canRunExpensiveQuery(user.id, "support.create");
    if (!rate.allowed) {
      return {
        status: "error",
        message: "Muitos chamados em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
      };
    }
  }

  if (parsed.data.condominium_id) {
    try {
      await blockIfCostRiskHigh(parsed.data.condominium_id, "support.create");
    } catch {
      return {
        status: "error",
        message: "Este condomínio está com uso alto no momento. Tente novamente em alguns minutos.",
      };
    }
  }

  const { error } = await supabase.from("support_tickets").insert({
    condominium_id: parsed.data.condominium_id || null,
    user_id: user?.id ?? null,
    category: parsed.data.category,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "open",
    priority:
      parsed.data.category === "seguranca" ||
      parsed.data.category === "privacidade_lgpd"
        ? "high"
        : "normal",
    metadata: {
      name: parsed.data.name || null,
      email: parsed.data.email || user?.email || null,
      source: parsed.data.source || "support_form",
      official_contact: "codeflowbr1@gmail.com",
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        "Nao foi possivel abrir o chamado agora. Voce tambem pode escrever para codeflowbr1@gmail.com.",
    };
  }

  if (user && parsed.data.condominium_id) {
    await recordCostControlledAction(parsed.data.condominium_id, user.id, "support.create");
  }

  return {
    status: "success",
    message:
      "Chamado aberto. Vamos analisar e responder pelo canal informado ou pela sua conta.",
  };
}
