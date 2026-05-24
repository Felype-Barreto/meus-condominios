import { logPlatformAction } from "@/lib/admin/audit";
import type { PlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail, maskName, maskPhone } from "@/lib/admin/data";
import type { AdminSearchResult } from "@/lib/admin/search-shared";

export function isSensitiveAdminSearchTerm(query: string) {
  const trimmed = query.trim();
  const digits = trimmed.replace(/\D/g, "");
  return {
    email: /\S+@\S+\.\S+/.test(trimmed),
    phone: digits.length >= 8 && digits.length <= 14,
    document: digits.length === 11 || digits.length === 14,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed),
  };
}

function like(value: string) {
  return `%${value.replace(/[%_]/g, "")}%`;
}

function canSeeFinance(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_finance"].includes(role);
}

function canSeeAbuse(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_security", "platform_support"].includes(role);
}

function canSeeSecurity(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_security"].includes(role);
}

function canSeeLgpd(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_security", "platform_support"].includes(role);
}

function canSearchSensitiveUserFields(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_support", "platform_security", "platform_finance"].includes(role);
}

function canSeeUsers(role: PlatformSession["role"]) {
  return role !== "platform_readonly";
}

function canSeeSupport(role: PlatformSession["role"]) {
  return ["platform_owner", "platform_admin", "platform_support", "platform_finance", "platform_security"].includes(role);
}

function canAccessSupportCategory(role: PlatformSession["role"], category?: string | null) {
  if (["platform_owner", "platform_admin", "platform_support"].includes(role)) return true;
  if (role === "platform_finance") return ["cobranca", "cancelamento", "reembolso"].includes(category ?? "");
  if (role === "platform_security") return ["seguranca", "privacidade_lgpd"].includes(category ?? "");
  return false;
}

