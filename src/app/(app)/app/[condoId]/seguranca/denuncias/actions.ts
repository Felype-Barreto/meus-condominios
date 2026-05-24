"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateAbuseReportStatusAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const reportId = String(formData.get("report_id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const status = rawStatus === "dismissed" ? "rejected" : rawStatus;

  if (!condoId || !reportId || !["reviewing", "resolved", "rejected"].includes(status)) {
    throw new Error("Dados invalidos.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("abuse_reports")
    .update({ status })
    .eq("id", reportId)
    .eq("condominium_id", condoId);

  if (error) throw new Error("Nao foi possivel atualizar a denuncia.");

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "abuse_report_status_updated",
    event_entity_type: "abuse_reports",
    event_entity_id: reportId,
    event_metadata: { status },
  });

  revalidatePath(`/app/${condoId}/seguranca/denuncias`);
}
