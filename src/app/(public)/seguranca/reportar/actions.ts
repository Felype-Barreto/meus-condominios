"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SecurityIncidentReportState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const securityIncidentReportSchema = z.object({
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  reporter_name: z.string().max(120).optional(),
  reporter_email: z.string().email().optional().or(z.literal("")),
  incident_type: z.enum([
    "suspected_data_leak",
    "unauthorized_access",
    "abusive_use",
    "whatsapp_spam",
    "qr_abuse",
    "payment_issue",
    "account_takeover",
    "other",
  ]),
  title: z.string().min(5, "Informe um titulo com um pouco mais de contexto."),
  description: z
    .string()
    .min(20, "Descreva o ocorrido com detalhes suficientes para triagem."),
  affected_data: z.string().max(500).optional(),
  evidence_url: z.string().url().optional().or(z.literal("")),
});

export async function createSecurityIncidentReportAction(
  _previousState: SecurityIncidentReportState,
  formData: FormData,
): Promise<SecurityIncidentReportState> {
  const parsed = securityIncidentReportSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados enviados.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("security_incidents").insert({
    condominium_id: parsed.data.condominium_id || null,
    reported_by: user?.id ?? null,
    incident_type: parsed.data.incident_type,
    severity: "medium",
    title: parsed.data.title,
    description: parsed.data.description,
    status: "open",
    affected_data: {
      reporter_name: parsed.data.reporter_name || null,
      reporter_email: parsed.data.reporter_email || null,
      affected_data_hint: parsed.data.affected_data || null,
      evidence_url: parsed.data.evidence_url || null,
      source: "public_security_report",
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        "Nao foi possivel registrar o incidente agora. Voce tambem pode enviar para codeflowbr1@gmail.com.",
    };
  }

  return {
    status: "success",
    message:
      "Relato registrado. Vamos fazer a triagem com cuidado e, se necessario, responder pelo contato informado.",
  };
}
