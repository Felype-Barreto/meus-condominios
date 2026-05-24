"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logPlatformAction } from "@/lib/admin/audit";
import { requirePlatformSession } from "@/lib/admin/auth";
import type { PlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase } from "@/lib/admin/data";
import {
  canRevealSensitiveField,
  revealSensitiveField,
  sensitiveFieldKeys,
} from "@/lib/admin/sensitive-data";
import type { SensitiveField } from "@/lib/admin/sensitive-data";
import { performAdminGlobalSearch } from "@/lib/admin/search";
import {
  assertNoSecretPlatformSetting,
  platformSettingsKeys,
} from "@/lib/admin/platform-settings";

const revealSchema = z.object({
  entity_type: z.string().min(2),
  entity_id: z.string().uuid().optional().or(z.literal("")),
  reason: z.string().min(10, "Informe um motivo com pelo menos 10 caracteres."),
});

const revealFieldSchema = z.object({
  entityType: z.string().min(2),
  entityId: z.string().uuid(),
  field: z.enum(sensitiveFieldKeys),
  reason: z.string().min(10, "Informe um motivo com pelo menos 10 caracteres."),
  contextModule: z.string().max(40).optional(),
});

const globalSearchSchema = z.object({
  query: z.string().trim().min(2).max(120),
});

const platformSettingsSchema = z.object({
  section: z.enum(platformSettingsKeys),
});

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function listValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((item) => String(item))
    .filter(Boolean);
}

async function assertAdminActionRateLimit(
  session: PlatformSession,
  action: string,
  limit = 20,
) {
  const supabase = createAdminSupabase();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("platform_admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", session.userId)
    .eq("action", action)
    .gte("created_at", since);

  if (error) return;
  if ((count ?? 0) >= limit) {
    throw new Error("Muitas ações sensíveis em pouco tempo. Aguarde alguns minutos.");
  }
}

export async function revealSensitiveDataAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
    "platform_finance",
    "platform_support",
  ]);
  const parsed = revealSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Motivo obrigatório.");
  }
  await assertAdminActionRateLimit(session, "reveal_sensitive_data_requested", 10);
  const supabase = createAdminSupabase();
  await supabase.from("sensitive_access_logs").insert({
    actor_user_id: session.userId,
    target_type: parsed.data.entity_type,
    target_id: parsed.data.entity_id || null,
    condominium_id: parsed.data.entity_type === "condominiums" ? parsed.data.entity_id || null : null,
    field_accessed: "masked_sensitive_data",
    reason: parsed.data.reason,
    metadata: { actor_role: session.role },
  });

  await logPlatformAction({
    session,
    action: "reveal_sensitive_data_requested",
    entityType: parsed.data.entity_type,
    entityId: parsed.data.entity_id || null,
    reason: parsed.data.reason,
  });

  revalidatePath("/admin/logs");
}

function stripSensitivePayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripSensitivePayload);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (/token|secret|password|authorization|access/i.test(key)) {
        return [key, "[removido]"];
      }
      return [key, stripSensitivePayload(item)];
    }),
  );
}

function asRevealValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(stripSensitivePayload(value), null, 2);
}

async function loadSensitiveFieldValue(input: {
  entityType: string;
  entityId: string;
  field: SensitiveField;
}) {
  const supabase = createAdminSupabase();

  if (input.entityType === "profiles") {
    const { data } = await supabase
      .from("profiles")
      .select("full_name,email,phone")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "email") return data.email;
    if (input.field === "phone") return data.phone;
    if (input.field === "resident_full_name") return data.full_name;
  }

  if (input.entityType === "condominiums") {
    const { data } = await supabase
      .from("condominiums")
      .select("name,legal_name,document,contact_email,contact_phone,public_code,invite_code")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "email") return data.contact_email;
    if (input.field === "phone") return data.contact_phone;
    if (input.field === "document") return data.document;
    if (input.field === "resident_full_name") return data.legal_name ?? data.name;
    if (input.field === "private_link") {
      return JSON.stringify(
        {
          public_code: data.public_code,
          invite_code: data.invite_code,
        },
        null,
        2,
      );
    }
  }

  if (input.entityType === "apartments") {
    const { data } = await supabase
      .from("apartments")
      .select("number")
      .eq("id", input.entityId)
      .maybeSingle();
    return input.field === "apartment" ? data?.number ?? null : null;
  }

  if (input.entityType === "abuse_reports") {
    const { data } = await supabase
      .from("abuse_reports")
      .select("reason,description,metadata")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "complaint_content") {
      return `Motivo: ${data.reason}\n\nDescricao: ${data.description ?? ""}`;
    }
    if (input.field === "log_payload") return data.metadata;
  }

  if (input.entityType === "support_tickets") {
    const { data } = await supabase
      .from("support_tickets")
      .select("subject,message,metadata")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "private_ticket_content") {
      return `${data.subject}\n\n${data.message}`;
    }
    if (input.field === "email") {
      const metadata = (data.metadata ?? {}) as Record<string, unknown>;
      return String(metadata.email ?? "");
    }
    if (input.field === "log_payload") return data.metadata;
  }

  if (input.entityType === "data_requests") {
    const { data } = await supabase
      .from("data_requests")
      .select("description,requested_by_email,response_note")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "email") return data.requested_by_email;
    if (input.field === "private_ticket_content") {
      return `Pedido: ${data.description ?? ""}\n\nResposta: ${data.response_note ?? ""}`;
    }
  }

  if (input.entityType === "refund_requests") {
    const { data } = await supabase
      .from("refund_requests")
      .select("amount_cents,currency,reason,provider,provider_payment_id,provider_refund_id,decision_note")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "payment_data") {
      return {
        amount_cents: data.amount_cents,
        currency: data.currency,
        provider: data.provider,
        provider_payment_id: data.provider_payment_id,
        provider_refund_id: data.provider_refund_id,
        reason: data.reason,
        decision_note: data.decision_note,
      };
    }
  }

  if (input.entityType === "whatsapp_message_logs") {
    const { data } = await supabase
      .from("whatsapp_message_logs")
      .select("target_phone,target_group_id,payload,error_message,status,provider_message_id")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "phone") return data.target_phone;
    if (input.field === "log_payload") {
      return {
        status: data.status,
        target_group_id: data.target_group_id,
        provider_message_id: data.provider_message_id,
        error_message: data.error_message,
        payload: stripSensitivePayload(data.payload),
      };
    }
  }

  if (input.entityType === "visitor_contact_requests") {
    const { data } = await supabase
      .from("visitor_contact_requests")
      .select("visitor_name,visitor_phone,message,status")
      .eq("id", input.entityId)
      .maybeSingle();
    if (!data) return null;
    if (input.field === "visitor_data") return data;
    if (input.field === "phone") return data.visitor_phone;
    if (input.field === "resident_full_name") return data.visitor_name;
  }

  if (input.entityType === "documents" && input.field === "attachment") {
    const { data } = await supabase
      .from("documents")
      .select("title,file_url,file_type,visibility")
      .eq("id", input.entityId)
      .maybeSingle();
    return data ?? null;
  }

  return null;
}

