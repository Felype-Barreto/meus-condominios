"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { whatsappAddons } from "@/lib/whatsapp";
import { getWhatsAppConfigurationStatus } from "@/lib/whatsapp/adapter";
import {
  defaultWhatsAppConsentCategories,
  normalizeWhatsAppCategories,
  WHATSAPP_CONSENT_TEXT_VERSION,
} from "@/lib/whatsapp/consent";
import { queueAndSendWhatsAppMessage } from "@/lib/whatsapp/queue";
import { createWhatsAppShareText } from "@/lib/whatsapp-share";
import {
  manualWhatsAppShareSchema,
  queueWhatsAppTestSchema,
  whatsappAddonSchema,
  whatsappGroupManualShareSchema,
  whatsappGroupSchema,
  whatsappGroupTestSchema,
  whatsappOptInSchema,
} from "@/lib/validations/whatsapp";

export type WhatsAppActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  text?: string;
  waMeUrl?: string | null;
  shareUrl?: string | null;
};

const groupMessageTypeLabels: Record<string, string> = {
  urgent_announcements: "comunicado geral urgente",
  daily_summary: "resumo do dia sem dados sensíveis",
  weekly_summary: "resumo semanal sem dados sensíveis",
  maintenance: "aviso de manutenção",
  meetings: "aviso de assembleia ou reunião",
};

function createGroupShareText({
  condominiumName,
  groupName,
  title,
  body,
  category,
  link,
}: {
  condominiumName: string;
  groupName?: string;
  title: string;
  body: string;
  category: string;
  link?: string;
}) {
  return [
    `📣 ${title.trim()}`,
    "",
    body.trim(),
    "",
    `Condomínio: ${condominiumName.trim()}`,
    groupName ? `Grupo: ${groupName.trim()}` : "",
    `Tipo: ${groupMessageTypeLabels[category] ?? "comunicado geral"}`,
    "",
    link?.trim() ? "Veja no Meus Condomínios:" : "",
    link?.trim() ?? "",
    "",
    "Mensagem preparada sem dados pessoais, telefones, visitantes, encomendas sensíveis ou cobranças individuais.",
  ].filter(Boolean).join("\n");
}

async function hasOfficialGroupAddon(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("communication_addons")
    .select("id")
    .eq("condominium_id", condoId)
    .eq("addon_type", "automatic_multi_groups")
    .eq("status", "active")
    .limit(1);

  return Boolean(data?.length);
}

async function getGroupStatusForPlan({
  condoId,
  groupId,
  enabled,
}: {
  condoId: string;
  groupId?: string | null;
  enabled: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, addonEnabled] = await Promise.all([
    supabase.from("condominiums").select("plan").eq("id", condoId).single(),
    hasOfficialGroupAddon(condoId),
  ]);
  const plan = condo?.plan ?? "free";
  const configured = getWhatsAppConfigurationStatus().configured;

  if (!groupId?.trim()) return "manual_only";
  if (plan === "free" || plan === "premium") return "manual_only";
  if (plan === "pro") return "pending";
  if ((plan === "total" || addonEnabled) && configured && enabled) return "pending";
  return "not_configured";
}

