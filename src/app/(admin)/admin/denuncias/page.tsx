import Link from "next/link";
import { AlertTriangle, ShieldCheck, UserRoundSearch } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em analise",
  action_required: "Precisa de acao",
  resolved: "Resolvida",
  rejected: "Rejeitada",
  escalated: "Escalada",
};

const severityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  critical: "Critica",
};

const typeLabels: Record<string, string> = {
  assedio: "Assedio",
  exposicao_de_dados: "Exposicao de dados",
  spam: "Spam",
  whatsapp_sem_consentimento: "WhatsApp sem consentimento",
  qr_publico_abusivo: "QR publico abusivo",
  conteudo_ofensivo: "Conteudo ofensivo",
  tentativa_de_invasao: "Tentativa de invasao",
  uso_indevido_de_dados: "Uso indevido de dados",
  outro: "Outro",
};

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function includesText(value: unknown, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

export default async function AdminAbuseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string; q?: string }>;
}) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_security",
    "platform_readonly",
  ]);
  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const severityFilter = params.severity ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const supabase = createAdminSupabase();
  const { data: reports } = await supabase
    .from("abuse_reports")
    .select(`
      id,
      condominium_id,
      reported_by,
      reported_user_id,
      entity_type,
      entity_id,
      reason,
      description,
      status,
      severity,
      assigned_to,
      created_at,
      updated_at,
      condominiums(id,name,slug)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (reports ?? []).filter((report) => {
    if (statusFilter && report.status !== statusFilter) return false;
    if (severityFilter && report.severity !== severityFilter) return false;
    if (!query) return true;
    const condo = joined(report.condominiums);
    return [
      report.id,
      report.reason,
      report.description,
      report.entity_type,
      report.entity_id,
      condo?.name,
      condo?.slug,
    ].some((value) => includesText(value, query));
  });

  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.reported_by, row.reported_user_id, row.assigned_to])
        .filter(Boolean) as string[],
    ),
  );
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const reviewingCount = rows.filter((row) => ["reviewing", "action_required"].includes(row.status ?? "")).length;
  const severeCount = rows.filter((row) => ["high", "critical"].includes(row.severity ?? "")).length;
  const escalatedCount = rows.filter((row) => row.status === "escalated").length;
  const canAct = ["platform_owner", "platform_admin", "platform_security"].includes(session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">Denuncias e abuso</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Triagem interna de mau uso, exposicao de dados, spam, WhatsApp indevido, QR publico abusivo e conteudo ofensivo.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/seguranca">Ver seguranca</Link>
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div className="text-sm leading-6 text-amber-950">
            <p className="font-semibold">Nao exponha o denunciante para usuarios do condominio.</p>
            <p>Dados sensiveis ficam mascarados e acoes severas exigem motivo. Bloqueios, suspensoes e conversao em incidente geram trilha de auditoria.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Pendentes" value={pendingCount} />
        <AdminMetricCard label="Em analise" value={reviewingCount} />
        <AdminMetricCard label="Alta/Critica" value={severeCount} />
        <AdminMetricCard label="Escaladas" value={escalatedCount} />
      </div>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por condominio, tipo, descricao ou entidade"
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          />
          <select name="status" defaultValue={statusFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="severity" defaultValue={severityFilter} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todas as severidades</option>
            {Object.entries(severityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {rows.length ? (
          rows.map((report) => {
            const condo = joined(report.condominiums);
            const reporter = report.reported_by ? profileById.get(report.reported_by) : null;
            const reportedUser = report.reported_user_id ? profileById.get(report.reported_user_id) : null;
            const assigned = report.assigned_to ? profileById.get(report.assigned_to) : null;
            return (
              <Card key={report.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserRoundSearch className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">{typeLabels[report.reason ?? ""] ?? report.reason}</h2>
                      <AdminStatus value={statusLabels[report.status ?? ""] ?? report.status} />
                      <AdminStatus value={severityLabels[report.severity ?? "normal"] ?? report.severity} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {report.description || "Sem descricao detalhada."}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <p><strong className="text-foreground">Condominio:</strong> {condo?.name ?? "Nao vinculado"}</p>
                      <p><strong className="text-foreground">Denunciante:</strong> {reporter?.full_name ?? maskEmail(reporter?.email)}</p>
                      <p><strong className="text-foreground">Denunciado:</strong> {reportedUser?.full_name ?? maskEmail(reportedUser?.email)}</p>
                      <p><strong className="text-foreground">Responsavel:</strong> {assigned?.full_name ?? maskEmail(assigned?.email)}</p>
                      <p><strong className="text-foreground">Entidade:</strong> {report.entity_type ?? "Nao informada"}</p>
                      <p><strong className="text-foreground">ID:</strong> {report.entity_id ?? "Nao informado"}</p>
                      <p><strong className="text-foreground">Criada:</strong> {new Date(report.created_at).toLocaleString("pt-BR")}</p>
                      <p><strong className="text-foreground">Atualizada:</strong> {new Date(report.updated_at ?? report.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button asChild>
                      <Link href={`/admin/denuncias/${report.id}`}>Investigar</Link>
                    </Button>
                    {condo?.id ? (
                      <Button asChild variant="outline">
                        <Link href={`/admin/condominios/${condo.id}`}>Ver condominio</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Nenhuma denuncia encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste os filtros ou aguarde novos registros de abuso.
            </p>
          </Card>
        )}
      </div>

      {!canAct ? (
        <Card className="p-5 text-sm text-muted-foreground">
          Seu papel permite leitura limitada e comentarios internos, mas nao permite bloqueio, suspensao ou decisao final.
        </Card>
      ) : null}
    </div>
  );
}
