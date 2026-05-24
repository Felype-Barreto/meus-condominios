import Link from "next/link";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

const typeLabels: Record<string, string> = {
  export: "Exportacao",
  correction: "Correcao",
  deletion: "Exclusao",
  portability: "Portabilidade",
  consent_revocation: "Revogacao de consentimento",
  privacy_question: "Duvida de privacidade",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em analise",
  waiting_customer: "Aguardando cliente",
  processed: "Processado",
  rejected: "Rejeitado",
  canceled: "Cancelado",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dueDate(createdAt: string, priority?: string | null) {
  const date = new Date(createdAt);
  const days = priority === "urgent" ? 2 : priority === "high" ? 5 : 15;
  date.setDate(date.getDate() + days);
  return date;
}

function includesText(value: unknown, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

function isOverdue(createdAt: string, priority?: string | null, status?: string | null) {
  if (["processed", "rejected", "canceled"].includes(status ?? "")) return false;
  return dueDate(createdAt, priority).getTime() < Date.now();
}

export default async function AdminLgpdPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; priority?: string; q?: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_security", "platform_support"]);
  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const typeFilter = params.type ?? "";
  const priorityFilter = params.priority ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const supabase = createAdminSupabase();
  const { data: requests } = await supabase
    .from("data_requests")
    .select(`
      id,
      condominium_id,
      user_id,
      request_type,
      status,
      priority,
      assigned_to,
      description,
      requested_by_email,
      created_at,
      updated_at,
      condominiums(id,name,slug),
      profiles!data_requests_user_id_fkey(full_name,email,phone)
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (requests ?? []).filter((request) => {
    if (statusFilter && request.status !== statusFilter) return false;
    if (typeFilter && request.request_type !== typeFilter) return false;
    if (priorityFilter && request.priority !== priorityFilter) return false;
    if (!query) return true;
    const condo = joined(request.condominiums);
    const profile = joined(request.profiles);
    return [
      request.id,
      request.request_type,
      request.description,
      request.requested_by_email,
      condo?.name,
      condo?.slug,
      profile?.full_name,
      profile?.email,
    ].some((value) => includesText(value, query));
  });

  const assignedIds = Array.from(new Set(rows.map((row) => row.assigned_to).filter(Boolean))) as string[];
  const { data: assignedProfiles } = assignedIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", assignedIds)
    : { data: [] };
  const assignedById = new Map((assignedProfiles ?? []).map((profile) => [profile.id, profile]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">LGPD e pedidos de dados</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Atendimento de exportacao, correcao, exclusao, portabilidade, revogacao de consentimento e duvidas de privacidade.
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/logs?source=platform_admin_audit_logs&action=data_request">Ver logs</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Pendentes" value={rows.filter((r) => r.status === "pending").length} />
        <AdminMetricCard label="Exclusao" value={rows.filter((r) => r.request_type === "deletion").length} />
        <AdminMetricCard label="Urgentes" value={rows.filter((r) => r.priority === "urgent").length} />
        <AdminMetricCard label="Vencidos" value={rows.filter((r) => isOverdue(r.created_at, r.priority, r.status)).length} />
      </div>

      <Card className="p-5">
        <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por pessoa, condominio, e-mail ou descricao" className="h-11 rounded-lg border bg-card px-3 text-sm" />
          <select name="status" defaultValue={statusFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="type" defaultValue={typeFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="priority" defaultValue={priorityFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Prioridade</option>
            {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {rows.map((request) => {
          const condo = joined(request.condominiums);
          const profile = joined(request.profiles);
          const assigned = request.assigned_to ? assignedById.get(request.assigned_to) : null;
          const due = dueDate(request.created_at, request.priority);
          const overdue = isOverdue(request.created_at, request.priority, request.status);
          return (
            <Card key={request.id} className={overdue ? "border-destructive/40 p-5" : "p-5"}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/lgpd/${request.id}`} className="text-lg font-semibold hover:text-primary">
                      {typeLabels[request.request_type] ?? request.request_type}
                    </Link>
                    <AdminStatus value={statusLabels[request.status] ?? request.status} />
                    <AdminStatus value={priorityLabels[request.priority ?? "normal"] ?? request.priority} />
                    {overdue ? <AdminStatus value="prazo interno vencido" /> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Usuario: {profile?.full_name ?? maskEmail(profile?.email ?? request.requested_by_email)} - Condominio: {condo?.name ?? "Conta geral"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Criado em {new Date(request.created_at).toLocaleString("pt-BR")} - Prazo interno: {due.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{request.description || "Sem descricao detalhada."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Responsavel: {assigned?.full_name ?? maskEmail(assigned?.email)}</p>
                </div>
                <Button asChild><Link href={`/admin/lgpd/${request.id}`}>Atender</Link></Button>
              </div>
            </Card>
          );
        })}
        {!rows.length ? (
          <Card className="p-6 text-center">
            <h2 className="text-lg font-semibold">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos pedidos.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
