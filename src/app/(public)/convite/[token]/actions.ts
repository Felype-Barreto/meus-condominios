"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptSyndicInviteSchema } from "@/lib/validations/condominium";
import { acceptDoormanInviteSchema } from "@/lib/validations/doorman";
import { acceptResidentInviteSchema } from "@/lib/validations/resident-invite";
import {
  defaultWhatsAppConsentCategories,
  normalizeWhatsAppCategories,
  WHATSAPP_CONSENT_TEXT_VERSION,
} from "@/lib/whatsapp/consent";

export type AcceptInviteState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getRequestOrigin() {
  const headerList = await headers();
  return (
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export async function acceptSyndicInviteAction(
  _previousState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptSyndicInviteSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? "") || undefined,
    professional_note: String(formData.get("professional_note") ?? ""),
    start_date: String(formData.get("start_date") ?? ""),
    terms: formData.get("terms"),
    privacy: formData.get("privacy"),
    acceptable_use: formData.get("acceptable_use"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!parsed.data.password) {
      return {
        status: "error",
        message: "Informe uma senha para criar sua conta.",
      };
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${await getRequestOrigin()}/convite/${parsed.data.token}`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
        },
      },
    });

    if (signUpError) {
      return {
        status: "error",
        message: safeActionErrorMessage(signUpError),
      };
    }

    const userResponse = await supabase.auth.getUser();
    user = userResponse.data.user;
  }

  if (!user) {
    return {
      status: "error",
      message:
        "Conta criada. Confirme seu e-mail e abra o convite novamente para concluir.",
    };
  }

  const { data, error } = await supabase.rpc("accept_syndic_invite", {
    invite_token: parsed.data.token,
    profile_payload: {
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      professional_note: parsed.data.professional_note,
      start_date: parsed.data.start_date,
    },
  });

  if (error) {
    return {
      status: "error",
      message: safeActionErrorMessage(error),
    };
  }

  const result = data as { condominium_id: string };
  redirect(`/app/${result.condominium_id}/dashboard`);
}

export async function acceptDoormanInviteAction(
  _previousState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptDoormanInviteSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? "") || undefined,
    terms: formData.get("terms"),
    acceptable_use: formData.get("acceptable_use"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!parsed.data.password) {
      return { status: "error", message: "Informe uma senha para criar sua conta." };
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${await getRequestOrigin()}/convite/${parsed.data.token}`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
        },
      },
    });

    if (signUpError) {
      return { status: "error", message: safeActionErrorMessage(signUpError) };
    }

    const userResponse = await supabase.auth.getUser();
    user = userResponse.data.user;
  }

  if (!user) {
    return {
      status: "error",
      message:
        "Conta criada. Confirme seu e-mail e abra o convite novamente para concluir.",
    };
  }

  const { data, error } = await supabase.rpc("accept_doorman_invite", {
    invite_token: parsed.data.token,
    profile_payload: {
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    },
  });

  if (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  const result = data as { condominium_id: string };
  redirect(`/app/${result.condominium_id}/guarita`);
}

