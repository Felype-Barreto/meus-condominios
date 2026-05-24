"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createResidentInviteSchema } from "@/lib/validations/resident-invite";

export type InviteState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteUrl?: string;
  whatsappText?: string;
};

export async function createResidentInviteAction(
  _previousState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const parsed = createResidentInviteSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    invite_type: String(formData.get("invite_type") ?? "resident"),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    apartment_id: String(formData.get("apartment_id") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("invite_resident", {
    condo_id: parsed.data.condominium_id,
    invite_role: parsed.data.invite_type,
    invite_email: parsed.data.email || null,
    invite_phone: parsed.data.phone || null,
    apt_id: parsed.data.apartment_id || null,
  });

  if (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/convites`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = data as { token: string };
  const inviteUrl = `${appUrl}/convite/${result.token}`;

  return {
    status: "success",
    message: "Convite criado.",
    inviteUrl,
    whatsappText: `Olá! Você recebeu um convite para se cadastrar no Meus Condomínios. Acesse o link e complete seu cadastro: ${inviteUrl}`,
  };
}
