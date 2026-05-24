import Link from "next/link";
import { createSecurityIncidentAdminAction, updateSecurityIncidentAdminAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase } from "@/lib/admin/data";

const incidentTypes = {
  suspected_data_leak: "Suspeita de vazamento",
  unauthorized_access: "Acesso indevido",
  abusive_use: "Uso abusivo",
  whatsapp_spam: "Spam no WhatsApp",
  qr_abuse: "Abuso no QR publico",
  payment_issue: "Pagamento",
  account_takeover: "Conta comprometida",
  other: "Outro",
};

const statusLabels = {
  open: "Aberto",
  triaging: "Triagem",
  investigating: "Investigando",
  contained: "Contido",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

const severityLabels = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function includesText(value: unknown, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

function isOpen(status?: string | null) {
  return !["resolved", "dismissed"].includes(status ?? "");
}

export default async function AdminSecurityIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string; type?: string; q?: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_security"]);
  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const severityFilter = params.severity ?? "";
  const typeFilter = params.type ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const supabase = createAdminSupabase();
  const [{ data: incidents }, { data: condos }, { data: abuseReports }] = await Promise.all([
    supabase
      .from("security_incidents")
      .select("id,condominium_id,incident_type,severity,title,description,status,created_at,updated_at,condominiums(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("condominiums").select("id,name,slug").order("name", { ascending: true }).limit(300),
    supabase.from("abuse_reports").select("id,reason,status,condominium_id").neq("status", "resolved").limit(100),
  ]);
  const rows = (incidents ?? []).filter((incident) => {
    if (statusFilter && incident.status !== statusFilter) return false;
    if (severityFilter && incident.severity !== severityFilter) return false;
    if (typeFilter && incident.incident_type !== typeFilter) return false;
    if (!query) return true;
    const condo = joined(incident.condominiums);
    return [incident.title, incident.description, incident.incident_type, incident.id, condo?.name, condo?.slug].some((value) =>
      includesText(value, query),
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">Incidentes de seguranca</h1>
          <p className="mt-2 text-sm text-muted-foreground">Triagem, investigacao e registro de acoes tomadas.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/seguranca">Central de seguranca</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Abertos" value={rows.filter((item) => isOpen(item.status)).length} />
        <AdminMetricCard label="Criticos" value={rows.filter((item) => item.severity === "critical").length} />
        <AdminMetricCard label="Em investigacao" value={rows.filter((item) => item.status === "investigating").length} />
        <AdminMetricCard label="Total filtrado" value={rows.length} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Criar incidente manual</h2>
        <form action={createSecurityIncidentAdminAction} className="mt-4 grid gap-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <select name="condominium_id" defaultValue="" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="">Plataforma / sem condominio</option>
              {(condos ?? []).map((condo) => (
                <option key={condo.id} value={condo.id}>{condo.name}</option>
              ))}
            </select>
            <select name="incident_type" defaultValue="other" className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(incidentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="severity" defaultValue="medium" className="h-11 rounded-lg border bg-card px-3 text-sm">
              {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="linked_abuse_report_id" defaultValue="" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="">Sem denuncia vinculada</option>
              {(abuseReports ?? []).map((report) => (
                <option key={report.id} value={report.id}>{report.reason} - {report.status}</option>
              ))}
            </select>
          </div>
          <Input name="title" placeholder="Titulo do incidente" required />
          <Input name="description" placeholder="Descricao inicial e impacto conhecido" required />
          <Button type="submit" className="w-full sm:w-fit">Criar incidente</Button>
        </form>
      </Card>

      <Card className="p-5">
        <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Buscar incidente, condominio ou ID" className="h-11 rounded-lg border bg-card px-3 text-sm" />
          <select name="status" defaultValue={statusFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="severity" defaultValue={severityFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todas severidades</option>
            {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="type" defaultValue={typeFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os tipos</option>
            {Object.entries(incidentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {rows.map((incident) => {
          const condo = joined(incident.condominiums);
          return (
            <Card key={incident.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/incidentes/${incident.id}`} className="text-lg font-semibold hover:text-primary">{incident.title}</Link>
                    <AdminStatus value={statusLabels[incident.status as keyof typeof statusLabels] ?? incident.status} />
                    <AdminStatus value={severityLabels[incident.severity as keyof typeof severityLabels] ?? incident.severity} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {incidentTypes[incident.incident_type as keyof typeof incidentTypes] ?? incident.incident_type} - {condo?.name ?? "Plataforma"} - {new Date(incident.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{incident.description}</p>
                </div>
                <Button asChild><Link href={`/admin/incidentes/${incident.id}`}>Investigar</Link></Button>
              </div>
              <form action={updateSecurityIncidentAdminAction} className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                <input type="hidden" name="incident_id" value={incident.id} />
                <select name="status" defaultValue={incident.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select name="severity" defaultValue={incident.severity} className="h-11 rounded-lg border bg-card px-3 text-sm">
                  {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select name="action_type" defaultValue="investigation_note" className="h-11 rounded-lg border bg-card px-3 text-sm">
                  <option value="triage_started">Triagem iniciada</option>
                  <option value="investigation_note">Nota de investigacao</option>
                  <option value="containment_action">Acao de contencao</option>
                  <option value="risk_reviewed">Risco revisado</option>
                  <option value="resolved">Resolvido</option>
                  <option value="dismissed">Descartado</option>
                </select>
                <Input name="action_note" placeholder="Nota obrigatoria da acao" required />
                <Button type="submit" variant="outline">Atualizar</Button>
              </form>
            </Card>
          );
        })}
        {!rows.length ? (
          <Card className="p-6 text-center">
            <h2 className="text-lg font-semibold">Nenhum incidente encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou crie um incidente manual.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
