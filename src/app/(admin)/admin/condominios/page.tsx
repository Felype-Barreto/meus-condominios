import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    plan?: string;
    status?: string;
    created?: string;
    flag?: string;
  }>;
};

type Usage = {
  blocks?: number;
  apartments?: number;
  storage_mb?: number;
};

function getProfile(row: { profiles?: unknown }) {
  const profile = row.profiles;
  if (Array.isArray(profile)) return profile[0] as { full_name?: string; email?: string } | undefined;
  return profile as { full_name?: string; email?: string } | undefined;
}

function riskLabel(input: {
  status?: string | null;
  openSupport: number;
  openAbuse: number;
  openIncidents: number;
  openDataRequests: number;
  whatsappPercent: number;
  storagePercent: number;
}) {
  if (input.openIncidents > 0 || input.openAbuse > 0 || input.status === "blocked") return "alto";
  if (
    input.status === "past_due" ||
    input.openSupport > 0 ||
    input.openDataRequests > 0 ||
    input.whatsappPercent >= 80 ||
    input.storagePercent >= 80
  ) {
    return "atenção";
  }
  return "normal";
}

export default async function AdminCondominiumsPage({ searchParams }: PageProps) {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
    "platform_readonly",
  ]);
  const params = (await searchParams) ?? {};
  const supabase = createAdminSupabase();
  const [{ data: condos }, { data: limits }] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id,name,slug,plan,subscription_status,contact_email,owner_user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("plan_limits").select("plan,max_storage_mb"),
  ]);

  const baseRows = condos ?? [];
  const condoIds = baseRows.map((condo) => condo.id);
  const ownerIds = baseRows.map((condo) => condo.owner_user_id).filter(Boolean) as string[];

  const [
    { data: memberships },
    { data: owners },
    { data: whatsappUsage },
    { data: support },
    { data: abuse },
    { data: incidents },
    { data: dataRequests },
    { data: auditLogs },
  ] = await Promise.all([
    condoIds.length
      ? supabase
          .from("memberships")
          .select("id,condominium_id,role,status,is_primary_syndic,user_id,profiles(full_name,email)")
          .in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    ownerIds.length
      ? supabase.from("profiles").select("id,full_name,email").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase
          .from("whatsapp_usage")
          .select("condominium_id,used_credits,included_credits,addon_credits,month")
          .in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase.from("support_tickets").select("id,condominium_id,status").in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase.from("abuse_reports").select("id,condominium_id,status").in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase.from("security_incidents").select("id,condominium_id,status").in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase.from("data_requests").select("id,condominium_id,status").in("condominium_id", condoIds)
      : Promise.resolve({ data: [] }),
    condoIds.length
      ? supabase
          .from("audit_logs")
          .select("id,condominium_id,created_at")
          .in("condominium_id", condoIds)
          .order("created_at", { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [] }),
  ]);

  const usageEntries = await Promise.all(
    baseRows.map(async (condo) => {
      const { data } = await supabase.rpc("get_current_usage", { condo_id: condo.id });
      return [condo.id, (data ?? {}) as Usage] as const;
    }),
  );
  const usageByCondo = new Map(usageEntries);
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]));
  const limitsByPlan = new Map((limits ?? []).map((limit) => [limit.plan, limit]));

  let rows = baseRows.map((condo) => {
    const condoMemberships = (memberships ?? []).filter((item) => item.condominium_id === condo.id);
    const owner = ownerById.get(condo.owner_user_id ?? "");
    const primarySyndic = condoMemberships.find(
      (item) => item.role === "syndic" || item.is_primary_syndic,
    );
    const activeUsers = condoMemberships.filter((item) => item.status === "active").length;
    const usage = usageByCondo.get(condo.id) ?? {};
    const planLimit = limitsByPlan.get(condo.plan);
    const whatsapp = (whatsappUsage ?? [])
      .filter((item) => item.condominium_id === condo.id)
      .reduce(
        (acc, item) => ({
          used: acc.used + Number(item.used_credits ?? 0),
          limit: Math.max(acc.limit, Number(item.included_credits ?? 0) + Number(item.addon_credits ?? 0)),
        }),
        { used: 0, limit: 0 },
      );
    const openSupport = (support ?? []).filter(
      (item) => item.condominium_id === condo.id && item.status !== "closed",
    ).length;
    const openAbuse = (abuse ?? []).filter(
      (item) => item.condominium_id === condo.id && item.status === "pending",
    ).length;
    const openIncidents = (incidents ?? []).filter(
      (item) => item.condominium_id === condo.id && !["resolved", "closed"].includes(item.status ?? ""),
    ).length;
    const openDataRequests = (dataRequests ?? []).filter(
      (item) => item.condominium_id === condo.id && !["processed", "rejected", "canceled"].includes(item.status ?? ""),
    ).length;
    const lastAccess = (auditLogs ?? []).find((item) => item.condominium_id === condo.id)?.created_at ?? null;
    const storageLimit = Number(planLimit?.max_storage_mb ?? 0);
    const storagePercent = storageLimit ? (Number(usage.storage_mb ?? 0) / storageLimit) * 100 : 0;
    const whatsappPercent = whatsapp.limit ? (whatsapp.used / whatsapp.limit) * 100 : 0;
    const risk = riskLabel({
      status: condo.subscription_status,
      openSupport,
      openAbuse,
      openIncidents,
      openDataRequests,
      whatsappPercent,
      storagePercent,
    });

    return {
      ...condo,
      owner,
      primarySyndic,
      activeUsers,
      usage,
      whatsapp,
      storagePercent,
      whatsappPercent,
      openSupport,
      openAbuse,
      openIncidents,
      openDataRequests,
      lastAccess,
      risk,
    };
  });

  const q = params.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.contact_email?.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q),
    );
  }
  if (params.plan && params.plan !== "all") rows = rows.filter((row) => row.plan === params.plan);
  if (params.status && params.status !== "all") {
    rows = rows.filter((row) => row.subscription_status === params.status);
  }
  if (params.created && params.created !== "all") {
    const days = Number(params.created);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const since = cutoff.getTime();
    rows = rows.filter((row) => new Date(row.created_at).getTime() >= since);
  }
  if (params.flag === "whatsapp_high") rows = rows.filter((row) => row.whatsappPercent >= 80);
  if (params.flag === "storage_high") rows = rows.filter((row) => row.storagePercent >= 80);
  if (params.flag === "abuse_open") rows = rows.filter((row) => row.openAbuse > 0);
  if (params.flag === "support_open") rows = rows.filter((row) => row.openSupport > 0);
  if (params.flag === "lgpd_open") rows = rows.filter((row) => row.openDataRequests > 0);

  const paid = rows.filter((row) => row.plan !== "free").length;
  const riskRows = rows.filter((row) => row.risk !== "normal").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Condomínios</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestão operacional dos condomínios, com dados sensíveis mascarados por padrão.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Total filtrado" value={rows.length} />
        <AdminMetricCard label="Planos pagos" value={paid} />
        <AdminMetricCard label="Plano grátis" value={rows.length - paid} />
        <AdminMetricCard label="Com atenção" value={riskRows} />
      </div>

      <Card className="p-5">
        <form className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]" action="/admin/condominios">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nome, slug, e-mail ou ID" />
          <select name="plan" defaultValue={params.plan ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todos os planos</option>
            <option value="free">Grátis</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="total">Total</option>
          </select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todos status</option>
            <option value="active">Ativa</option>
            <option value="free">Grátis</option>
            <option value="trialing">Trial</option>
            <option value="past_due">Inadimplente</option>
            <option value="blocked">Bloqueada</option>
            <option value="canceled">Cancelada</option>
          </select>
          <select name="created" defaultValue={params.created ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Qualquer criação</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <select name="flag" defaultValue={params.flag ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Sem alerta específico</option>
            <option value="whatsapp_high">Uso alto de WhatsApp</option>
            <option value="storage_high">Uso alto de storage</option>
            <option value="abuse_open">Com denúncia aberta</option>
            <option value="support_open">Com suporte aberto</option>
            <option value="lgpd_open">Com pedido LGPD aberto</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Condomínio</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Estrutura</th>
                <th>Usuários</th>
                <th>Síndico/Admin</th>
                <th>WhatsApp</th>
                <th>Storage</th>
                <th>Criado</th>
                <th>Último acesso</th>
                <th>Risco</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((condo) => {
                const syndicProfile = getProfile(condo.primarySyndic ?? {});
                return (
                  <tr key={condo.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link className="font-semibold hover:text-primary" href={`/admin/condominios/${condo.id}`}>
                        {condo.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{condo.slug} · {maskEmail(condo.contact_email)}</p>
                    </td>
                    <td className="capitalize">{condo.plan}</td>
                    <td><AdminStatus value={condo.subscription_status} /></td>
                    <td>{condo.usage.blocks ?? 0} blocos · {condo.usage.apartments ?? 0} aptos</td>
                    <td>{condo.activeUsers} ativos</td>
                    <td>
                      <p>{condo.owner?.full_name ?? "Owner não definido"}</p>
                      <p className="text-xs text-muted-foreground">{syndicProfile?.full_name ?? "Síndico não definido"}</p>
                    </td>
                    <td>{condo.whatsapp.used}/{condo.whatsapp.limit || 0}</td>
                    <td>{condo.usage.storage_mb ?? 0} MB</td>
                    <td>{new Date(condo.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>{condo.lastAccess ? new Date(condo.lastAccess).toLocaleDateString("pt-BR") : "Sem registro"}</td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        {condo.risk !== "normal" ? <AlertTriangle className="h-4 w-4 text-amber-700" /> : null}
                        <AdminStatus value={condo.risk} />
                      </span>
                    </td>
                    <td>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/condominios/${condo.id}`}>
                          Abrir <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
