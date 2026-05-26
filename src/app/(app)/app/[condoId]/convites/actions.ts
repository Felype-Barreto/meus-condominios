"use server";

import { revalidatePath } from "next/cache";
import { buildPublicUrl } from "@/lib/public-url";
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
  const { data: apartment, error: apartmentError } = await supabase
    .from("apartments")
    .select("id")
    .eq("id", parsed.data.apartment_id)
    .eq("condominium_id", parsed.data.condominium_id)
    .maybeSingle();

  if (apartmentError || !apartment) {
    return {
      status: "error",
      message: "Selecione um apartamento válido deste condomínio.",
    };
  }

  const { data: condo } = await supabase
    .from("condominiums")
    .select("slug")
    .eq("id", parsed.data.condominium_id)
    .maybeSingle();

  const { data: existingInvite, error: existingInviteError } = await supabase
    .from("invites")
    .select("token,email,expires_at")
    .eq("condominium_id", parsed.data.condominium_id)
    .eq("apartment_id", parsed.data.apartment_id)
    .eq("invite_type", parsed.data.invite_type)
    .eq("status", "active")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existingInviteError && existingInvite?.token) {
    const inviteUrl = buildPublicUrl(`/convite/${existingInvite.token}`);

    return {
      status: "success",
      message: "Já existia um convite ativo para este apartamento. Reaproveitei o link.",
      inviteUrl,
      whatsappText: `Olá! Você recebeu um convite para se cadastrar no Meus Condomínios. Acesse o link e complete seu cadastro: ${inviteUrl}${condo?.slug ? `\n\nCódigo do condomínio para entrar depois: ${condo.slug}` : ""}`,
    };
  }

  const { data, error } = await supabase.rpc("invite_resident", {
    condo_id: parsed.data.condominium_id,
    invite_role: parsed.data.invite_type,
    invite_email: parsed.data.email || null,
    invite_phone: parsed.data.phone || null,
    apt_id: parsed.data.apartment_id || null,
  });

  if (error) {
    console.error("createResidentInviteAction failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/convites`);
  const result = data as { token: string };
  const inviteUrl = buildPublicUrl(`/convite/${result.token}`);

  return {
    status: "success",
    message: "Convite criado.",
    inviteUrl,
    whatsappText: `Olá! Você recebeu um convite para se cadastrar no Meus Condomínios. Acesse o link e complete seu cadastro: ${inviteUrl}${condo?.slug ? `\n\nCódigo do condomínio para entrar depois: ${condo.slug}` : ""}`,
  };
}
