"use server";

import { revalidatePath } from "next/cache";
import {
  blockIfCostRiskHigh,
  canRunExpensiveQuery,
  recordCostControlledAction,
  type CostControlledAction,
} from "@/lib/cost-control";
import { economyModeConfig, isEconomyMode } from "@/lib/economy-mode";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createBooking } from "@/lib/calendar";
import {
  announcementSchema,
  apartmentUpdateSchema,
  bookingSchema,
  commonAreaSchema,
  documentSchema,
  incidentSchema,
  packageSchema,
  ticketSchema,
} from "@/lib/validations/core-modules";

export type ModuleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

async function currentUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Entre na sua conta.");
  return { supabase, userId: data.user.id };
}

async function audit(condoId: string, action: string, entityType: string, entityId?: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: action,
    event_entity_type: entityType,
    event_entity_id: entityId ?? null,
    event_metadata: {},
  });
}

async function assertCostAllowed(condoId: string, userId: string, action: CostControlledAction) {
  const rate = await canRunExpensiveQuery(userId, action);
  if (!rate.allowed) {
    throw new Error("Muitas ações em pouco tempo. Aguarde alguns minutos antes de tentar novamente.");
  }
  await blockIfCostRiskHigh(condoId, action);
}

function errorMessage(error: unknown) {
  return safeActionErrorMessage(error);
}

function parseTargetIds(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

async function getActiveMembershipRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  condoId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("memberships")
    .select("role,apartment_id")
    .eq("condominium_id", condoId)
    .eq("user_id", userId)
    .eq("status", "active");

  const priority: Record<string, number> = {
    subscriber_admin: 0,
    admin: 1,
    syndic: 2,
    doorman: 3,
    owner: 4,
    resident: 5,
  };

  return ((data ?? []) as { role?: string | null; apartment_id?: string | null }[]).sort(
    (a, b) => (priority[a.role ?? ""] ?? 99) - (priority[b.role ?? ""] ?? 99),
  )[0] ?? null;
}

async function assertPermission(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  condoId: string,
  userId: string,
  permission: string,
) {
  const membership = await getActiveMembershipRole(supabase, condoId, userId);
  if (!membership) throw new Error("Sem acesso ativo a este condomínio.");
  if (membership.role === "subscriber_admin") return membership;

  const { data: allowed } = await supabase.rpc("has_permission", {
    condo_id: condoId,
    permission_key: permission,
  });

  if (!allowed) throw new Error("Sem permissão para concluir esta ação.");
  return membership;
}

async function assertResidentApartmentScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  condoId: string,
  userId: string,
  apartmentId?: string | null,
) {
  const membership = await getActiveMembershipRole(supabase, condoId, userId);
  if (!membership) throw new Error("Sem acesso ativo a este condomínio.");
  if (membership.role === "resident" || membership.role === "owner") {
    if (!membership.apartment_id || membership.apartment_id !== apartmentId) {
      throw new Error("Morador só pode usar o próprio apartamento.");
    }
  }
}

