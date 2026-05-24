"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWhatsAppConfigurationStatus } from "@/lib/whatsapp/adapter";
import {
  suggestChannelsForMessage,
  type DispatchChannelInput,
  type DispatchComposerMessageType,
} from "@/lib/communication-dispatch";
import {
  isGroupCommunicationChannel,
  validateDispatchSafety as validateFullDispatchSafety,
} from "@/lib/communication/safety";
import {
  communicationChannelSchema,
  communicationChannelTestSchema,
  communicationChannelToggleSchema,
  communicationChannelUpdateSchema,
  communicationDispatchSchema,
  communicationDispatchWizardSchema,
  communicationTemplateDuplicateSchema,
  communicationTemplateSchema,
  communicationTemplateToggleSchema,
} from "@/lib/validations/communication";

export type CommunicationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const initialError = "Não foi possível concluir agora. Revise os dados e tente novamente.";

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre na sua conta.");
  return { supabase, userId: user.id };
}

async function ensureAppChannel(condoId: string) {
  const { supabase } = await currentUser();
  const { data: existing, error: selectError } = await supabase
    .from("communication_channels")
    .select("id")
    .eq("condominium_id", condoId)
    .eq("type", "app")
    .eq("scope", "all")
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("communication_channels")
    .insert({
      condominium_id: condoId,
      name: "App Meus Condomínios",
      type: "app",
      scope: "all",
      status: "active",
      plan_required: "free",
      allowed_message_types: [
        "announcement",
        "maintenance",
        "booking",
        "package",
        "security",
        "meeting",
        "summary",
        "other",
      ],
      settings: { system: true },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

const groupScopes = new Set(["all", "block", "staff", "council", "garage", "gate"]);
const privateMessageTypes = new Set(["package", "booking"]);

function message(error: unknown) {
  if (error instanceof Error && error.message.length < 180) {
    return error.message;
  }

  return safeActionErrorMessage(error) || initialError;
}

function normalizeChannelType(formData: FormData) {
  const type = String(formData.get("type") ?? "whatsapp_manual");
  const mode = String(formData.get("mode") ?? "");
  if (mode === "manual") return "whatsapp_manual";
  if (mode === "official") return "whatsapp_official";
  return type;
}

function initialStatusFor(type: string) {
  if (type === "app") return "active";
  if (type === "whatsapp_manual") return "manual_only";
  if (type === "whatsapp_official") return "pending";
  return "active";
}

function assertChannelRules(data: {
  type: string;
  scope: string;
  block_id?: string;
  role?: string;
  allowed_message_types: string[];
}) {
  if (data.scope === "block" && !data.block_id) {
    throw new Error("Vincule um bloco para canais com escopo de bloco.");
  }

  if (data.scope === "role" && !data.role?.trim()) {
    throw new Error("Informe o papel para canais com escopo por papel.");
  }

  if (data.type === "whatsapp_official" && !getWhatsAppConfigurationStatus().configured) {
    throw new Error("Configure o WhatsApp Business antes de criar canal oficial.");
  }

  const isGroupChannel =
    (data.type === "whatsapp_manual" || data.type === "whatsapp_official") &&
    groupScopes.has(data.scope);

  if (isGroupChannel && data.allowed_message_types.some((item) => privateMessageTypes.has(item))) {
    throw new Error("Canal de grupo não pode receber mensagens privadas de encomenda ou agendamento individual.");
  }
}

export async function createCommunicationChannelAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationChannelSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    type: normalizeChannelType(formData),
    scope: String(formData.get("scope") ?? "all"),
    block_id: String(formData.get("block_id") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: initialStatusFor(normalizeChannelType(formData)),
    plan_required: String(formData.get("plan_required") ?? "free"),
    allowed_message_types: formData.getAll("allowed_message_types").map(String),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    assertChannelRules(parsed.data);
    const officialMissing = false;
    const { supabase } = await currentUser();
    const { data, error } = await supabase
      .from("communication_channels")
      .insert({
        condominium_id: parsed.data.condominium_id,
        name: parsed.data.name,
        type: parsed.data.type,
        scope: parsed.data.scope,
        block_id: parsed.data.block_id || null,
        role: parsed.data.role || null,
        status: parsed.data.status,
        plan_required: parsed.data.plan_required,
        allowed_message_types: parsed.data.allowed_message_types,
        settings: {
          mode: parsed.data.type === "whatsapp_official" ? "official" : "manual",
        },
      })
      .select("id")
      .single();

    if (error) throw error;
    await supabase.rpc("audit_event", {
      condo_id: parsed.data.condominium_id,
      event_action: "create_communication_channel",
      event_entity_type: "communication_channels",
      event_entity_id: data.id,
      event_metadata: { type: parsed.data.type, scope: parsed.data.scope },
    });

    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao`);
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/canais`);
    return {
      status: "success",
      message: officialMissing
        ? "Canal criado em modo manual porque o WhatsApp oficial não está configurado."
        : "Canal criado.",
    };
  } catch (error) {
    return { status: "error", message: message(error) };
  }
}

export async function updateCommunicationChannelAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationChannelUpdateSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    channel_id: String(formData.get("channel_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    type: normalizeChannelType(formData),
    scope: String(formData.get("scope") ?? "all"),
    block_id: String(formData.get("block_id") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? "active"),
    plan_required: String(formData.get("plan_required") ?? "free"),
    allowed_message_types: formData.getAll("allowed_message_types").map(String),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    assertChannelRules(parsed.data);
    const { supabase } = await currentUser();
    const { error } = await supabase
      .from("communication_channels")
      .update({
        name: parsed.data.name,
        type: parsed.data.type,
        scope: parsed.data.scope,
        block_id: parsed.data.block_id || null,
        role: parsed.data.role || null,
        status: parsed.data.status,
        plan_required: parsed.data.plan_required,
        allowed_message_types: parsed.data.allowed_message_types,
        settings: { mode: parsed.data.type === "whatsapp_official" ? "official" : "manual" },
      })
      .eq("id", parsed.data.channel_id)
      .eq("condominium_id", parsed.data.condominium_id);

    if (error) throw error;
    await supabase.rpc("audit_event", {
      condo_id: parsed.data.condominium_id,
      event_action: "update_communication_channel",
      event_entity_type: "communication_channels",
      event_entity_id: parsed.data.channel_id,
      event_metadata: { type: parsed.data.type, scope: parsed.data.scope },
    });

    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/canais`);
    return { status: "success", message: "Canal atualizado." };
  } catch (error) {
    return { status: "error", message: message(error) };
  }
}

export async function toggleCommunicationChannelAction(formData: FormData) {
  const parsed = communicationChannelToggleSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    channel_id: String(formData.get("channel_id") ?? ""),
    status: String(formData.get("status") ?? "inactive"),
  });

  if (!parsed.success) return;

  const { supabase } = await currentUser();
  await supabase
    .from("communication_channels")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.channel_id)
    .eq("condominium_id", parsed.data.condominium_id);

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: parsed.data.status === "inactive" ? "disable_communication_channel" : "enable_communication_channel",
    event_entity_type: "communication_channels",
    event_entity_id: parsed.data.channel_id,
    event_metadata: { status: parsed.data.status },
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/canais`);
}

export async function testCommunicationChannelAction(formData: FormData) {
  const parsed = communicationChannelTestSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    channel_id: String(formData.get("channel_id") ?? ""),
  });

  if (!parsed.success) return;

  const { supabase } = await currentUser();
  const { data: channel } = await supabase
    .from("communication_channels")
    .select("id, name, type, status")
    .eq("id", parsed.data.channel_id)
    .eq("condominium_id", parsed.data.condominium_id)
    .single();

  const { data: dispatch, error } = await supabase
    .from("communication_dispatches")
    .insert({
      condominium_id: parsed.data.condominium_id,
      title: `Teste do canal ${channel?.name ?? ""}`.trim(),
      body: "Mensagem de teste da Central de Comunicação do Meus Condomínios. Nenhum dado pessoal foi enviado.",
      priority: "low",
      message_type: "other",
      target_type: "channel",
      target_ids: [parsed.data.channel_id],
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !dispatch) return;

  await supabase.from("communication_dispatch_channels").insert({
    dispatch_id: dispatch.id,
    channel_id: parsed.data.channel_id,
    status: channel?.type === "whatsapp_official" && channel.status !== "active" ? "manual_only" : "sent",
    estimated_cost_units: 0,
    sent_at: new Date().toISOString(),
    error_message:
      channel?.type === "whatsapp_official" && channel.status !== "active"
        ? "Canal oficial ainda não está ativo. Teste registrado em fallback manual."
        : null,
  });

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: "test_communication_channel",
    event_entity_type: "communication_channels",
    event_entity_id: parsed.data.channel_id,
    event_metadata: { type: channel?.type ?? "unknown" },
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/canais`);
}

export async function createCommunicationDispatchAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationDispatchSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    priority: String(formData.get("priority") ?? "normal"),
    message_type: String(formData.get("message_type") ?? "announcement"),
    target_type: String(formData.get("target_type") ?? "all"),
    target_id: String(formData.get("target_id") ?? ""),
    channel_ids: formData.getAll("channel_ids").map(String),
    scheduled_at: String(formData.get("scheduled_at") ?? ""),
    confirmed: formData.get("confirmed") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const appChannelId = await ensureAppChannel(parsed.data.condominium_id);
    const channelIds = Array.from(new Set([appChannelId, ...parsed.data.channel_ids]));
    const { supabase } = await currentUser();
    const { data, error } = await supabase.rpc("dispatch_communication", {
      condo_id: parsed.data.condominium_id,
      dispatch_title: parsed.data.title,
      dispatch_body: parsed.data.body,
      dispatch_priority: parsed.data.priority,
      dispatch_message_type: parsed.data.message_type,
      dispatch_target_type: parsed.data.target_type,
      dispatch_target_ids: parsed.data.target_id ? [parsed.data.target_id] : null,
      channel_ids: channelIds,
      schedule_at: parsed.data.scheduled_at || null,
    });

    if (error) throw error;

    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao`);
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/disparos`);
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/logs`);
    return { status: "success", message: `Comunicado registrado. Protocolo: ${data}` };
  } catch (error) {
    return { status: "error", message: message(error) };
  }
}