export async function revealSensitiveFieldAction(input: z.infer<typeof revealFieldSchema>) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
    "platform_finance",
    "platform_support",
    "platform_readonly",
  ]);
  const parsed = revealFieldSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Solicitacao invalida.");
  }
  const context = {
    module: parsed.data.contextModule,
    entityType: parsed.data.entityType,
  };
  if (!canRevealSensitiveField(session.role, parsed.data.field, context)) {
    throw new Error("Seu papel interno nao permite revelar este campo.");
  }

  await assertAdminActionRateLimit(session, "sensitive_field_revealed", 10);
  const rawValue = await loadSensitiveFieldValue({
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    field: parsed.data.field,
  });
  const value = revealSensitiveField({
    userRole: session.role,
    field: parsed.data.field,
    value: rawValue,
    context,
  });
  if (value === null) throw new Error("Campo nao autorizado.");

  const supabase = createAdminSupabase();
  await supabase.from("sensitive_access_logs").insert({
    actor_user_id: session.userId,
    target_type: parsed.data.entityType,
    target_id: parsed.data.entityId,
    condominium_id: parsed.data.entityType === "condominiums" ? parsed.data.entityId : null,
    field_accessed: parsed.data.field,
    reason: parsed.data.reason,
    metadata: {
      actor_role: session.role,
      context_module: parsed.data.contextModule ?? null,
      value_returned: rawValue != null && rawValue !== "",
    },
  });

  await logPlatformAction({
    session,
    action: "sensitive_field_revealed",
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    reason: parsed.data.reason,
    metadata: {
      field: parsed.data.field,
      context_module: parsed.data.contextModule ?? null,
    },
  });

  revalidatePath("/admin/logs");
  return { value: asRevealValue(value) };
}

export async function adminGlobalSearchAction(input: z.infer<typeof globalSearchSchema>) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
    "platform_finance",
    "platform_support",
    "platform_readonly",
  ]);
  const parsed = globalSearchSchema.safeParse(input);
  if (!parsed.success) return { results: [], sensitive: false };
  await assertAdminActionRateLimit(session, "platform_global_search", 60);

  const response = await performAdminGlobalSearch({
    session,
    query: parsed.data.query,
    source: "modal",
  });

  await logPlatformAction({
    session,
    action: "platform_global_search",
    entityType: "platform_search",
    metadata: {
      query_length: parsed.data.query.length,
      result_count: response.results.length,
      sensitive: response.sensitive,
    },
  });

  return response;
}

export async function updatePlatformSettingsAction(formData: FormData) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin"]);
  const parsed = platformSettingsSchema.safeParse({ section: formData.get("section") });
  if (!parsed.success) throw new Error("Secao invalida.");

  const ownerOnly = new Set(["plans", "whatsapp", "security", "maintenance"]);
  if (ownerOnly.has(parsed.data.section) && session.role !== "platform_owner") {
    throw new Error("Apenas o dono da plataforma pode alterar esta configuracao critica.");
  }

  await assertAdminActionRateLimit(session, "platform_settings_updated", 20);

  let value: Record<string, unknown>;
  if (parsed.data.section === "plans") {
    value = {
      free_price_monthly: stringValue(formData, "free_price_monthly"),
      premium_price_monthly: stringValue(formData, "premium_price_monthly"),
      premium_price_yearly: stringValue(formData, "premium_price_yearly"),
      pro_price_monthly: stringValue(formData, "pro_price_monthly"),
      pro_price_yearly: stringValue(formData, "pro_price_yearly"),
      total_price_monthly: stringValue(formData, "total_price_monthly"),
      total_price_yearly: stringValue(formData, "total_price_yearly"),
      free_active: checkboxValue(formData, "free_active"),
      premium_active: checkboxValue(formData, "premium_active"),
      pro_active: checkboxValue(formData, "pro_active"),
      total_active: checkboxValue(formData, "total_active"),
      commercial_text: stringValue(formData, "commercial_text"),
      limits_text: stringValue(formData, "limits_text"),
    };
  } else if (parsed.data.section === "whatsapp") {
    value = {
      free_credits: numberValue(formData, "free_credits"),
      premium_credits: numberValue(formData, "premium_credits"),
      pro_credits: numberValue(formData, "pro_credits"),
      total_credits: numberValue(formData, "total_credits"),
      daily_limit_per_condo: numberValue(formData, "daily_limit_per_condo", 200),
      global_status: stringValue(formData, "global_status"),
      globally_blocked: checkboxValue(formData, "globally_blocked"),
      addons_text: stringValue(formData, "addons_text"),
      block_reason: stringValue(formData, "block_reason"),
    };
  } else if (parsed.data.section === "security") {
    value = {
      require_2fa_admin: checkboxValue(formData, "require_2fa_admin"),
      qr_public_global_enabled: checkboxValue(formData, "qr_public_global_enabled"),
      sensitive_reveal_blocked_roles: listValue(formData, "sensitive_reveal_blocked_roles"),
      admin_rate_limit_per_10min: numberValue(formData, "admin_rate_limit_per_10min", 20),
      sensitive_reveal_limit_per_10min: numberValue(formData, "sensitive_reveal_limit_per_10min", 10),
      allowlist_emails: stringValue(formData, "allowlist_emails"),
    };
  } else if (parsed.data.section === "support") {
    value = {
      support_email: stringValue(formData, "support_email"),
      categories: stringValue(formData, "categories"),
      default_message: stringValue(formData, "default_message"),
      service_hours: stringValue(formData, "service_hours"),
    };
  } else if (parsed.data.section === "legal") {
    value = {
      terms_version: stringValue(formData, "terms_version"),
      privacy_version: stringValue(formData, "privacy_version"),
      whatsapp_consent_version: stringValue(formData, "whatsapp_consent_version"),
      terms_url: stringValue(formData, "terms_url"),
      privacy_url: stringValue(formData, "privacy_url"),
      cookies_url: stringValue(formData, "cookies_url"),
      cancellation_url: stringValue(formData, "cancellation_url"),
    };
  } else {
    value = {
      maintenance_mode: checkboxValue(formData, "maintenance_mode"),
      maintenance_message: stringValue(formData, "maintenance_message"),
      block_new_signups: checkboxValue(formData, "block_new_signups"),
    };
  }

  assertNoSecretPlatformSetting(value);
  const supabase = createAdminSupabase();
  const { data: current } = await supabase
    .from("platform_settings")
    .select("id")
    .eq("key", parsed.data.section)
    .maybeSingle();

  const payload = {
    key: parsed.data.section,
    value,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };
  const { error } = current?.id
    ? await supabase.from("platform_settings").update(payload).eq("id", current.id)
    : await supabase.from("platform_settings").insert(payload);
  if (error) throw new Error("Nao foi possivel salvar as configuracoes.");

  await logPlatformAction({
    session,
    action: "platform_settings_updated",
    entityType: "platform_settings",
    entityId: current?.id ?? null,
    reason: `Atualizacao da secao ${parsed.data.section}`,
    metadata: {
      section: parsed.data.section,
      critical: ownerOnly.has(parsed.data.section),
      keys: Object.keys(value),
    },
  });
  revalidatePath("/admin/configuracoes");
}

const ticketUpdateSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(["open", "waiting", "in_progress", "answered", "closed"]),
  response_note: z.string().max(1000).optional(),
});

export async function updateSupportTicketAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
  ]);
  const parsed = ticketUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados inválidos.");
  await assertAdminActionRateLimit(session, "support_ticket_updated", 40);

  const supabase = createAdminSupabase();
  const { data: current } = await supabase
    .from("support_tickets")
    .select("metadata")
    .eq("id", parsed.data.ticket_id)
    .maybeSingle();

  const metadata = {
    ...((current?.metadata ?? {}) as Record<string, unknown>),
    response_note: parsed.data.response_note || null,
    updated_by_platform: session.email,
  };

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: parsed.data.status, metadata })
    .eq("id", parsed.data.ticket_id);
  if (error) throw new Error("Não foi possível atualizar o chamado.");

  await logPlatformAction({
    session,
    action: "support_ticket_updated",
    entityType: "support_tickets",
    entityId: parsed.data.ticket_id,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/admin/suporte");
}

function canAccessSupportCategory(role: PlatformSession["role"], category?: string | null) {
  if (role === "platform_owner" || role === "platform_admin" || role === "platform_support") return true;
  if (role === "platform_finance") return ["cobranca", "cancelamento", "reembolso"].includes(category ?? "");
  if (role === "platform_security") return ["seguranca", "privacidade_lgpd"].includes(category ?? "");
  return false;
}

const helpdeskTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(["open", "waiting_customer", "in_progress", "resolved", "closed"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  response_note: z.string().max(1000).optional(),
  internal_note: z.string().max(2000).optional(),
});

export async function updateHelpdeskTicketAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
  ]);
  const parsed = helpdeskTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados inválidos.");
  await assertAdminActionRateLimit(session, "support_ticket_updated", 40);

  const supabase = createAdminSupabase();
  const { data: current } = await supabase
    .from("support_tickets")
    .select("metadata,category,condominium_id")
    .eq("id", parsed.data.ticket_id)
    .maybeSingle();
  if (!current || !canAccessSupportCategory(session.role, current.category)) {
    throw new Error("Você não tem permissão para alterar este chamado.");
  }

  const oldMetadata = (current.metadata ?? {}) as Record<string, unknown>;
  const timeline = Array.isArray(oldMetadata.timeline) ? oldMetadata.timeline : [];
  const metadata = {
    ...oldMetadata,
    response_note: parsed.data.response_note || null,
    updated_by_platform: session.email,
    assigned_to: parsed.data.assigned_to || null,
    timeline: [
      ...timeline,
      {
        type: parsed.data.response_note ? "internal_response" : "status_update",
        note: parsed.data.internal_note || parsed.data.response_note || "Atualização do chamado",
        status: parsed.data.status,
        priority: parsed.data.priority,
        actor: session.email,
        created_at: new Date().toISOString(),
        external_email_sent: false,
      },
    ],
  };

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigned_to: parsed.data.assigned_to || null,
      metadata,
    })
    .eq("id", parsed.data.ticket_id);
  if (error) throw new Error("Não foi possível atualizar o chamado.");

  await logPlatformAction({
    session,
    action: "support_ticket_updated",
    entityType: "support_tickets",
    entityId: parsed.data.ticket_id,
    metadata: { status: parsed.data.status, priority: parsed.data.priority },
  });
  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${parsed.data.ticket_id}`);
  if (current.condominium_id) revalidatePath(`/admin/condominios/${current.condominium_id}`);
}

const supportLinkSchema = z.object({
  ticket_id: z.string().uuid(),
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  user_id: z.string().uuid().optional().or(z.literal("")),
  note: z.string().min(5).max(1000),
});

export async function linkSupportTicketAdminAction(formData: FormData) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin", "platform_support"]);
  const parsed = supportLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Vínculo inválido.");
  await assertAdminActionRateLimit(session, "support_ticket_linked", 30);

  const supabase = createAdminSupabase();
  const { data: current } = await supabase
    .from("support_tickets")
    .select("metadata,category")
    .eq("id", parsed.data.ticket_id)
    .maybeSingle();
  if (!current || !canAccessSupportCategory(session.role, current.category)) {
    throw new Error("Você não tem permissão para vincular este chamado.");
  }

  const metadata = {
    ...((current.metadata ?? {}) as Record<string, unknown>),
    link_note: parsed.data.note,
    linked_by_platform: session.email,
  };
  const { error } = await supabase
    .from("support_tickets")
    .update({
      condominium_id: parsed.data.condominium_id || null,
      user_id: parsed.data.user_id || null,
      metadata,
    })
    .eq("id", parsed.data.ticket_id);
  if (error) throw new Error("Não foi possível vincular o chamado.");

  await logPlatformAction({
    session,
    action: "support_ticket_linked",
    entityType: "support_tickets",
    entityId: parsed.data.ticket_id,
    reason: parsed.data.note,
    metadata: {
      condominium_id: parsed.data.condominium_id || null,
      user_id: parsed.data.user_id || null,
    },
  });
  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${parsed.data.ticket_id}`);
}

const supportIncidentSchema = z.object({
  ticket_id: z.string().uuid(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(5).max(140),
  description: z.string().min(10).max(3000),
});

export async function convertSupportTicketToIncidentAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_security",
  ]);
  const parsed = supportIncidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Incidente inválido.");
  await assertAdminActionRateLimit(session, "support_ticket_converted_to_incident", 15);

  const supabase = createAdminSupabase();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id,condominium_id,category,subject,metadata")
    .eq("id", parsed.data.ticket_id)
    .single();
  if (!ticket || !canAccessSupportCategory(session.role, ticket.category)) {
    throw new Error("Você não tem permissão para converter este chamado.");
  }

  const { data: incident, error } = await supabase
    .from("security_incidents")
    .insert({
      condominium_id: ticket.condominium_id,
      reported_by: session.userId,
      incident_type: ticket.category === "privacidade_lgpd" ? "suspected_data_leak" : "other",
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
      affected_data: { source_ticket_id: ticket.id },
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar incidente.");

  const metadata = {
    ...((ticket.metadata ?? {}) as Record<string, unknown>),
    converted_to_incident_id: incident.id,
    converted_by_platform: session.email,
  };
  await supabase
    .from("support_tickets")
    .update({ priority: "urgent", metadata })
    .eq("id", ticket.id);

  await logPlatformAction({
    session,
    action: "support_ticket_converted_to_incident",
    entityType: "security_incidents",
    entityId: incident.id,
    reason: parsed.data.description,
    metadata: { ticket_id: ticket.id },
  });
  revalidatePath(`/admin/suporte/${ticket.id}`);
  revalidatePath("/admin/incidentes");
}

const abuseDecisionSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "action_required", "resolved", "rejected", "escalated"]),
  severity: z.enum(["low", "normal", "high", "critical"]),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  action_type: z.enum([
    "mark_reviewing",
    "request_info",
    "block_user",
    "suspend_condominium",
    "remove_content",
    "register_decision",
    "close_report",
  ]),
  reason: z.string().min(10, "Ações em denúncia exigem motivo claro."),
});