export async function updateApartmentAction(
  _state: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = apartmentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase } = await currentUserId();
    const { error } = await supabase
      .from("apartments")
      .update({
        status: parsed.data.status,
        floor: parsed.data.floor,
        notes_private: parsed.data.notes_private,
      })
      .eq("id", parsed.data.apartment_id)
      .eq("condominium_id", parsed.data.condominium_id);
    if (error) throw error;
    await audit(parsed.data.condominium_id, "update_apartment", "apartments", parsed.data.apartment_id);
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Apartamento atualizado." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createAnnouncementAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = announcementSchema.safeParse({
    ...Object.fromEntries(formData),
    urgent: formData.get("urgent") === "on",
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    const membership = await assertPermission(supabase, parsed.data.condominium_id, userId, "announcements.create");
    if (membership.role === "resident" || membership.role === "owner") {
      throw new Error("Morador não pode publicar avisos.");
    }
    await assertCostAllowed(parsed.data.condominium_id, userId, "announcements.create");
    const targetIds =
      parsed.data.target_type === "all"
        ? []
        : parseTargetIds(parsed.data.target_ids).concat(
            parsed.data.target_id ? [parsed.data.target_id] : [],
          );

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        condominium_id: parsed.data.condominium_id,
        created_by: userId,
        title: parsed.data.title,
        body: parsed.data.body,
        target_type: parsed.data.target_type,
        target_ids: targetIds.length ? Array.from(new Set(targetIds)) : null,
        urgent: parsed.data.urgent,
        pinned: parsed.data.pinned,
        allow_comments: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_announcement", "announcements", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "announcements.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicados`);
    return { status: "success", message: "Comunicado criado." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function markAnnouncementReadAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id"));
  const announcementId = String(formData.get("announcement_id"));
  const { supabase, userId } = await currentUserId();
  await supabase.from("announcement_reads").upsert({
    announcement_id: announcementId,
    user_id: userId,
    read_at: new Date().toISOString(),
  });
  revalidatePath(`/app/${condoId}/comunicados`);
}

export async function createCommonAreaAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = commonAreaSchema.safeParse({
    ...Object.fromEntries(formData),
    requires_approval: formData.get("requires_approval") === "on",
    active: formData.get("active") !== "off",
    available_days: formData.getAll("available_days"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    const membership = await assertPermission(supabase, parsed.data.condominium_id, userId, "common_areas.create");
    if (membership.role === "resident" || membership.role === "owner" || membership.role === "doorman") {
      throw new Error("Sem permissão para criar área comum.");
    }
    await assertCostAllowed(parsed.data.condominium_id, userId, "common_areas.create");
    const { data, error } = await supabase.from("common_areas").insert(parsed.data).select("id").single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_common_area", "common_areas", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "common_areas.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/areas-comuns`);
    return { status: "success", message: "Área comum criada." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createBookingAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    await assertPermission(supabase, parsed.data.condominium_id, userId, "bookings.create");
    await assertResidentApartmentScope(supabase, parsed.data.condominium_id, userId, parsed.data.apartment_id);
    await assertCostAllowed(parsed.data.condominium_id, userId, "bookings.create");
    const data = await createBooking({
      condominiumId: parsed.data.condominium_id,
      commonAreaId: parsed.data.common_area_id,
      apartmentId: parsed.data.apartment_id,
      title: parsed.data.title,
      startAt: parsed.data.start_at,
      endAt: parsed.data.end_at,
      notes: parsed.data.notes,
    });
    await audit(parsed.data.condominium_id, "create_booking", "bookings", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "bookings.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/agendamentos`);
    return { status: "success", message: "Reserva criada." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

async function assertBookingStatusChange(condoId: string, bookingId: string, operation: "approve" | "cancel") {
  const { supabase, userId } = await currentUserId();
  const [{ data: booking }, { data: subscriber }, { data: approve }, { data: cancelAny }, { data: cancelOwn }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id,user_id")
        .eq("id", bookingId)
        .eq("condominium_id", condoId)
        .single(),
      supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
      supabase.rpc("has_permission", { condo_id: condoId, permission_key: "bookings.approve" }),
      supabase.rpc("has_permission", { condo_id: condoId, permission_key: "bookings.cancel_any" }),
      supabase.rpc("has_permission", { condo_id: condoId, permission_key: "bookings.cancel_own" }),
    ]);

  if (!booking) throw new Error("Reserva nao encontrada.");
  const canApprove = Boolean(subscriber) || Boolean(approve);
  const canCancel = Boolean(subscriber) || Boolean(cancelAny) || (booking.user_id === userId && Boolean(cancelOwn));
  if ((operation === "approve" && !canApprove) || (operation === "cancel" && !canCancel)) {
    throw new Error("Sem permissao para alterar esta reserva.");
  }
  return supabase;
}

export async function approveBookingAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id"));
  const id = String(formData.get("booking_id"));
  const supabase = await assertBookingStatusChange(condoId, id, "approve");
  const { error } = await supabase
    .from("bookings")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("condominium_id", condoId);
  if (error) throw error;
  await audit(condoId, "approve_booking", "bookings", id);
  revalidatePath(`/app/${condoId}/agendamentos`);
}

export async function rejectBookingAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id"));
  const id = String(formData.get("booking_id"));
  const supabase = await assertBookingStatusChange(condoId, id, "approve");
  const { error } = await supabase
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("condominium_id", condoId);
  if (error) throw error;
  await audit(condoId, "reject_booking", "bookings", id);
  revalidatePath(`/app/${condoId}/agendamentos`);
}

