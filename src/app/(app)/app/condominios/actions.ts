"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DeleteActionState } from "@/components/common/delete-confirmation";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const deleteCondominiumSchema = z.object({
  condominium_id: z.string().uuid(),
  confirmation: z.literal("EXCLUIR"),
});

export async function deleteCondominiumAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  const parsed = deleteCondominiumSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Digite EXCLUIR para confirmar." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Entre na sua conta.");

    const { data: isSubscriberAdmin } = await supabase.rpc("is_subscriber_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!isSubscriberAdmin) {
      throw new Error("Somente o assinante principal pode excluir este condominio.");
    }

    const { error } = await supabase
      .from("condominiums")
      .delete()
      .eq("id", parsed.data.condominium_id);

    if (error) throw error;

    revalidatePath("/app");
    revalidatePath("/app/condominios");
    return { status: "success", message: "Condominio excluido." };
  } catch (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }
}
