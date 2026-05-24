"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateIncidentSchema = z.object({
  condominium_id: z.string().uuid(),
  incident_id: z.string().uuid(),
  status: z.enum(["open", "triaging", "investigating", "contained", "resolved", "dismissed"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  action_note: z.string().max(1000).optional(),
});

export async function updateSecurityIncidentAction(formData: FormData) {
  const parsed = updateIncidentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("security_incidents")
    .select("actions_taken")
    .eq("id", parsed.data.incident_id)
    .eq("condominium_id", parsed.data.condominium_id)
    .single();

  if (readError) {
    throw new Error("Nao foi possivel carregar o incidente.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actionsTaken = Array.isArray(current?.actions_taken)
    ? current.actions_taken
    : [];

  const nextActions = parsed.data.action_note
    ? [
        ...actionsTaken,
        {
          at: new Date().toISOString(),
          by: user?.id ?? null,
          note: parsed.data.action_note,
          status: parsed.data.status,
          severity: parsed.data.severity,
        },
      ]
    : actionsTaken;

  const { error } = await supabase
    .from("security_incidents")
    .update({
      status: parsed.data.status,
      severity: parsed.data.severity,
      actions_taken: nextActions,
      resolved_at:
        parsed.data.status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.incident_id)
    .eq("condominium_id", parsed.data.condominium_id);

  if (error) {
    throw new Error("Nao foi possivel atualizar o incidente.");
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/seguranca/incidentes`);
}
