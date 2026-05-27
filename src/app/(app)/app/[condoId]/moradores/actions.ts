"use server";

import { revalidatePath } from "next/cache";
import { getPublicAppUrl } from "@/lib/public-url";
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

export async function removePersonMembershipAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para continuar.");
  }

  const [{ data: isSubscriberAdmin }, { data: canManageResidents }, { data: canManageRoles }, { data: membership }] =
    await Promise.all([
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.approve",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "settings.roles",
    }),
    supabase
      .from("memberships")
      .select("id,role,status")
      .eq("id", membershipId)
      .eq("condominium_id", condoId)
      .maybeSingle(),
  ]);

  if (!membership || membership.role === "subscriber_admin") {
    throw new Error("Cadastro inválido para remoção.");
  }

  const isResidentRole = ["resident", "owner"].includes(membership.role);
  const isStaffRole = ["admin", "syndic", "doorman"].includes(membership.role);
  const canRemove =
    Boolean(isSubscriberAdmin) ||
    (isResidentRole && Boolean(canManageResidents)) ||
    (isStaffRole && Boolean(canManageRoles));

  if (!canRemove) {
    throw new Error("Você não tem permissão para remover esta pessoa.");
  }

  const { error } = await supabase
    .from("memberships")
    .update({
      status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("condominium_id", condoId)
    .neq("role", "subscriber_admin");

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "remove_person_membership",
    entity_type: "memberships",
    entity_id: membershipId,
    metadata: { role: membership.role },
  });

  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/convites`);
  revalidatePath(`/app/${condoId}/apartamentos`);
}

export const removeResidentMembershipAction = removePersonMembershipAction;

export async function sendPasswordResetForPersonAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const supabase = await createSupabaseServerClient();

  const [{ data: isSubscriberAdmin }, { data: canManageResidents }, { data: canManageRoles }, { data: membership }] =
    await Promise.all([
      supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "residents.approve",
      }),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "settings.roles",
      }),
      supabase
        .from("memberships")
        .select("id,role,profiles!memberships_user_id_fkey(email)")
        .eq("id", membershipId)
        .eq("condominium_id", condoId)
        .maybeSingle(),
    ]);

  if (!membership || membership.role === "subscriber_admin") {
    throw new Error("Cadastro inválido para redefinição de senha.");
  }

  const isResidentRole = ["resident", "owner"].includes(membership.role);
  const isStaffRole = ["admin", "syndic", "doorman"].includes(membership.role);
  const canReset =
    Boolean(isSubscriberAdmin) ||
    (isResidentRole && Boolean(canManageResidents)) ||
    (isStaffRole && Boolean(canManageRoles));

  if (!canReset) {
    throw new Error("Você não tem permissão para ajudar esta pessoa com senha.");
  }

  const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
  const email = profile?.email?.trim();
  if (!email) {
    throw new Error("Esta pessoa não tem e-mail cadastrado.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getPublicAppUrl()}/auth/callback?next=/redefinir-senha`,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    action: "send_password_reset",
    entity_type: "memberships",
    entity_id: membershipId,
    metadata: { role: membership.role },
  });

  revalidatePath(`/app/${condoId}/moradores`);
}

export async function setApartmentResponsibleAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("set_apartment_responsible", {
    condo_id: condoId,
    membership_id: membershipId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/apartamentos`);
  revalidatePath(`/app/${condoId}/guarita`);
}

export async function sendPersonMessageAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para continuar.");
  }

  if (!condoId || !membershipId || body.length < 1 || body.length > 1000) {
    throw new Error("Escreva uma mensagem de até 1000 caracteres.");
  }

  await supabase.rpc("purge_expired_member_messages");

  const [
    { data: target },
    { data: viewerMembership },
    { data: isSubscriberAdmin },
    { data: canViewResidents },
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("id,user_id,status")
      .eq("id", membershipId)
      .eq("condominium_id", condoId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("id,role,status")
      .eq("condominium_id", condoId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.view",
    }),
  ]);

  const canMessage =
    Boolean(viewerMembership) &&
    target?.status === "active" &&
    (target.user_id === user.id || Boolean(isSubscriberAdmin) || Boolean(canViewResidents));

  if (!canMessage) {
    throw new Error("Você não tem permissão para enviar mensagem para esta pessoa.");
  }

  const { error } = await supabase.from("member_messages").insert({
    condominium_id: condoId,
    sender_id: user.id,
    target_membership_id: membershipId,
    body,
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/app/${condoId}/moradores`);
}
