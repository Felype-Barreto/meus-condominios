import Link from "next/link";
import { IncidentForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteIncidentAction, updateIncidentStatusAction } from "@/lib/actions/core-modules";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Bell, Lock, Trash2 } from "lucide-react";

type IncidentRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  attachments: string[] | null;
  created_at: string;
  created_by_profile?: { full_name: string | null; email: string | null } | null;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Aberta",
    reviewing: "Em análise",
    resolved: "Resolvida",
    archived: "Arquivada",
  };
  return labels[status] ?? status;
}

function severityTone(severity: string) {
  if (severity === "critical") return "error" as const;
  if (severity === "high") return "warning" as const;
  return "neutral" as const;
}

async function signedAttachmentMap(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, rows: IncidentRow[]) {
  const paths = Array.from(new Set(rows.flatMap((row) => row.attachments ?? []).filter(Boolean)));
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("morai-documents").createSignedUrls(paths, 60 * 30);
  return new Map((data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

export default async function IncidentsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  const [{ data: canCreateIncident }, { data: canReviewIncident }] = await Promise.all([
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "incidents.create" }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "incidents.review" }),
  ]);
  const canView = !access.isResident && (access.isAdmin || access.isSyndic || access.isDoorman || Boolean(canReviewIncident));
  const canCreate = !access.isResident && (access.isAdmin || access.isSyndic || access.isDoorman || Boolean(canCreateIncident));
  const canManage = !access.isResident && (access.isAdmin || access.isSyndic || Boolean(canReviewIncident));

  if (!canView) {
    return (
      <Card className="p-6">
        <Lock className="h-6 w-6 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Ocorrências são internas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Moradores devem usar Solicitações para reclamações, manutenção e sugestões. Ocorrências ficam restritas à administração, síndico e guarita autorizada.
        </p>
      </Card>
    );
  }

  const [{ data: incidents }, { data: apartments }] = await Promise.all([
    supabase
      .from("incidents")
      .select("id,type,title,description,severity,status,attachments,created_at,created_by_profile:profiles!incidents_created_by_fkey(full_name,email),apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(getEconomyPageSize(60)),
    supabase
      .from("apartments")
      .select("id,number,blocks(name)")
      .eq("condominium_id", condoId)
      .order("number")
      .limit(getEconomyPageSize(300)),
  ]);
  const incidentRows = (incidents ?? []) as unknown as IncidentRow[];
  const attachmentUrls = await signedAttachmentMap(supabase, incidentRows);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Segurança</p>
        <h1 className="mt-2 text-3xl font-semibold">Ocorrências</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Ocorrência é registro interno: algo relevante para administração, síndico ou guarita acompanharem e manterem histórico.
        </p>
      </div>
      {canCreate ? <IncidentForm condoId={condoId} apartments={(apartments ?? []) as never} /> : null}
      {incidentRows.length ? (
        <div className="space-y-3">
          {incidentRows.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{item.type}</StatusBadge>
                    <StatusBadge tone={severityTone(item.severity)}>{item.severity}</StatusBadge>
                    <StatusBadge>{statusLabel(item.status)}</StatusBadge>
                  </div>
                  <h2 className="mt-3 font-semibold">{item.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>{item.apartments?.blocks?.name ?? "Sem bloco"} - {item.apartments?.number ?? "sem apto"}</span>
                    <span>Criado por: {item.created_by_profile?.full_name ?? item.created_by_profile?.email ?? "Não informado"}</span>
                    <span>{new Date(item.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {item.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.attachments.map((path, index) => (
                        <Button key={path} asChild variant="outline" size="sm">
                          <Link href={attachmentUrls.get(path) ?? "#"} target="_blank">Anexo {index + 1}</Link>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <form action={updateIncidentStatusAction} className="flex gap-2">
                      <input type="hidden" name="condominium_id" value={condoId} />
                      <input type="hidden" name="incident_id" value={item.id} />
                      <select name="status" defaultValue={item.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
                        <option value="open">Aberta</option>
                        <option value="reviewing">Em análise</option>
                        <option value="resolved">Resolvida</option>
                        <option value="archived">Arquivada</option>
                      </select>
                      <Button type="submit" variant="outline" size="sm">Salvar</Button>
                    </form>
                    {access.isAdmin ? (
                      <form action={deleteIncidentAction}>
                        <input type="hidden" name="condominium_id" value={condoId} />
                        <input type="hidden" name="incident_id" value={item.id} />
                        <Button type="submit" variant="destructive" size="icon" aria-label="Excluir ocorrência">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="Nenhuma ocorrência" description="Registros internos de segurança e administração aparecem aqui." />
      )}
    </div>
  );
}