export async function acceptResidentInviteAction(
  _previousState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState & { submitted?: boolean }> {
  const parsed = acceptResidentInviteSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? "") || undefined,
    apartment_id: String(formData.get("apartment_id") ?? ""),
    membership_kind: String(formData.get("membership_kind") ?? "resident"),
    terms: formData.get("terms"),
    privacy: formData.get("privacy"),
    acceptable_use: formData.get("acceptable_use"),
    allow_admin_contact: formData.get("allow_admin_contact") === "on",
    allow_internal_search: formData.get("allow_internal_search") === "on",
    allow_public_qr_by_apartment: formData.get("allow_public_qr_by_apartment") === "on",
    allow_public_qr_by_name: formData.get("allow_public_qr_by_name") === "on",
    allow_whatsapp_direct: formData.get("allow_whatsapp_direct") === "on",
    whatsapp_opt_in: formData.get("whatsapp_opt_in") === "on",
    whatsapp_general: formData.get("whatsapp_general") === "on",
    whatsapp_urgent_announcement: formData.get("whatsapp_urgent_announcement") === "on",
    whatsapp_package: formData.get("whatsapp_package") === "on",
    whatsapp_booking: formData.get("whatsapp_booking") === "on",
    whatsapp_visitor_contact: formData.get("whatsapp_visitor_contact") === "on",
    whatsapp_summary: formData.get("whatsapp_summary") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!parsed.data.password) {
      return { status: "error", message: "Informe uma senha para criar sua conta." };
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${await getRequestOrigin()}/convite/${parsed.data.token}`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
        },
      },
    });

    if (signUpError) {
      return { status: "error", message: safeActionErrorMessage(signUpError) };
    }

    const userResponse = await supabase.auth.getUser();
    user = userResponse.data.user;
  }

  if (!user) {
    return {
      status: "error",
      message:
        "Conta criada. Confirme seu e-mail e abra o convite novamente para concluir.",
    };
  }

  const { data: inviteData } = await supabase.rpc("get_invite_public", {
    invite_token: parsed.data.token,
  });
  const invite = inviteData as { condominium_id?: string; email?: string | null } | null;
  const profileEmail = user.email ?? parsed.data.email;

  if (invite?.email && profileEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      status: "error",
      message:
        "Este convite foi emitido para outro e-mail. Entre com o Gmail ou e-mail correto, ou peça um novo convite.",
    };
  }

  const normalizedPhone = (parsed.data.phone ?? "").replace(/[^\d+]/g, "");
  const rawCategories = normalizeWhatsAppCategories({
    general: parsed.data.whatsapp_general || parsed.data.whatsapp_opt_in,
    urgent_announcement: parsed.data.whatsapp_urgent_announcement,
    package: parsed.data.whatsapp_package,
    booking: parsed.data.whatsapp_booking,
    visitor_contact: parsed.data.whatsapp_visitor_contact,
    summary: parsed.data.whatsapp_summary,
  });
  const requestedOptIn = parsed.data.whatsapp_opt_in || Object.values(rawCategories).some(Boolean);

  if (requestedOptIn && !normalizedPhone) {
    return {
      status: "error",
      message: "Informe um telefone para ativar avisos pelo WhatsApp.",
    };
  }

  const { error } = await supabase.rpc("accept_resident_invite", {
    invite_token: parsed.data.token,
    profile_payload: {
      full_name: parsed.data.full_name,
      email: profileEmail,
      phone: parsed.data.phone ?? "",
    },
    apt_id: parsed.data.apartment_id,
    membership_kind: parsed.data.membership_kind,
    privacy_payload: {
      allow_admin_contact: parsed.data.allow_admin_contact,
      allow_internal_search: parsed.data.allow_internal_search,
      allow_public_qr_by_apartment: parsed.data.allow_public_qr_by_apartment,
      allow_public_qr_by_name: parsed.data.allow_public_qr_by_name,
      allow_whatsapp_direct: parsed.data.allow_whatsapp_direct,
    },
  });

  if (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }

  if (invite?.condominium_id) {
    const categories = requestedOptIn
      ? rawCategories
      : defaultWhatsAppConsentCategories;
    const optedIn = requestedOptIn && Object.values(categories).some(Boolean);
    const now = new Date().toISOString();

    await supabase.from("whatsapp_opt_ins").upsert(
      {
        condominium_id: invite.condominium_id,
        user_id: user.id,
        phone: normalizedPhone,
        opted_in: optedIn,
        categories,
        opted_in_at: optedIn ? now : null,
        opted_out_at: optedIn ? null : now,
        source: "resident_invite",
        consent_text_version: WHATSAPP_CONSENT_TEXT_VERSION,
      },
      { onConflict: "condominium_id,user_id" },
    );

    await supabase.rpc("audit_event", {
      condo_id: invite.condominium_id,
      event_action: optedIn ? "whatsapp_consent_registered" : "whatsapp_consent_not_granted",
      event_entity_type: "whatsapp_opt_ins",
      event_entity_id: user.id,
      event_metadata: {
        source: "resident_invite",
        categories,
        consent_text_version: WHATSAPP_CONSENT_TEXT_VERSION,
      },
    });
  }

  return { status: "idle", submitted: true };
}
