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
}