export async function updateAbuseReportAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = abuseDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ação inválida.");
  await assertAdminActionRateLimit(session, "abuse_report_action", 20);

  const supabase = createAdminSupabase();
  const { data: report } = await supabase
    .from("abuse_reports")
    .select("id,condominium_id,reported_user_id,entity_type,entity_id,actions_taken,status")
    .eq("id", parsed.data.report_id)
    .single();
  if (!report) throw new Error("Denúncia não encontrada.");

  const actions = Array.isArray(report.actions_taken) ? report.actions_taken : [];
  const nextActions = [
    ...actions,
    {
      action_type: parsed.data.action_type,
      reason: parsed.data.reason,
      actor: session.email,
      actor_role: session.role,
      created_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase
    .from("abuse_reports")
    .update({
      status: parsed.data.status,
      severity: parsed.data.severity,
      assigned_to: parsed.data.assigned_to || null,
      decision_note: parsed.data.reason,
      actions_taken: nextActions,
    })
    .eq("id", parsed.data.report_id);
  if (error) throw new Error("Não foi possível atualizar a denúncia.");

  if (parsed.data.action_type === "suspend_condominium" && report.condominium_id) {
    await supabase
      .from("condominiums")
      .update({ subscription_status: "blocked" })
      .eq("id", report.condominium_id);
  }

  if (parsed.data.action_type === "block_user" && report.reported_user_id) {
    if (report.condominium_id) {
      await supabase
        .from("memberships")
        .update({ status: "blocked" })
        .eq("condominium_id", report.condominium_id)
        .eq("user_id", report.reported_user_id);
    }

    await supabase.from("platform_admin_audit_logs").insert({
      actor_user_id: session.userId,
      action: "reported_user_block_requested",
      entity_type: "profiles",
      entity_id: report.reported_user_id,
      condominium_id: report.condominium_id,
      severity: parsed.data.severity === "critical" ? "critical" : "high",
      reason: parsed.data.reason,
      metadata: { source_report_id: report.id, manual_follow_up_required: true },
    });
  }

  await logPlatformAction({
    session,
    action: "abuse_report_action",
    entityType: "abuse_reports",
    entityId: report.id,
    reason: parsed.data.reason,
    metadata: {
      action_type: parsed.data.action_type,
      status: parsed.data.status,
      severity: parsed.data.severity,
      condominium_id: report.condominium_id,
    },
  });
  revalidatePath("/admin/denuncias");
  revalidatePath(`/admin/denuncias/${report.id}`);
  if (report.condominium_id) revalidatePath(`/admin/condominios/${report.condominium_id}`);
}

const abuseIncidentSchema = z.object({
  report_id: z.string().uuid(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(5).max(140),
  description: z.string().min(10).max(3000),
});

export async function convertAbuseReportToIncidentAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = abuseIncidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Incidente inválido.");
  await assertAdminActionRateLimit(session, "abuse_report_converted_to_incident", 15);

  const supabase = createAdminSupabase();
  const { data: report } = await supabase
    .from("abuse_reports")
    .select("id,condominium_id,reason,description,actions_taken")
    .eq("id", parsed.data.report_id)
    .single();
  if (!report) throw new Error("Denúncia não encontrada.");

  const { data: incident, error } = await supabase
    .from("security_incidents")
    .insert({
      condominium_id: report.condominium_id,
      reported_by: session.userId,
      incident_type: "abusive_use",
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
      affected_data: { source_abuse_report_id: report.id },
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar incidente.");

  const actions = Array.isArray(report.actions_taken) ? report.actions_taken : [];
  await supabase
    .from("abuse_reports")
    .update({
      status: "escalated",
      severity: parsed.data.severity === "medium" ? "normal" : parsed.data.severity,
      actions_taken: [
        ...actions,
        {
          action_type: "converted_to_incident",
          incident_id: incident.id,
          actor: session.email,
          created_at: new Date().toISOString(),
        },
      ],
    })
    .eq("id", report.id);

  await logPlatformAction({
    session,
    action: "abuse_report_converted_to_incident",
    entityType: "security_incidents",
    entityId: incident.id,
    reason: parsed.data.description,
    metadata: { report_id: report.id },
  });
  revalidatePath(`/admin/denuncias/${report.id}`);
  revalidatePath("/admin/incidentes");
}

const securityIncidentSchema = z.object({
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  incident_type: z.enum([
    "suspected_data_leak",
    "unauthorized_access",
    "abusive_use",
    "whatsapp_spam",
    "qr_abuse",
    "payment_issue",
    "account_takeover",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(5).max(140),
  description: z.string().min(10).max(3000),
  linked_abuse_report_id: z.string().uuid().optional().or(z.literal("")),
});

export async function createSecurityIncidentAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = securityIncidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Incidente invalido.");
  await assertAdminActionRateLimit(session, "security_incident_created_by_platform", 20);

  const supabase = createAdminSupabase();
  const affectedData = {
    source: "platform_admin",
    linked_abuse_report_id: parsed.data.linked_abuse_report_id || null,
  };
  const { data, error } = await supabase
    .from("security_incidents")
    .insert({
      condominium_id: parsed.data.condominium_id || null,
      reported_by: session.userId,
      incident_type: parsed.data.incident_type,
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
      affected_data: affectedData,
      actions_taken: [
        {
          action_type: "created_by_platform",
          actor: session.email,
          actor_role: session.role,
          created_at: new Date().toISOString(),
        },
      ],
    })
    .select("id")
    .single();
  if (error) throw new Error("Nao foi possivel criar o incidente.");

  if (parsed.data.linked_abuse_report_id) {
    await supabase
      .from("abuse_reports")
      .update({ status: "escalated" })
      .eq("id", parsed.data.linked_abuse_report_id);
  }

  await logPlatformAction({
    session,
    action: "security_incident_created_by_platform",
    entityType: "security_incidents",
    entityId: data.id,
    reason: parsed.data.description,
    metadata: {
      condominium_id: parsed.data.condominium_id || null,
      incident_type: parsed.data.incident_type,
      severity: parsed.data.severity,
      linked_abuse_report_id: parsed.data.linked_abuse_report_id || null,
    },
  });
  revalidatePath("/admin/seguranca");
  revalidatePath("/admin/incidentes");
}

const securityIncidentUpdateSchema = z.object({
  incident_id: z.string().uuid(),
  status: z.enum(["open", "triaging", "investigating", "contained", "resolved", "dismissed"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  action_type: z.enum([
    "triage_started",
    "investigation_note",
    "containment_action",
    "linked_report",
    "risk_reviewed",
    "resolved",
    "dismissed",
  ]),
  action_note: z.string().min(10, "Registre uma nota clara para a acao."),
});

export async function updateSecurityIncidentAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = securityIncidentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Atualizacao invalida.");
  await assertAdminActionRateLimit(session, "security_incident_updated_by_platform", 30);

  const supabase = createAdminSupabase();
  const { data: incident } = await supabase
    .from("security_incidents")
    .select("id,condominium_id,actions_taken,status,severity")
    .eq("id", parsed.data.incident_id)
    .single();
  if (!incident) throw new Error("Incidente nao encontrado.");

  const actions = Array.isArray(incident.actions_taken) ? incident.actions_taken : [];
  const { error } = await supabase
    .from("security_incidents")
    .update({
      status: parsed.data.status,
      severity: parsed.data.severity,
      resolved_at: ["resolved", "dismissed"].includes(parsed.data.status) ? new Date().toISOString() : null,
      actions_taken: [
        ...actions,
        {
          action_type: parsed.data.action_type,
          note: parsed.data.action_note,
          old_status: incident.status,
          new_status: parsed.data.status,
          old_severity: incident.severity,
          new_severity: parsed.data.severity,
          actor: session.email,
          actor_role: session.role,
          created_at: new Date().toISOString(),
        },
      ],
    })
    .eq("id", parsed.data.incident_id);
  if (error) throw new Error("Nao foi possivel atualizar o incidente.");

  await logPlatformAction({
    session,
    action: "security_incident_updated_by_platform",
    entityType: "security_incidents",
    entityId: incident.id,
    reason: parsed.data.action_note,
    metadata: {
      action_type: parsed.data.action_type,
      status: parsed.data.status,
      severity: parsed.data.severity,
      condominium_id: incident.condominium_id,
    },
  });
  revalidatePath("/admin/seguranca");
  revalidatePath("/admin/incidentes");
  revalidatePath(`/admin/incidentes/${incident.id}`);
  if (incident.condominium_id) revalidatePath(`/admin/condominios/${incident.condominium_id}`);
}

const logIncidentSchema = z.object({
  source_type: z.enum([
    "platform_admin_audit_logs",
    "audit_logs",
    "sensitive_access_logs",
    "qr_public_access_logs",
    "communication_safety_block",
  ]),
  source_id: z.string().uuid(),
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  incident_type: z.enum([
    "suspected_data_leak",
    "unauthorized_access",
    "abusive_use",
    "whatsapp_spam",
    "qr_abuse",
    "payment_issue",
    "account_takeover",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(5).max(140),
  reason: z.string().min(10, "Explique por que este log virou incidente."),
});

function compactLogMetadata(value: unknown) {
  const metadata = (value ?? {}) as Record<string, unknown>;
  const blockedKeys = ["token", "secret", "password", "authorization", "access_token", "service_role", "webhook"];
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
      .slice(0, 12)
      .map(([key, item]) => [key, typeof item === "string" ? item.slice(0, 160) : item]),
  );
}

export async function convertSecurityLogToIncidentAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = logIncidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Log invalido.");
  await assertAdminActionRateLimit(session, "security_log_converted_to_incident", 20);

  const supabase = createAdminSupabase();
  const sourceTable =
    parsed.data.source_type === "communication_safety_block"
      ? "audit_logs"
      : parsed.data.source_type;
  const { data: source } = await supabase
    .from(sourceTable)
    .select("*")
    .eq("id", parsed.data.source_id)
    .maybeSingle();

  const sourceCondoId =
    parsed.data.condominium_id ||
    ((source as { condominium_id?: string | null } | null)?.condominium_id ?? "");

  const { data: incident, error } = await supabase
    .from("security_incidents")
    .insert({
      condominium_id: sourceCondoId || null,
      reported_by: session.userId,
      incident_type: parsed.data.incident_type,
      severity: parsed.data.severity,
      title: parsed.data.title,
      description: parsed.data.reason,
      status: "open",
      affected_data: {
        source_type: parsed.data.source_type,
        source_id: parsed.data.source_id,
        source_action: (source as { action?: string; event_action?: string } | null)?.action ?? null,
        source_metadata: compactLogMetadata((source as { metadata?: unknown } | null)?.metadata),
      },
      actions_taken: [
        {
          action_type: "converted_from_log",
          source_type: parsed.data.source_type,
          source_id: parsed.data.source_id,
          actor: session.email,
          actor_role: session.role,
          created_at: new Date().toISOString(),
        },
      ],
    })
    .select("id")
    .single();
  if (error) throw new Error("Nao foi possivel converter o log em incidente.");

  await logPlatformAction({
    session,
    action: "security_log_converted_to_incident",
    entityType: "security_incidents",
    entityId: incident.id,
    reason: parsed.data.reason,
    metadata: {
      source_type: parsed.data.source_type,
      source_id: parsed.data.source_id,
      condominium_id: sourceCondoId || null,
    },
  });
  revalidatePath("/admin/seguranca");
  revalidatePath("/admin/incidentes");
  revalidatePath("/admin/logs");
}

const logReviewedSchema = z.object({
  source_type: z.string().min(2).max(80),
  source_id: z.string().uuid(),
  condominium_id: z.string().uuid().optional().or(z.literal("")),
  reason: z.string().min(8),
});

export async function markSecurityLogReviewedAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
  ]);
  const parsed = logReviewedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Revisao invalida.");
  await assertAdminActionRateLimit(session, "security_log_reviewed", 40);

  await logPlatformAction({
    session,
    action: "security_log_reviewed",
    entityType: parsed.data.source_type,
    entityId: parsed.data.source_id,
    reason: parsed.data.reason,
    metadata: { condominium_id: parsed.data.condominium_id || null },
  });
  revalidatePath("/admin/logs");
  revalidatePath("/admin/seguranca");
}

const dataRequestAdminSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "waiting_customer", "processed", "rejected", "canceled"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  action_type: z.enum([
    "mark_reviewing",
    "request_identity_confirmation",
    "generate_export",
    "register_correction",
    "anonymize_data",
    "mark_processed",
    "reject",
    "add_internal_note",
  ]),
  reason: z.string().min(10, "Pedidos de dados exigem motivo claro."),
  response_note: z.string().max(2000).optional(),
  confirm_sensitive_action: z.string().optional(),
});

