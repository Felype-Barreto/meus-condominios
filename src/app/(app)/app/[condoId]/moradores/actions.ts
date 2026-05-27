"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function reviewResidentMembershipAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("review_resident_membership", {
    membership_id: membershipId,
    decision,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/convites`);
  revalidatePath(`/app/${condoId}/apartamentos`);
}

export async function removeResidentMembershipAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para continuar.");
  }

  const [{ data: isSubscriberAdmin }, { data: canManageResidents }] = await Promise.all([
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.approve",
    }),
  ]);

  if (!isSubscriberAdmin && !canManageResidents) {
    throw new Error("Você não tem permissão para remover moradores.");
  }

  const { error } = await supabase
    .from("memberships")
    .update({
      status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("condominium_id", condoId)
    .in("role", ["resident", "owner"]);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "remove_resident_membership",
    entity_type: "memberships",
    entity_id: membershipId,
  });

  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/convites`);
  revalidatePath(`/app/${condoId}/apartamentos`);
}