function uniqueResults(results: AdminSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.category}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function performAdminGlobalSearch({
  session,
  query,
  limit = 6,
  source = "modal",
}: {
  session: PlatformSession;
  query: string;
  limit?: number;
  source?: "modal" | "page";
}) {
  const q = query.trim();
  if (q.length < 2) return { results: [], sensitive: false };

  const flags = isSensitiveAdminSearchTerm(q);
  const sensitive = Object.values(flags).some(Boolean);
  const supabase = createAdminSupabase();
  const search = like(q.replace(/,/g, " "));
  const digits = q.replace(/\D/g, "");
  const idSearch = flags.uuid ? q : "";
  const userFields = canSearchSensitiveUserFields(session.role)
    ? `full_name.ilike.${search},email.ilike.${search},phone.ilike.%${digits || q}%`
    : `full_name.ilike.${search}`;

  const tasks: Array<PromiseLike<AdminSearchResult[]>> = [];

  tasks.push(
    supabase
      .from("condominiums")
      .select("id,name,slug,contact_email,plan,subscription_status,created_at")
      .or(
        [
          `name.ilike.${search}`,
          `slug.ilike.${search}`,
          canSearchSensitiveUserFields(session.role) ? `contact_email.ilike.${search}` : "",
          idSearch ? `id.eq.${idSearch}` : "",
        ]
          .filter(Boolean)
          .join(","),
      )
      .limit(limit)
      .then(({ data }) =>
        (data ?? []).map((item) => ({
          id: item.id,
          category: "condominiums" as const,
          title: item.name,
          description: `${item.slug} - ${maskEmail(item.contact_email)} - plano ${item.plan}`,
          href: `/admin/condominios/${item.id}`,
          status: item.subscription_status,
          badge: item.plan,
        })),
      ),
  );

  if (canSeeUsers(session.role)) {
    tasks.push(
      supabase
        .from("profiles")
        .select("id,full_name,email,phone,created_at")
        .or([userFields, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "users" as const,
            title: maskName(item.full_name),
            description: `${maskEmail(item.email)} - ${maskPhone(item.phone)}`,
            href: `/admin/usuarios?user_id=${item.id}`,
            status: null,
            badge: "usuario",
          })),
        ),
    );
  }

  if (canSeeSupport(session.role)) {
    tasks.push(
      supabase
        .from("support_tickets")
        .select("id,subject,category,status,priority,condominium_id,created_at")
        .or([`subject.ilike.${search}`, `category.ilike.${search}`, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? [])
            .filter((item) => canAccessSupportCategory(session.role, item.category))
            .map((item) => ({
              id: item.id,
              category: "support" as const,
              title: item.subject,
              description: `${item.category} - prioridade ${item.priority}`,
              href: `/admin/suporte/${item.id}`,
              status: item.status,
              badge: "suporte",
            })),
        ),
    );
  }

  if (canSeeFinance(session.role)) {
    tasks.push(
      supabase
        .from("refund_requests")
        .select("id,reason,status,amount_cents,currency,condominium_id,created_at")
        .or([`reason.ilike.${search}`, `status.ilike.${search}`, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "refunds" as const,
            title: item.reason,
            description: `${item.currency ?? "BRL"} ${(Number(item.amount_cents ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            href: `/admin/reembolsos/${item.id}`,
            status: item.status,
            badge: "reembolso",
          })),
        ),
    );

    tasks.push(
      supabase
        .from("condominiums")
        .select("id,name,slug,plan,subscription_status")
        .or([`name.ilike.${search}`, `slug.ilike.${search}`, `plan.ilike.${search}`, `subscription_status.ilike.${search}`, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "subscriptions" as const,
            title: `Assinatura - ${item.name}`,
            description: `${item.slug} - plano ${item.plan}`,
            href: `/admin/assinaturas/${item.id}`,
            status: item.subscription_status,
            badge: item.plan,
          })),
        ),
    );
  }

  if (canSeeAbuse(session.role)) {
    tasks.push(
      supabase
        .from("abuse_reports")
        .select("id,reason,status,severity,condominium_id,created_at")
        .or([`reason.ilike.${search}`, `status.ilike.${search}`, `severity.ilike.${search}`, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "abuse" as const,
            title: "Denuncia protegida",
            description: `Conteudo sensivel protegido - severidade ${item.severity}`,
            href: `/admin/denuncias/${item.id}`,
            status: item.status,
            badge: item.severity,
          })),
        ),
    );
  }

  if (canSeeLgpd(session.role)) {
    tasks.push(
      supabase
        .from("data_requests")
        .select("id,request_type,status,requested_by_email,description,created_at")
        .or([
          `request_type.ilike.${search}`,
          `status.ilike.${search}`,
          canSearchSensitiveUserFields(session.role) ? `requested_by_email.ilike.${search}` : "",
          idSearch ? `id.eq.${idSearch}` : "",
        ].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "lgpd" as const,
            title: `Pedido ${item.request_type}`,
            description: `${maskEmail(item.requested_by_email)} - conteudo do pedido protegido`,
            href: `/admin/lgpd/${item.id}`,
            status: item.status,
            badge: "dados",
          })),
        ),
    );
  }

  if (canSeeSecurity(session.role)) {
    tasks.push(
      supabase
        .from("security_incidents")
        .select("id,title,incident_type,severity,status,condominium_id,created_at")
        .or([`title.ilike.${search}`, `incident_type.ilike.${search}`, `status.ilike.${search}`, idSearch ? `id.eq.${idSearch}` : ""].filter(Boolean).join(","))
        .limit(limit)
        .then(({ data }) =>
          (data ?? []).map((item) => ({
            id: item.id,
            category: "incidents" as const,
            title: item.title,
            description: `${item.incident_type} - severidade ${item.severity}`,
            href: `/admin/incidentes/${item.id}`,
            status: item.status,
            badge: item.severity,
          })),
        ),
    );
  }

  const settled = await Promise.allSettled(tasks);
  const results = uniqueResults(
    settled.flatMap((item) => (item.status === "fulfilled" ? item.value : [])),
  ).slice(0, limit * 8);

  if (sensitive) {
    await logPlatformAction({
      session,
      action: "platform_global_search_sensitive",
      entityType: "platform_search",
      reason: "Busca global com termo potencialmente sensivel",
      metadata: {
        source,
        query_length: q.length,
        flags,
        result_count: results.length,
      },
    });
  }

  return { results, sensitive };
}