export async function updateDataRequestAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_security",
    "platform_support",
  ]);
  const parsed = dataRequestAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Pedido invalido.");
  await assertAdminActionRateLimit(session, "data_request_admin_action", 25);

  if (
    session.role === "platform_support" &&
    (["anonymize_data", "mark_processed", "reject"].includes(parsed.data.action_type) ||
      ["processed", "rejected", "canceled"].includes(parsed.data.status))
  ) {
    throw new Error("Suporte pode acompanhar e solicitar informacoes, mas nao concluir, rejeitar ou anonimizar.");
  }

  const supabase = createAdminSupabase();
  const { data: request } = await supabase
    .from("data_requests")
    .select("id,condominium_id,user_id,request_type,status,actions_taken,response_note,requested_by_email")
    .eq("id", parsed.data.request_id)
    .single();
  if (!request) throw new Error("Pedido LGPD nao encontrado.");

  if (request.request_type === "deletion" && parsed.data.action_type === "anonymize_data") {
    if (parsed.data.confirm_sensitive_action !== "ANONIMIZAR") {
      throw new Error("Digite ANONIMIZAR para confirmar a anonimizacao.");
    }
    if (!request.user_id) throw new Error("Pedido sem usuario vinculado para anonimizar.");
    const { anonymizeUserData } = await import("@/lib/data-rights");
    await anonymizeUserData(supabase, request.user_id, request.condominium_id);
  }

  if (request.request_type !== "deletion" && parsed.data.action_type === "anonymize_data") {
    throw new Error("Anonimizacao deve ser usada apenas em pedidos de exclusao, apos revisao.");
  }

  const now = new Date().toISOString();
  const actions = Array.isArray(request.actions_taken) ? request.actions_taken : [];
  const nextResponseNote =
    parsed.data.response_note ||
    (parsed.data.action_type === "generate_export"
      ? "Exportacao preparada para entrega controlada pela equipe Meus Condomínios. Revise o arquivo antes de enviar ao titular."
      : parsed.data.action_type === "request_identity_confirmation"
        ? "Solicitamos confirmacao de identidade antes de continuar o atendimento."
        : request.response_note);

  const { error } = await supabase
    .from("data_requests")
    .update({
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigned_to: parsed.data.assigned_to || null,
      processed_by: ["processed", "rejected", "canceled"].includes(parsed.data.status) ? session.userId : null,
      processed_at: ["processed", "rejected", "canceled"].includes(parsed.data.status) ? now : null,
      response_note: nextResponseNote || null,
      actions_taken: [
        ...actions,
        {
          action_type: parsed.data.action_type,
          reason: parsed.data.reason,
          response_note: parsed.data.response_note || null,
          old_status: request.status,
          new_status: parsed.data.status,
          actor: session.email,
          actor_role: session.role,
          created_at: now,
        },
      ],
    })
    .eq("id", request.id);
  if (error) throw new Error("Nao foi possivel atualizar o pedido LGPD.");

  await logPlatformAction({
    session,
    action: "data_request_admin_action",
    entityType: "data_requests",
    entityId: request.id,
    reason: parsed.data.reason,
    metadata: {
      request_type: request.request_type,
      action_type: parsed.data.action_type,
      status: parsed.data.status,
      priority: parsed.data.priority,
      condominium_id: request.condominium_id,
    },
  });

  revalidatePath("/admin/lgpd");
  revalidatePath(`/admin/lgpd/${request.id}`);
  if (request.condominium_id) revalidatePath(`/admin/condominios/${request.condominium_id}`);
}