function toStoredMessageType(type: DispatchComposerMessageType) {
  return type === "ticket" || type === "visitor" ? "other" : type;
}

function uuidArrayOrNull(value?: string) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? [value]
    : null;
}

export async function createCommunicationWizardDispatchAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationDispatchWizardSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    message_type: String(formData.get("message_type") ?? "announcement"),
    priority: String(formData.get("priority") ?? "normal"),
    target_type: String(formData.get("target_type") ?? "all"),
    target_id: String(formData.get("target_id") ?? ""),
    channel_ids: formData.getAll("channel_ids").map(String),
    scheduled_at: String(formData.get("scheduled_at") ?? ""),
    intent: String(formData.get("intent") ?? "send"),
    confirmed: formData.get("confirmed") === "on",
  });
  const safeVersionUsed = formData.get("safe_version_used") === "true";

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const { supabase, userId } = await currentUser();
    const [{ data: channels }, { data: limits }, { data: usage }] = await Promise.all([
      supabase
        .from("communication_channels")
        .select("id, name, type, scope, status, plan_required, block_id, role, allowed_message_types")
        .eq("condominium_id", parsed.data.condominium_id)
        .neq("status", "inactive"),
      supabase.rpc("get_communication_plan_limits", { condo_id: parsed.data.condominium_id }),
      supabase.rpc("can_send_whatsapp_message", { condo_id: parsed.data.condominium_id }),
    ]);

    const appChannelId = await ensureAppChannel(parsed.data.condominium_id);
    const channelRows = [
      {
        id: appChannelId,
        name: "App Meus Condomínios",
        type: "app",
        scope: "all",
        status: "active",
        plan_required: "free",
        block_id: null,
        role: null,
        allowed_message_types: ["announcement", "maintenance", "booking", "package", "security", "meeting", "summary", "other"],
      },
      ...((channels ?? []) as DispatchChannelInput[]),
    ] as DispatchChannelInput[];
    const input = {
      title: parsed.data.title,
      body: parsed.data.body,
      messageType: parsed.data.message_type as DispatchComposerMessageType,
      priority: parsed.data.priority,
      targetType: parsed.data.target_type,
      targetId: parsed.data.target_id || undefined,
      plan: String((limits as { plan?: string } | null)?.plan ?? "free"),
      whatsappRemaining: Number((usage as { remaining?: number } | null)?.remaining ?? 0),
      automaticOneToOne: Boolean((limits as { automatic_1_1?: boolean } | null)?.automatic_1_1),
      officialGroups: Boolean((limits as { official_groups?: boolean } | null)?.official_groups),
      manualGroups: Boolean((limits as { manual_groups?: boolean } | null)?.manual_groups),
    };
    const suggestions = suggestChannelsForMessage(input, channelRows);
    const selectedIds = Array.from(new Set([appChannelId, ...parsed.data.channel_ids]));
    const selected = suggestions.filter((channel) => selectedIds.includes(channel.id));
    const safety = validateFullDispatchSafety({
      messageType: parsed.data.message_type as DispatchComposerMessageType,
      priority: parsed.data.priority,
      targetType: parsed.data.target_type,
      targetId: parsed.data.target_id || undefined,
      title: parsed.data.title,
      body: parsed.data.body,
      channelIds: selectedIds,
      channels: channelRows,
      metadata: { intent: parsed.data.intent },
    });

    if (parsed.data.intent !== "draft") {
      if (!parsed.data.confirmed) throw new Error("Confirme que revisou a prévia antes de enviar.");
      if (!safety.allowed) {
        await supabase.rpc("audit_event", {
          condo_id: parsed.data.condominium_id,
          event_action: "communication_safety_blocked",
          event_entity_type: "communication_dispatches",
          event_entity_id: null,
          event_metadata: {
            message_type: parsed.data.message_type,
            risks: safety.risks.map((risk) => ({
              key: risk.key,
              channel_id: risk.channelId,
              label: risk.label,
            })),
          },
        });
        throw new Error(`Mensagem bloqueada por segurança: ${safety.risks[0]?.label ?? "risco sensível"}. Use canal privado ou versão segura.`);
      }
    }

    if (parsed.data.intent === "draft") {
      const { data, error } = await supabase
        .from("communication_dispatches")
        .insert({
          condominium_id: parsed.data.condominium_id,
          created_by: userId,
          title: parsed.data.title,
          body: parsed.data.body,
          priority: parsed.data.priority,
          message_type: toStoredMessageType(parsed.data.message_type),
          target_type: parsed.data.target_type,
          target_ids: uuidArrayOrNull(parsed.data.target_id),
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (safeVersionUsed) {
        await supabase.rpc("audit_event", {
          condo_id: parsed.data.condominium_id,
          event_action: "communication_safe_version_generated",
          event_entity_type: "communication_dispatches",
          event_entity_id: data.id,
          event_metadata: { message_type: parsed.data.message_type, intent: "draft" },
        });
      }
      await supabase.rpc("audit_event", {
        condo_id: parsed.data.condominium_id,
        event_action: "save_communication_draft",
        event_entity_type: "communication_dispatches",
        event_entity_id: data.id,
        event_metadata: { message_type: parsed.data.message_type },
      });
      revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/disparos`);
      return { status: "success", message: "Rascunho salvo." };
    }

    const { data, error } = await supabase.rpc("dispatch_communication", {
      condo_id: parsed.data.condominium_id,
      dispatch_title: parsed.data.title,
      dispatch_body: parsed.data.body,
      dispatch_priority: parsed.data.priority,
      dispatch_message_type: toStoredMessageType(parsed.data.message_type),
      dispatch_target_type: parsed.data.target_type,
      dispatch_target_ids: uuidArrayOrNull(parsed.data.target_id),
      channel_ids: selectedIds,
      schedule_at: parsed.data.intent === "schedule" ? parsed.data.scheduled_at || null : null,
    });
    if (error) throw error;

    if (safeVersionUsed) {
      await supabase.rpc("audit_event", {
        condo_id: parsed.data.condominium_id,
        event_action: "communication_safe_version_generated",
        event_entity_type: "communication_dispatches",
        event_entity_id: data,
        event_metadata: { message_type: parsed.data.message_type },
      });
    }

    const optionalSelected = selected.filter((channel) => channel.recommendation === "optional");
    if (optionalSelected.length) {
      await supabase.rpc("audit_event", {
        condo_id: parsed.data.condominium_id,
        event_action: "communication_optional_channel_used",
        event_entity_type: "communication_dispatches",
        event_entity_id: data,
        event_metadata: {
          optional_channel_ids: optionalSelected.map((channel) => channel.id),
          message_type: parsed.data.message_type,
          priority: parsed.data.priority,
        },
      });
    }

    if (selected.some((channel) => isGroupCommunicationChannel(channel))) {
      await supabase.rpc("audit_event", {
        condo_id: parsed.data.condominium_id,
        event_action: "communication_sent_to_group",
        event_entity_type: "communication_dispatches",
        event_entity_id: data,
        event_metadata: {
          group_channel_ids: selected
            .filter((channel) => isGroupCommunicationChannel(channel))
            .map((channel) => channel.id),
        },
      });
    }

    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao`);
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/disparos`);
    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/logs`);
    return {
      status: "success",
      message: parsed.data.intent === "schedule" ? `Disparo agendado. Protocolo: ${data}` : `Disparo enviado. Protocolo: ${data}`,
    };
  } catch (error) {
    return { status: "error", message: message(error) };
  }
}

