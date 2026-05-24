"use server";

import { createCondominiumSchema } from "@/lib/validations/condominium";
import { getCondominiumCreationEntitlement } from "@/lib/plans";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateCondoState = {
  status: "idle" | "error" | "success";
  message?: string;
  condominiumId?: string;
  inviteToken?: string;
  inviteUrl?: string;
  whatsappText?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function createCondominiumAction(
  _previousState: CreateCondoState,
  formData: FormData,
): Promise<CreateCondoState> {
  const payload = {
    name: String(formData.get("name") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    contact_phone: String(formData.get("contact_phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    // Never read a plan from FormData. The server resolves the entitlement below.
    plan: "free",
    syndic_choice: String(formData.get("syndic_choice") ?? "later"),
    syndic_email: String(formData.get("syndic_email") ?? ""),
  };

  const parsed = createCondominiumSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;

    return {
      status: "error",
      message: firstIssue
        ? `Revise o formulário: ${firstIssue}`
        : "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Entre na sua conta para criar um condomínio.",
    };
  }

  const entitlement = await getCondominiumCreationEntitlement(user.id);
  if (!entitlement.canCreate) {
    return {
      status: "error",
      message: entitlement.blockedReason ?? "Sua conta não pode criar condomínio agora.",
    };
  }

  const { data, error } = await supabase.rpc("create_condominium_with_structure", {
    payload: {
      ...parsed.data,
      plan: entitlement.plan,
      entitlement_source: "server",
    },
  });

  if (error) {
    console.error("Meus Condomínios condominium creation failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message: safeActionErrorMessage(error),
    };
  }

  const result = data as {
    condominium_id: string;
    invite_token?: string | null;
    syndic_choice: "self" | "invite" | "later";
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = result.invite_token
    ? `${appUrl}/convite/${result.invite_token}`
    : undefined;

  return {
    status: "success",
    message:
      result.syndic_choice === "later"
        ? "Condomínio criado. Você poderá definir o síndico pelo dashboard."
        : "Condomínio criado com sucesso.",
    condominiumId: result.condominium_id,
    inviteToken: result.invite_token ?? undefined,
    inviteUrl,
    whatsappText: inviteUrl
      ? `Olá! Você foi convidado para ser síndico no Meus Condomínios. Acesse o link abaixo para completar seu cadastro: ${inviteUrl}`
      : undefined,
  };
}
