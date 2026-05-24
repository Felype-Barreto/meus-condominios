"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultSyndicPermissions } from "@/lib/permissions";

async function requireCondoAdmin(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para continuar.");
  }

  const { data: role } = await supabase.rpc("get_user_role", {
    condo_id: condoId,
  });
  const { data: canManageRoles } = await supabase.rpc("has_permission", {
    condo_id: condoId,
    permission_key: "settings.roles",
  });

  if (!["subscriber_admin", "admin"].includes(String(role)) && !canManageRoles) {
    throw new Error("Você não tem permissão para gerenciar síndico.");
  }

  return { supabase, user };
}

export async function becomeSyndicAction(formData: FormData) {
  const condoId = String(formData.get("condoId") ?? "");
  const { supabase, user } = await requireCondoAdmin(condoId);

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("condominium_id", condoId)
    .eq("user_id", user.id)
    .eq("role", "subscriber_admin")
    .eq("status", "active")
    .single();

  if (membershipError || !membership) {
    throw new Error("Apenas o assinante principal pode assumir como síndico por aqui.");
  }

  await supabase
    .from("memberships")
    .update({ is_primary_syndic: false })
    .eq("condominium_id", condoId)
    .eq("is_primary_syndic", true);

  const { error } = await supabase
    .from("memberships")
    .update({
      is_primary_syndic: true,
      permissions: defaultSyndicPermissions,
    })
    .eq("id", membership.id);

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,phone")
    .eq("id", user.id)
    .single();

  await supabase.from("syndic_profiles").upsert(
    {
      condominium_id: condoId,
      membership_id: membership.id,
      full_name: profile?.full_name ?? profile?.email ?? "Síndico",
      email: profile?.email,
      phone: profile?.phone,
      professional_note: "Assinante principal atua como síndico.",
      start_date: new Date().toISOString().slice(0, 10),
      status: "active",
    },
    { onConflict: "membership_id" },
  );

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "become_syndic",
    entity_type: "memberships",
    entity_id: membership.id,
    metadata: { source: "syndic_page" },
  });

  revalidatePath(`/app/${condoId}/sindico`);
  revalidatePath(`/app/${condoId}/dashboard`);
}

export async function inviteSyndicAction(formData: FormData) {
  const condoId = String(formData.get("condoId") ?? "");
  const email = String(formData.get("email") ?? "");
  const { supabase, user } = await requireCondoAdmin(condoId);

  if (!email.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  const token = randomBytes(24).toString("hex");
  const { error } = await supabase.from("invites").insert({
    condominium_id: condoId,
    invited_by: user.id,
    token,
    invite_type: "syndic",
    role: "syndic",
    email,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  });

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "invite_syndic",
    entity_type: "invites",
    metadata: { email },
  });

  revalidatePath(`/app/${condoId}/sindico`);
}

export async function removeSyndicAction(formData: FormData) {
  const condoId = String(formData.get("condoId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const { supabase, user } = await requireCondoAdmin(condoId);

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("id", membershipId)
    .eq("condominium_id", condoId)
    .single();

  if (membership?.role === "subscriber_admin") {
    const { error } = await supabase
      .from("memberships")
      .update({ is_primary_syndic: false, permissions: {} })
      .eq("id", membershipId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("memberships")
      .update({ status: "suspended", is_primary_syndic: false })
      .eq("id", membershipId);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("syndic_profiles")
    .update({ status: "inactive" })
    .eq("membership_id", membershipId);

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "remove_syndic",
    entity_type: "memberships",
    entity_id: membershipId,
  });

  revalidatePath(`/app/${condoId}/sindico`);
  revalidatePath(`/app/${condoId}/dashboard`);
}

export async function updateSyndicPermissionsAction(formData: FormData) {
  const condoId = String(formData.get("condoId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const { supabase, user } = await requireCondoAdmin(condoId);

  const permissions = Object.fromEntries(
    Object.keys(defaultSyndicPermissions).map((key) => [
      key,
      formData.get(key) === "on",
    ]),
  );

  const { error } = await supabase
    .from("memberships")
    .update({ permissions })
    .eq("id", membershipId)
    .eq("condominium_id", condoId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    condominium_id: condoId,
    actor_user_id: user.id,
    action: "update_syndic_permissions",
    entity_type: "memberships",
    entity_id: membershipId,
    metadata: { permissions },
  });

  revalidatePath(`/app/${condoId}/sindico`);
}