export async function cancelBookingAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id"));
  const id = String(formData.get("booking_id"));
  const supabase = await assertBookingStatusChange(condoId, id, "cancel");
  const { error } = await supabase.from("bookings").update({ status: "canceled" }).eq("id", id).eq("condominium_id", condoId);
  if (error) throw error;
  await audit(condoId, "cancel_booking", "bookings", id);
  revalidatePath(`/app/${condoId}/agendamentos`);
}

export async function createTicketAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = ticketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    await assertPermission(supabase, parsed.data.condominium_id, userId, "tickets.create");
    await assertResidentApartmentScope(supabase, parsed.data.condominium_id, userId, parsed.data.apartment_id);
    await assertCostAllowed(parsed.data.condominium_id, userId, "tickets.create");
    const attachments = parsed.data.attachments ? parsed.data.attachments.split(",").map((url) => url.trim()).filter(Boolean) : [];
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        condominium_id: parsed.data.condominium_id,
        apartment_id: parsed.data.apartment_id || null,
        created_by: userId,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        attachments,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_ticket", "tickets", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "tickets.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/solicitacoes`);
    return { status: "success", message: "Solicitação criada." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createPackageAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    const membership = await assertPermission(supabase, parsed.data.condominium_id, userId, "packages.create");
    if (membership.role === "resident" || membership.role === "owner") {
      throw new Error("Morador não pode registrar encomenda.");
    }
    await assertCostAllowed(parsed.data.condominium_id, userId, "packages.create");
    const { data, error } = await supabase.from("packages").insert({
      condominium_id: parsed.data.condominium_id,
      apartment_id: parsed.data.apartment_id,
      registered_by: userId,
      recipient_name: parsed.data.recipient_name,
      description: parsed.data.description,
      photo_url: parsed.data.photo_url,
      status: "waiting",
    }).select("id").single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_package", "packages", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "packages.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/encomendas`);
    return { status: "success", message: "Encomenda registrada." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createDocumentAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    await assertCostAllowed(parsed.data.condominium_id, userId, "documents.upload");
    if (isEconomyMode() && parsed.data.file_size > economyModeConfig.maxEconomyUploadMb * 1024 * 1024) {
      throw new Error("Upload grande fica indisponível no modo econômico. Use arquivo menor ou aguarde a infraestrutura paga.");
    }
    const limit = await supabase.rpc("can_upload_file", { condo_id: parsed.data.condominium_id, file_size: parsed.data.file_size });
    if (limit.error) throw limit.error;
    if ((limit.data as { allowed: boolean; reason?: string }).allowed === false) {
      const reason = (limit.data as { reason?: string }).reason;
      throw new Error(reason === "file_too_large" ? "Arquivo acima do tamanho permitido para o plano." : "Limite de armazenamento atingido.");
    }
    const { data, error } = await supabase.from("documents").insert({
      condominium_id: parsed.data.condominium_id,
      uploaded_by: userId,
      title: parsed.data.title,
      description: parsed.data.description,
      file_url: parsed.data.file_url,
      file_type: parsed.data.file_type,
      visibility: parsed.data.visibility,
    }).select("id").single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_document", "documents", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "documents.upload");
    revalidatePath(`/app/${parsed.data.condominium_id}/documentos`);
    return { status: "success", message: "Documento publicado." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createIncidentAction(
  _s: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  try {
    const { supabase, userId } = await currentUserId();
    await assertCostAllowed(parsed.data.condominium_id, userId, "incidents.create");
    const attachments = parsed.data.attachments ? parsed.data.attachments.split(",").map((url) => url.trim()).filter(Boolean) : [];
    const { data, error } = await supabase.from("incidents").insert({
      condominium_id: parsed.data.condominium_id,
      apartment_id: parsed.data.apartment_id || null,
      created_by: userId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      severity: parsed.data.severity,
      attachments,
    }).select("id").single();
    if (error) throw error;
    await audit(parsed.data.condominium_id, "create_incident", "incidents", data.id);
    await recordCostControlledAction(parsed.data.condominium_id, userId, "incidents.create");
    revalidatePath(`/app/${parsed.data.condominium_id}/ocorrencias`);
    return { status: "success", message: "Ocorrência registrada." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}