export async function createManualWhatsAppShareAction(
  _state: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = manualWhatsAppShareSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    type: String(formData.get("type") ?? "announcement"),
    condominium_name: String(formData.get("condominium_name") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    link: String(formData.get("link") ?? ""),
    apartment: String(formData.get("apartment") ?? ""),
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const text = createWhatsAppShareText({
    type: parsed.data.type,
    condominiumName: parsed.data.condominium_name,
    title: parsed.data.title,
    body: parsed.data.body,
    link: parsed.data.link,
    apartment: parsed.data.apartment,
    date: parsed.data.date,
    time: parsed.data.time,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_manual_whatsapp_share_text", {
    input: {
      condominium_id: parsed.data.condominium_id,
      message: text,
      phone: parsed.data.phone ?? "",
    },
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  const result = data as { text: string; wa_me_url: string | null; share_url: string | null };
  return {
    status: "success",
    message: "Mensagem manual preparada.",
    text: result.text,
    waMeUrl: result.wa_me_url,
    shareUrl: result.share_url,
  };
}

export async function queueWhatsAppTestAction(
  _state: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = queueWhatsAppTestSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    message_type: "manual_test",
    template_key: "package_received",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("queue_whatsapp_message", {
    input: {
      condominium_id: parsed.data.condominium_id,
      target_type: "manual",
      message_type: parsed.data.message_type,
      template_key: parsed.data.template_key,
      automatic: false,
      payload: {
        source: "settings_test",
        note: "Teste manual sem envio real pela Meta Cloud API.",
      },
    },
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp/logs`);
  return { status: "success", message: "Teste registrado nos logs. Nenhuma mensagem automática foi enviada." };
}

export async function createWhatsAppAddonAction(formData: FormData) {
  const parsed = whatsappAddonSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    addon_type: String(formData.get("addon_type") ?? ""),
  });

  if (!parsed.success) return;

  const addon = whatsappAddons.find((item) => item.id === parsed.data.addon_type);
  if (!addon) return;

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("purchase_addon_mock", {
    condo_id: parsed.data.condominium_id,
    addon_type_input: addon.id,
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp`);
  revalidatePath(`/app/${parsed.data.condominium_id}/comunicacao/creditos`);
}

export async function updateWhatsAppOptInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const parsed = whatsappOptInSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    user_id: user.id,
    phone: String(formData.get("phone") ?? "").replace(/[^\d+]/g, ""),
    opted_in: formData.get("opted_in") === "true",
    categories: formData.get("opted_in") === "true"
      ? normalizeWhatsAppCategories({
          general: true,
          urgent_announcement: true,
          package: true,
          booking: true,
          visitor_contact: true,
          summary: true,
        })
      : defaultWhatsAppConsentCategories,
    consent_text_version: WHATSAPP_CONSENT_TEXT_VERSION,
  });

  if (!parsed.success) return;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("condominium_id", parsed.data.condominium_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_opt_ins").upsert(
    {
      condominium_id: parsed.data.condominium_id,
      user_id: user.id,
      phone: parsed.data.phone,
      opted_in: parsed.data.opted_in,
      opted_in_at: parsed.data.opted_in ? now : null,
      opted_out_at: parsed.data.opted_in ? null : now,
      source: "settings",
      categories: parsed.data.categories,
      consent_text_version: parsed.data.consent_text_version,
    },
    { onConflict: "condominium_id,user_id" },
  );

  if (error) return;

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: parsed.data.opted_in ? "whatsapp_opt_in" : "whatsapp_opt_out",
    event_entity_type: "whatsapp_opt_ins",
    event_entity_id: null,
    event_metadata: {
      source: "settings",
      categories: parsed.data.categories,
      consent_text_version: parsed.data.consent_text_version,
    },
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/configuracoes/whatsapp`);
}

export async function createWhatsAppGroupAction(formData: FormData) {
  const allowedMessageTypes = formData.getAll("allowed_message_types").map(String);
  const parsed = whatsappGroupSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    group_name: String(formData.get("group_name") ?? ""),
    group_id: String(formData.get("group_id") ?? ""),
    block_id: String(formData.get("block_id") ?? ""),
    enabled: formData.get("enabled") === "on",
    allowed_message_types: allowedMessageTypes,
  });

  if (!parsed.success) return;

  const status = await getGroupStatusForPlan({
    condoId: parsed.data.condominium_id,
    groupId: parsed.data.group_id,
    enabled: parsed.data.enabled,
  });
  const supabase = await createSupabaseServerClient();

  await supabase.from("whatsapp_groups").insert({
    condominium_id: parsed.data.condominium_id,
    group_name: parsed.data.group_name,
    group_id: parsed.data.group_id?.trim() || null,
    block_id: parsed.data.block_id || null,
    enabled: parsed.data.enabled,
    status,
    allowed_message_types: parsed.data.allowed_message_types,
  });

  await supabase.rpc("audit_event", {
    condo_id: parsed.data.condominium_id,
    event_action: "create_whatsapp_group",
    event_entity_type: "whatsapp_groups",
    event_entity_id: null,
    event_metadata: {
      status,
      has_group_id: Boolean(parsed.data.group_id?.trim()),
      allowed_message_types: parsed.data.allowed_message_types,
    },
  });

  revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp/grupos`);
}