export async function createCommunicationTemplateAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationTemplateSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    title_template: String(formData.get("title_template") ?? ""),
    body_template: String(formData.get("body_template") ?? ""),
    message_type: String(formData.get("message_type") ?? "announcement"),
    safe_for_groups: formData.get("safe_for_groups") === "on",
    requires_private_channel: formData.get("requires_private_channel") === "on",
    suggested_priority: String(formData.get("suggested_priority") ?? "normal"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const { supabase } = await currentUser();
    const { data, error } = await supabase
      .from("communication_templates")
      .insert({
        ...parsed.data,
        suggested_channels: parsed.data.requires_private_channel
          ? ["app", "whatsapp_private"]
          : ["app", "whatsapp_manual", "group"],
        variables: [],
        preview_example: parsed.data.body_template,
        active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    await supabase.rpc("audit_event", {
      condo_id: parsed.data.condominium_id,
      event_action: "create_communication_template",
      event_entity_type: "communication_templates",
      event_entity_id: data.id,
      event_metadata: { message_type: parsed.data.message_type },
    });

    revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/templates`);
    return { status: "success", message: "Modelo criado." };
  } catch (error) {
    return { status: "error", message: message(error) };
  }
}

export async function duplicateCommunicationTemplateAction(formData: FormData) {
  const parsed = communicationTemplateDuplicateSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    template_id: String(formData.get("template_id") ?? ""),
  });

  if (!parsed.success) return;

  const { supabase } = await currentUser();
  const { data: template } = await supabase
    .from("communication_templates")
    .select("name, category, title_template, body_template, message_type, safe_for_groups, requires_private_channel, suggested_priority, suggested_channels, variables, preview_example")
    .eq("id", parsed.data.template_id)
    .single();

  if (!template) return;

  const { data, error } = await supabase
    .from("communication_templates")
    .insert({
      ...template,
      condominium_id: parsed.data.condominium_id,
      template_key: null,
      name: `${template.name} (cópia)`,
      active: true,
    })
    .select("id")
    .single();

  if (error) return;

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: "duplicate_communication_template",
    event_entity_type: "communication_templates",
    event_entity_id: data.id,
    event_metadata: { source_template_id: parsed.data.template_id },
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/templates`);
}

export async function toggleCommunicationTemplateAction(formData: FormData) {
  const parsed = communicationTemplateToggleSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    template_id: String(formData.get("template_id") ?? ""),
    active: formData.get("active") === "true",
  });

  if (!parsed.success) return;

  const { supabase } = await currentUser();
  const { error } = await supabase
    .from("communication_templates")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.template_id)
    .eq("condominium_id", parsed.data.condominium_id);

  if (error) return;

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: parsed.data.active ? "activate_communication_template" : "deactivate_communication_template",
    event_entity_type: "communication_templates",
    event_entity_id: parsed.data.template_id,
    event_metadata: {},
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/templates`);
}

export async function requestCommunicationAddonAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const addonType = String(formData.get("addon_type") ?? "");
  const allowed = {
    extra_channel: true,
    automatic_multi_groups: true,
    messages_500: true,
    messages_1000: true,
    messages_5000: true,
  } as const;
  const addon = allowed[addonType as keyof typeof allowed];

  if (!condoId || !addon) return;

  const { supabase } = await currentUser();
  await supabase.rpc("purchase_addon_mock", {
    condo_id: condoId,
    addon_type_input: addonType,
  });

  revalidatePath(`/app/${condoId}/comunicacao`);
  revalidatePath(`/app/${condoId}/comunicacao/creditos`);
  revalidatePath(`/app/${condoId}/comunicacao/canais`);
}

export async function purchaseCommunicationAddonMockAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const addonType = String(formData.get("addon_type") ?? "");

  if (!condoId || !addonType) return;

  const { supabase } = await currentUser();
  await supabase.rpc("purchase_addon_mock", {
    condo_id: condoId,
    addon_type_input: addonType,
  });

  revalidatePath(`/app/${condoId}/comunicacao`);
  revalidatePath(`/app/${condoId}/comunicacao/creditos`);
  revalidatePath(`/app/${condoId}/comunicacao/canais`);
}

export async function markCommunicationDispatchReadAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const dispatchId = String(formData.get("dispatch_id") ?? "");
  if (!condoId || !dispatchId) return;

  const { supabase } = await currentUser();
  await supabase.rpc("mark_communication_dispatch_read", {
    dispatch_id_input: dispatchId,
  });

  revalidatePath(`/app/${condoId}/comunicacao/disparos/${dispatchId}`);
  revalidatePath(`/app/${condoId}/comunicacao/relatorios`);
}

export async function resendUnreadCommunicationAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const dispatchId = String(formData.get("dispatch_id") ?? "");
  if (!condoId || !dispatchId) return;

  const { supabase } = await currentUser();
  const [{ data: report }, { data: limits }] = await Promise.all([
    supabase.rpc("get_communication_dispatch_report", { dispatch_id_input: dispatchId }),
    supabase.rpc("get_communication_plan_limits", { condo_id: condoId }),
  ]);

  const plan = String((limits as { plan?: string } | null)?.plan ?? "free");
  if (plan === "free" || plan === "premium") {
    await supabase.rpc("audit_event", {
      condo_id: condoId,
      event_action: "communication_resend_unread_blocked",
      event_entity_type: "communication_dispatches",
      event_entity_id: dispatchId,
      event_metadata: { plan },
    });
    return;
  }

  await supabase.rpc("audit_event", {
    condo_id: condoId,
    event_action: "communication_resend_unread_requested",
    event_entity_type: "communication_dispatches",
    event_entity_id: dispatchId,
    event_metadata: {
      pending_app_reads: Number((report as { pending_app_reads?: number } | null)?.pending_app_reads ?? 0),
    },
  });

  revalidatePath(`/app/${condoId}/comunicacao/disparos/${dispatchId}`);
}

export async function generateCommunicationSummaryAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const summaryType = String(formData.get("summary_type") ?? "weekly");
  if (!condoId) return;

  const { supabase } = await currentUser();
  const rpcName = summaryType === "daily" ? "generate_daily_summary" : "create_communication_summary";
  const args =
    summaryType === "daily"
      ? { condo_id: condoId }
      : {
          condo_id: condoId,
          summary_type_input: summaryType,
          start_date: String(formData.get("period_start") ?? ""),
          end_date: String(formData.get("period_end") ?? ""),
        };

  await supabase.rpc(rpcName, args);
  revalidatePath(`/app/${condoId}/comunicacao/resumos`);
}

export async function scheduleCommunicationSummaryAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const summaryType = String(formData.get("summary_type") ?? "weekly");
  if (!condoId) return;

  const { supabase } = await currentUser();
  await supabase.rpc("schedule_summary", {
    condo_id: condoId,
    summary_type_input: summaryType,
  });

  revalidatePath(`/app/${condoId}/comunicacao/resumos`);
}

export async function sendCommunicationSummaryAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const summaryId = String(formData.get("summary_id") ?? "");
  const channelIds = formData.getAll("channel_ids").map(String).filter(Boolean);
  if (!condoId || !summaryId || !channelIds.length) return;

  const { supabase } = await currentUser();
  await supabase.rpc("send_summary", {
    summary_id_input: summaryId,
    channel_ids: channelIds,
  });

  revalidatePath(`/app/${condoId}/comunicacao/resumos`);
  revalidatePath(`/app/${condoId}/comunicacao/disparos`);
  revalidatePath(`/app/${condoId}/comunicacao/relatorios`);
}