const whatsappCreditSchema = z.object({
  condominium_id: z.string().uuid(),
  amount: z.coerce.number().int().positive().max(100000),
  operation: z.enum(["add", "remove"]),
  reason: z.string().min(10, "Informe o motivo do ajuste de creditos."),
});

function currentWhatsAppMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function ensurePlatformWhatsAppUsage(condoId: string) {
  const supabase = createAdminSupabase();
  const month = currentWhatsAppMonth();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("plan")
    .eq("id", condoId)
    .single();
  const included =
    condo?.plan === "pro" ? 500 :
      condo?.plan === "total" ? 2000 : 0;

  const { data, error } = await supabase
    .from("whatsapp_usage")
    .upsert(
      {
        condominium_id: condoId,
        month,
        included_messages: included,
        included_credits: included,
      },
      { onConflict: "condominium_id,month" },
    )
    .select("id,addon_credits,used_credits")
    .single();
  if (error) throw new Error("Nao foi possivel preparar o uso mensal de WhatsApp.");
  return data;
}

export async function adjustWhatsAppCreditsAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
  ]);
  const parsed = whatsappCreditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ajuste invalido.");
  await assertAdminActionRateLimit(session, "whatsapp_manual_credit_adjusted", 20);

  const supabase = createAdminSupabase();
  const usage = await ensurePlatformWhatsAppUsage(parsed.data.condominium_id);
  const amount = parsed.data.amount;
  const nextAddonCredits =
    parsed.data.operation === "add"
      ? Number(usage.addon_credits ?? 0) + amount
      : Math.max(Number(usage.addon_credits ?? 0) - amount, 0);

  const { error } = await supabase
    .from("whatsapp_usage")
    .update({ addon_credits: nextAddonCredits, extra_messages: nextAddonCredits })
    .eq("id", usage.id);
  if (error) throw new Error("Nao foi possivel ajustar os creditos.");

  await supabase.from("communication_addons").insert({
    condominium_id: parsed.data.condominium_id,
    addon_type: parsed.data.operation === "add" ? "manual_credit_add" : "manual_credit_remove",
    quantity: 1,
    credits: parsed.data.operation === "add" ? amount : -amount,
    price_cents: 0,
    status: "active",
    valid_until: null,
  });

  await logPlatformAction({
    session,
    action: parsed.data.operation === "add" ? "whatsapp_manual_credit_added" : "whatsapp_manual_credit_removed",
    entityType: "whatsapp_usage",
    entityId: usage.id,
    reason: parsed.data.reason,
    metadata: {
      condominium_id: parsed.data.condominium_id,
      amount,
      operation: parsed.data.operation,
      addon_credits_after: nextAddonCredits,
    },
  });
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/whatsapp/creditos");
  revalidatePath("/admin/whatsapp/uso");
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
}

const whatsappCondoStatusSchema = z.object({
  condominium_id: z.string().uuid(),
  action: z.enum(["block", "reactivate"]),
  reason: z.string().min(10, "Informe o motivo da acao."),
});

export async function updateCondoWhatsAppStatusAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
  ]);
  const parsed = whatsappCondoStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Acao invalida.");
  await assertAdminActionRateLimit(session, "condominium_whatsapp_status_changed", 20);

  const supabase = createAdminSupabase();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("settings")
    .eq("id", parsed.data.condominium_id)
    .single();
  const settings = {
    ...((condo?.settings ?? {}) as Record<string, unknown>),
    platform_whatsapp_disabled: parsed.data.action === "block",
    platform_whatsapp_status_reason: parsed.data.reason,
    platform_whatsapp_status_updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("condominiums")
    .update({ settings })
    .eq("id", parsed.data.condominium_id);
  if (error) throw new Error("Nao foi possivel atualizar o WhatsApp do condominio.");

  await supabase
    .from("whatsapp_accounts")
    .update({ status: parsed.data.action === "block" ? "blocked" : "active" })
    .eq("condominium_id", parsed.data.condominium_id);

  await logPlatformAction({
    session,
    action: parsed.data.action === "block" ? "condominium_whatsapp_blocked" : "condominium_whatsapp_reactivated",
    entityType: "condominiums",
    entityId: parsed.data.condominium_id,
    reason: parsed.data.reason,
    metadata: { whatsapp_disabled: parsed.data.action === "block" },
  });
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/whatsapp/erros");
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
}