export async function createManualWhatsAppGroupShareAction(
  _state: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = whatsappGroupManualShareSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    condominium_name: String(formData.get("condominium_name") ?? ""),
    group_name: String(formData.get("group_name") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    category: String(formData.get("category") ?? "urgent_announcements"),
    link: String(formData.get("link") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const message = createGroupShareText({
    condominiumName: parsed.data.condominium_name,
    groupName: parsed.data.group_name,
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    link: parsed.data.link,
  });
  const supabase = await createSupabaseServerClient();

  const [
    { data, error: shareError },
    { error: logError },
  ] = await Promise.all([
    supabase.rpc("create_manual_whatsapp_share_text", {
      input: {
        condominium_id: parsed.data.condominium_id,
        message,
        phone: "",
      },
    }),
    supabase.rpc("queue_whatsapp_message", {
      input: {
        condominium_id: parsed.data.condominium_id,
        target_type: "group",
        message_type: "group_manual_share",
        template_key: "group_announcement",
        automatic: false,
        payload: {
          category: parsed.data.category,
          source: "group_manual_share",
        },
      },
    }),
  ]);

  if (shareError) return { status: "error", message: safeActionErrorMessage(shareError) };
  if (logError) return { status: "error", message: safeActionErrorMessage(logError) };

  const result = data as { text: string; wa_me_url: string | null; share_url: string | null };
  revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp/grupos`);

  return {
    status: "success",
    message: "Mensagem segura para grupo preparada.",
    text: result.text,
    waMeUrl: result.wa_me_url,
    shareUrl: result.share_url,
  };
}

export async function sendWhatsAppGroupTestAction(formData: FormData) {
  const parsed = whatsappGroupTestSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    group_id: String(formData.get("group_id") ?? ""),
  });

  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from("whatsapp_groups")
    .select("id, group_id, group_name, status, enabled")
    .eq("id", parsed.data.group_id)
    .eq("condominium_id", parsed.data.condominium_id)
    .single();
  const [{ data: condo }, addonEnabled] = await Promise.all([
    supabase.from("condominiums").select("plan").eq("id", parsed.data.condominium_id).single(),
    hasOfficialGroupAddon(parsed.data.condominium_id),
  ]);
  const officialAvailable =
    Boolean(group?.group_id) &&
    group?.enabled === true &&
    group?.status === "active" &&
    (condo?.plan === "total" || addonEnabled) &&
    getWhatsAppConfigurationStatus().configured;

  if (!officialAvailable) {
    await supabase.rpc("queue_whatsapp_message", {
      input: {
        condominium_id: parsed.data.condominium_id,
        target_type: "group",
        target_group_id: group?.group_id ?? "",
        message_type: "group_manual_test",
        template_key: "group_announcement",
        automatic: false,
        payload: {
          source: "group_test",
          reason: "official_group_unavailable",
        },
      },
    });
    revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp/grupos`);
    return;
  }

  try {
    await queueAndSendWhatsAppMessage({
      input: {
        condominium_id: parsed.data.condominium_id,
        event: "group_announcement",
        target_group_id: group?.group_id ?? "",
        payload: {
          title: "Teste de grupo Meus Condomínios",
          body: "Mensagem de teste sem dados pessoais.",
        },
      },
      userSupabase: supabase,
      adminSupabase: createSupabaseServiceClient(),
    });
  } catch {
    await supabase.rpc("queue_whatsapp_message", {
      input: {
        condominium_id: parsed.data.condominium_id,
        target_type: "group",
        target_group_id: group?.group_id ?? "",
        message_type: "group_test_failed",
        template_key: "group_announcement",
        automatic: false,
        payload: { source: "group_test", reason: "send_failed" },
      },
    });
  }

  revalidatePath(`/app/${parsed.data.condominium_id}/whatsapp/grupos`);
}
