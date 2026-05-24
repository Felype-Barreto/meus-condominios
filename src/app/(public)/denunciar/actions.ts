"use server";

import {
  blockIfCostRiskHigh,
  canRunExpensiveQuery,
  recordCostControlledAction,
} from "@/lib/cost-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AbuseReportState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createAbuseReportAction(
  _previousState: AbuseReportState,
  formData: FormData,
): Promise<AbuseReportState> {
  const condominiumId = String(formData.get("condominium_id") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const entityType = String(formData.get("entity_type") ?? "").trim() || null;

  if (!reason || reason.length < 3) {
    return { status: "error", message: "Escolha um motivo para a denúncia." };
  }

  if (!description || description.length < 10) {
    return { status: "error", message: "Descreva o ocorrido com um pouco mais de detalhe." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const rate = await canRunExpensiveQuery(user.id, "abuse_report.create");
    if (!rate.allowed) {
      return { status: "error", message: "Muitas denúncias em pouco tempo. Aguarde alguns minutos." };
    }
  }

  if (condominiumId) {
    try {
      await blockIfCostRiskHigh(condominiumId, "abuse_report.create");
    } catch {
      return { status: "error", message: "Não foi possível registrar a denúncia agora. Tente novamente em alguns minutos." };
    }
  }

  const { error } = await supabase.from("abuse_reports").insert({
    condominium_id: condominiumId,
    reported_by: user?.id ?? null,
    entity_type: entityType,
    reason,
    description,
    status: "pending",
  });

  if (error) {
    return { status: "error", message: "Não foi possível registrar a denúncia agora." };
  }

  if (condominiumId && user) {
    await supabase.rpc("audit_event", {
      condo_id: condominiumId,
      event_action: "abuse_report_created",
      event_entity_type: "abuse_reports",
      event_entity_id: user.id,
      event_metadata: { reason, entity_type: entityType },
    });
    await recordCostControlledAction(condominiumId, user.id, "abuse_report.create");
  }

  return {
    status: "success",
    message: "Denúncia registrada. Vamos analisar com cuidado, sem expor você para outros moradores.",
  };
}