const whatsappLogSupportSchema = z.object({
  log_id: z.string().uuid(),
  condominium_id: z.string().uuid(),
  subject: z.string().min(5).max(120),
  reason: z.string().min(10).max(1000),
});

export async function convertWhatsAppErrorToSupportTicketAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_security",
  ]);
  const parsed = whatsappLogSupportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Chamado invalido.");
  await assertAdminActionRateLimit(session, "whatsapp_error_converted_to_support", 20);

  const supabase = createAdminSupabase();
  const { data: log } = await supabase
    .from("whatsapp_message_logs")
    .select("id,status,message_type,error_message,created_at")
    .eq("id", parsed.data.log_id)
    .eq("condominium_id", parsed.data.condominium_id)
    .single();
  if (!log) throw new Error("Log WhatsApp nao encontrado.");

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      condominium_id: parsed.data.condominium_id,
      user_id: session.userId,
      category: "whatsapp",
      subject: parsed.data.subject,
      message: parsed.data.reason,
      status: "open",
      priority: log.status === "failed" ? "high" : "normal",
      metadata: {
        source: "platform_whatsapp_log",
        whatsapp_log_id: log.id,
        log_status: log.status,
        message_type: log.message_type,
        error_summary: String(log.error_message ?? "").slice(0, 240),
      },
    })
    .select("id")
    .single();
  if (error) throw new Error("Nao foi possivel criar chamado.");

  await logPlatformAction({
    session,
    action: "whatsapp_error_converted_to_support",
    entityType: "support_tickets",
    entityId: ticket.id,
    reason: parsed.data.reason,
    metadata: {
      condominium_id: parsed.data.condominium_id,
      whatsapp_log_id: log.id,
      status: log.status,
    },
  });
  revalidatePath("/admin/whatsapp/erros");
  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${ticket.id}`);
}

const condoPlanSchema = z.object({
  condominium_id: z.string().uuid(),
  plan: z.enum(["free", "premium", "pro", "total"]),
  reason: z.string().min(8),
});

export async function updateCondoPlanAdminAction(formData: FormData) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin"]);
  const parsed = condoPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados inválidos para alterar plano.");
  await assertAdminActionRateLimit(session, "condominium_plan_changed", 20);

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("condominiums")
    .update({ plan: parsed.data.plan })
    .eq("id", parsed.data.condominium_id);
  if (error) throw new Error("Não foi possível alterar o plano.");

  await logPlatformAction({
    session,
    action: "condominium_plan_changed",
    entityType: "condominiums",
    entityId: parsed.data.condominium_id,
    reason: parsed.data.reason,
    metadata: { plan: parsed.data.plan },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
  revalidatePath("/admin/condominios");
}

const condoStatusSchema = z.object({
  condominium_id: z.string().uuid(),
  status: z.enum(["active", "free", "trialing", "past_due", "blocked", "canceled"]),
  reason: z.string().min(8),
});

export async function updateCondoSubscriptionStatusAdminAction(formData: FormData) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin"]);
  const parsed = condoStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados inválidos para alterar status.");
  await assertAdminActionRateLimit(session, "condominium_subscription_status_changed", 20);

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("condominiums")
    .update({ subscription_status: parsed.data.status })
    .eq("id", parsed.data.condominium_id);
  if (error) throw new Error("Não foi possível alterar o status.");

  await logPlatformAction({
    session,
    action: "condominium_subscription_status_changed",
    entityType: "condominiums",
    entityId: parsed.data.condominium_id,
    reason: parsed.data.reason,
    metadata: { status: parsed.data.status },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
  revalidatePath("/admin/condominios");
}

const adminNoteSchema = z.object({
  condominium_id: z.string().uuid(),
  note: z.string().min(5).max(2000),
  visibility: z.enum(["internal", "security", "finance", "support"]).default("internal"),
});

export async function createAdminNoteAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
  ]);
  const parsed = adminNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Nota inválida.");
  await assertAdminActionRateLimit(session, "admin_note_created", 30);

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("admin_notes").insert({
    condominium_id: parsed.data.condominium_id,
    created_by: session.userId,
    note: parsed.data.note,
    visibility: parsed.data.visibility,
  });
  if (error) throw new Error("Não foi possível adicionar nota.");

  await logPlatformAction({
    session,
    action: "admin_note_created",
    entityType: "admin_notes",
    entityId: parsed.data.condominium_id,
    metadata: { visibility: parsed.data.visibility },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
}

const platformSupportTicketSchema = z.object({
  condominium_id: z.string().uuid(),
  subject: z.string().min(4).max(120),
  message: z.string().min(8).max(2000),
  category: z.enum([
    "duvida",
    "cobranca",
    "cancelamento",
    "reembolso",
    "problema_tecnico",
    "privacidade_lgpd",
    "seguranca",
    "whatsapp",
    "outro",
  ]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export async function createPlatformSupportTicketAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
  ]);
  const parsed = platformSupportTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Chamado inválido.");
  await assertAdminActionRateLimit(session, "platform_support_ticket_created", 30);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      condominium_id: parsed.data.condominium_id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority,
      metadata: { opened_by_platform: session.email, platform_role: session.role },
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível abrir chamado.");

  await logPlatformAction({
    session,
    action: "platform_support_ticket_created",
    entityType: "support_tickets",
    entityId: data.id,
    metadata: { condominium_id: parsed.data.condominium_id },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
  revalidatePath("/admin/suporte");
}

const platformRefundSchema = z.object({
  condominium_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().positive(),
  reason: z.string().min(8).max(1000),
  provider: z.string().max(40).optional().or(z.literal("")),
});

export async function createPlatformRefundRequestAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_support",
  ]);
  const parsed = platformRefundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Reembolso inválido.");
  await assertAdminActionRateLimit(session, "platform_refund_request_created", 20);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("refund_requests")
    .insert({
      condominium_id: parsed.data.condominium_id,
      requested_by: session.userId,
      amount_cents: parsed.data.amount_cents,
      reason: parsed.data.reason,
      provider: parsed.data.provider || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar reembolso.");

  await logPlatformAction({
    session,
    action: "platform_refund_request_created",
    entityType: "refund_requests",
    entityId: data.id,
    reason: parsed.data.reason,
    metadata: { condominium_id: parsed.data.condominium_id, amount_cents: parsed.data.amount_cents },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
  revalidatePath("/admin/reembolsos");
}

const refundDecisionSchema = z.object({
  refund_id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "processed", "canceled"]),
  decision_note: z.string().min(10, "Toda decisão exige uma nota clara."),
  approved_amount_cents: z.coerce.number().int().nonnegative().optional(),
});

export async function decideRefundRequestAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
  ]);
  const parsed = refundDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Decisão inválida.");
  await assertAdminActionRateLimit(session, "refund_decision_recorded", 20);

  const supabase = createAdminSupabase();
  const { data: refund } = await supabase
    .from("refund_requests")
    .select("id,condominium_id,amount_cents,provider,status")
    .eq("id", parsed.data.refund_id)
    .single();

  if (!refund) throw new Error("Pedido de reembolso não encontrado.");

  const amount = parsed.data.approved_amount_cents || refund.amount_cents || 0;
  const { error } = await supabase
    .from("refund_requests")
    .update({
      status: parsed.data.status,
      decision_note: parsed.data.decision_note,
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.refund_id);
  if (error) throw new Error("Não foi possível registrar a decisão.");

  await supabase.from("billing_events").insert({
    condominium_id: refund.condominium_id,
    user_id: session.userId,
    event_type: `refund_${parsed.data.status}`,
    provider: refund.provider || "manual",
    amount_cents: amount,
    currency: "BRL",
    status: parsed.data.status,
    metadata: {
      refund_id: refund.id,
      decision_note: parsed.data.decision_note,
      previous_status: refund.status,
      gateway_action: "manual_pending_provider_adapter",
    },
  });

  await logPlatformAction({
    session,
    action: "refund_decision_recorded",
    entityType: "refund_requests",
    entityId: refund.id,
    reason: parsed.data.decision_note,
    metadata: { status: parsed.data.status, amount_cents: amount },
  });
  revalidatePath("/admin/reembolsos");
  revalidatePath(`/admin/reembolsos/${refund.id}`);
  if (refund.condominium_id) revalidatePath(`/admin/condominios/${refund.condominium_id}`);
}

const billingEventSchema = z.object({
  condominium_id: z.string().uuid(),
  event_type: z.string().min(3).max(80),
  provider: z.string().max(40).optional().or(z.literal("")),
  amount_cents: z.coerce.number().int().optional(),
  status: z.string().max(40).optional().or(z.literal("")),
  note: z.string().min(8).max(1000),
});

export async function createBillingEventAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
  ]);
  const parsed = billingEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Evento financeiro inválido.");
  await assertAdminActionRateLimit(session, "billing_event_created", 30);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("billing_events")
    .insert({
      condominium_id: parsed.data.condominium_id,
      user_id: session.userId,
      event_type: parsed.data.event_type,
      provider: parsed.data.provider || "manual",
      amount_cents: parsed.data.amount_cents ?? null,
      currency: "BRL",
      status: parsed.data.status || "registered",
      metadata: { note: parsed.data.note, source: "platform_admin" },
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível gerar evento financeiro.");

  await logPlatformAction({
    session,
    action: "billing_event_created",
    entityType: "billing_events",
    entityId: data.id,
    reason: parsed.data.note,
    metadata: { condominium_id: parsed.data.condominium_id },
  });
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
  revalidatePath("/admin/financeiro");
}

const subscriptionActionSchema = z.object({
  condominium_id: z.string().uuid(),
  action: z.enum([
    "cancel_at_period_end",
    "cancel_immediately",
    "reactivate",
    "change_plan",
    "apply_manual_credit",
  ]),
  plan: z.enum(["free", "premium", "pro", "total"]).optional().or(z.literal("")),
  amount_cents: z.coerce.number().int().optional(),
  note: z.string().min(10, "Informe o impacto/motivo da ação."),
});

export async function updateSubscriptionAdminAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
  ]);
  const parsed = subscriptionActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ação inválida.");
  await assertAdminActionRateLimit(session, "subscription_admin_action", 20);

  const supabase = createAdminSupabase();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("id,plan,subscription_status,settings")
    .eq("id", parsed.data.condominium_id)
    .single();
  if (!condo) throw new Error("Assinatura não encontrada.");

  const settings = {
    ...((condo.settings ?? {}) as Record<string, unknown>),
    billing_admin: {
      action: parsed.data.action,
      note: parsed.data.note,
      amount_cents: parsed.data.amount_cents ?? null,
      cancel_at_period_end: parsed.data.action === "cancel_at_period_end",
      updated_by: session.email,
      updated_at: new Date().toISOString(),
    },
  };

  const patch: Record<string, unknown> = { settings };
  if (parsed.data.action === "cancel_immediately") patch.subscription_status = "canceled";
  if (parsed.data.action === "cancel_at_period_end") patch.subscription_status = "active";
  if (parsed.data.action === "reactivate") patch.subscription_status = "active";
  if (parsed.data.action === "change_plan" && parsed.data.plan) patch.plan = parsed.data.plan;

  const { error } = await supabase
    .from("condominiums")
    .update(patch)
    .eq("id", parsed.data.condominium_id);
  if (error) throw new Error("Não foi possível atualizar a assinatura.");

  const { data: event } = await supabase
    .from("billing_events")
    .insert({
      condominium_id: parsed.data.condominium_id,
      user_id: session.userId,
      event_type: parsed.data.action,
      provider: "manual",
      amount_cents: parsed.data.amount_cents ?? null,
      currency: "BRL",
      status: "registered",
      metadata: {
        note: parsed.data.note,
        previous_plan: condo.plan,
        previous_status: condo.subscription_status,
        new_plan: parsed.data.plan || condo.plan,
      },
    })
    .select("id")
    .single();

  await logPlatformAction({
    session,
    action: "subscription_admin_action",
    entityType: "condominiums",
    entityId: parsed.data.condominium_id,
    reason: parsed.data.note,
    metadata: { action: parsed.data.action, billing_event_id: event?.id ?? null },
  });
  revalidatePath("/admin/assinaturas");
  revalidatePath(`/admin/assinaturas/${parsed.data.condominium_id}`);
  revalidatePath(`/admin/condominios/${parsed.data.condominium_id}`);
}

const genericStatusSchema = z.object({
  table: z.enum(["refund_requests", "security_incidents", "data_requests"]),
  id: z.string().uuid(),
  status: z.string().min(2),
  reason: z.string().min(5),
});

const allowedStatusByTable: Record<
  z.infer<typeof genericStatusSchema>["table"],
  Set<string>
> = {
  refund_requests: new Set(["pending", "approved", "rejected", "processed", "canceled"]),
  security_incidents: new Set([
    "open",
    "triaging",
    "investigating",
    "contained",
    "resolved",
    "dismissed",
  ]),
  data_requests: new Set(["pending", "reviewing", "waiting_customer", "processed", "rejected", "canceled"]),
};

export async function updateAdminStatusAction(formData: FormData) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_security",
  ]);
  const parsed = genericStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Dados inválidos.");
  if (!allowedStatusByTable[parsed.data.table].has(parsed.data.status)) {
    throw new Error("Status não permitido para este tipo de registro.");
  }
  await assertAdminActionRateLimit(session, "platform_status_updated", 30);

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from(parsed.data.table)
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) throw new Error("Não foi possível atualizar o status.");

  await logPlatformAction({
    session,
    action: "platform_status_updated",
    entityType: parsed.data.table,
    entityId: parsed.data.id,
    reason: parsed.data.reason,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/admin");
}
