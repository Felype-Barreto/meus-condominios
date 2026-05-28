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

  await supabase
    .from("memberships")
    .update({
      status: "suspended",
      is_primary_syndic: false,
      permissions: {},
      updated_at: new Date().toISOString(),
    })
    .eq("condominium_id", condoId)
    .eq("role", "syndic")
    .eq("status", "active");

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
  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/dashboard`);
}

export async function inviteSyndicAction(formData: FormData) {
  const condoId = String(formData.get("condoId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { supabase, user } = await requireCondoAdmin(condoId);

  if (!email.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id,full_name,email,phone")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: existingMemberships } = await supabase
      .from("memberships")
      .select("id,role,status")
      .eq("condominium_id", condoId)
      .eq("user_id", existingProfile.id)
      .in("status", ["pending", "active"])
      .limit(10);

    if (existingMemberships?.length) {
      if (existingMemberships.some((membership) => membership.role === "subscriber_admin" || membership.role === "admin")) {
        throw new Error("Esta conta já tem acesso administrativo ao condomínio.");
      }

      if (existingMemberships.some((membership) => membership.role === "syndic")) {
        throw new Error("Este e-mail já possui acesso de síndico neste condomínio.");
      }

      const { data: createdMembership, error: membershipError } = await supabase
        .from("memberships")
        .upsert(
          {
            condominium_id: condoId,
            user_id: existingProfile.id,
            role: "syndic",
            status: "active",
            permissions: defaultSyndicPermissions,
            is_primary_syndic: false,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "condominium_id,user_id,role" },
        )
        .select("id")
        .single();

      if (membershipError || !createdMembership) {
        throw new Error(membershipError?.message ?? "Não foi possível elevar esta pessoa a síndico.");
      }

      await supabase.from("syndic_profiles").upsert(
        {
          condominium_id: condoId,
          membership_id: createdMembership.id,
          full_name: existingProfile.full_name ?? existingProfile.email ?? "Síndico",
          email: existingProfile.email,
          phone: existingProfile.phone,
          professional_note: "Pessoa promovida a síndico pela administração.",
          start_date: new Date().toISOString().slice(0, 10),
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "membership_id" },
      );

      await supabase.from("notifications").insert({
        condominium_id: condoId,
        user_id: existingProfile.id,
        type: "role_update",
        title: "Você virou síndico",
        body: "A administração liberou seu acesso de síndico neste condomínio.",
        href: `/app/${condoId}/dashboard`,
      });

      await supabase.from("audit_logs").insert({
        condominium_id: condoId,
        actor_user_id: user.id,
        action: "promote_existing_syndic",
        entity_type: "memberships",
        entity_id: createdMembership.id,
        metadata: { email, previous_roles: existingMemberships.map((membership) => membership.role) },
      });

      revalidatePath(`/app/${condoId}/sindico`);
      revalidatePath(`/app/${condoId}/moradores`);
      revalidatePath(`/app/${condoId}/dashboard`);
      return;
    }
  }

  const token = randomBytes(24).toString("hex");
  const { error } = await supabase.from("invites").insert({
    condominium_id: condoId,
    invited_by: user.id,
    token,
    invite_type: "syndic",
    role: "syndic",
    email,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
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
    .select("id,role,user_id")
    .eq("id", membershipId)
    .eq("condominium_id", condoId)
    .single();

  if (!membership) {
    throw new Error("Síndico não encontrado neste condomínio.");
  }

  if (membership?.role === "subscriber_admin") {
    const { error } = await supabase
      .from("memberships")
      .update({ is_primary_syndic: false, permissions: {}, updated_at: new Date().toISOString() })
      .eq("id", membershipId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("memberships")
      .update({
        status: "suspended",
        is_primary_syndic: false,
        permissions: {},
        updated_at: new Date().toISOString(),
      })
      .eq("condominium_id", condoId)
      .eq("role", "syndic")
      .eq("user_id", membership?.user_id);
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
  revalidatePath(`/app/${condoId}/moradores`);
  revalidatePath(`/app/${condoId}/permissoes`);
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
