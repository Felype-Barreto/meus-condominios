import Link from "next/link";
import { AlertTriangle, FileDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateSecurityIncidentAction } from "./actions";

type SecurityIncidentRow = {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  affected_data: Record<string, unknown> | null;
  actions_taken: Array<Record<string, unknown>> | null;
  created_at: string;
  resolved_at: string | null;
};

const incidentTypeLabels: Record<string, string> = {
  suspected_data_leak: "Suspeita de vazamento",
  unauthorized_access: "Acesso indevido",
  abusive_use: "Uso abusivo",
  whatsapp_spam: "WhatsApp/spam",
  qr_abuse: "Abuso no QR publico",
  payment_issue: "Pagamento",
  account_takeover: "Conta possivelmente invadida",
  other: "Outro",
};

const severityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  triaging: "Triagem",
  investigating: "Investigando",
  contained: "Contido",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

function statusTone(status: string) {
  if (status === "resolved") return "success" as const;
  if (status === "dismissed") return "neutral" as const;
  if (status === "contained") return "warning" as const;
  return "error" as const;
}

function redactAffectedData(data: Record<string, unknown> | null) {
  if (!data) return "Sem detalhes adicionais.";
  const hint = typeof data.affected_data_hint === "string" ? data.affected_data_hint : null;
  const source = typeof data.source === "string" ? data.source : null;
  const evidence = typeof data.evidence_url === "string" ? "anexo informado" : null;
  return [hint, evidence, source].filter(Boolean).join(" | ") || "Sem detalhes adicionais.";
}

export default async function SecurityIncidentsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: incidents }, { data: planData }] =
    await Promise.all([
      supabase.from("condominiums").select("name, plan").eq("id", condoId).single(),
      supabase
        .from("security_incidents")
        .select(
          "id,incident_type,severity,title,description,status,affected_data,actions_taken,created_at,resolved_at",
        )
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("condominiums").select("plan").eq("id", condoId).single(),
    ]);

  const rows = (incidents ?? []) as SecurityIncidentRow[];
  const canExport = ["pro", "total"].includes(String(planData?.plan ?? condo?.plan));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Seguranca</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Incidentes de seguranca
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Triagem de relatos sobre vazamento, acesso indevido, abuso, QR
            publico, WhatsApp e outros riscos. Trate tudo com discricao e
            registre as acoes tomadas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/seguranca/reportar">Reportar incidente</Link>
          </Button>
          {canExport ? (
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/seguranca/incidentes/export`}>
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <p className="text-sm leading-6 text-amber-950">
            Nao copie dados pessoais para grupos. Se houver risco real, limite
            acessos, preserve logs e documente cada acao antes de encerrar o
            incidente.
          </p>
        </div>
      </Card>

      <div className="grid gap-4">
        {rows.length ? (
          rows.map((incident) => (
            <Card key={incident.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <StatusBadge tone={statusTone(incident.status)}>
                      {statusLabels[incident.status] ?? incident.status}
                    </StatusBadge>
                    <StatusBadge>
                      {severityLabels[incident.severity] ?? incident.severity}
                    </StatusBadge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{incident.title}</h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {incidentTypeLabels[incident.incident_type] ?? incident.incident_type}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {incident.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Dados afetados: {redactAffectedData(incident.affected_data)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Criado em {new Date(incident.created_at).toLocaleString("pt-BR")}
                    {incident.resolved_at
                      ? ` | Resolvido em ${new Date(incident.resolved_at).toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Acoes registradas</h3>
                {incident.actions_taken?.length ? (
                  <div className="mt-3 space-y-2">
                    {incident.actions_taken.slice(-3).map((action, index) => (
                      <p key={index} className="text-sm leading-6 text-muted-foreground">
                        {String(action.note ?? "Acao registrada.")}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma acao registrada ainda.
                  </p>
                )}
              </div>

              <form
                action={updateSecurityIncidentAction}
                className="mt-5 grid gap-3 md:grid-cols-4"
              >
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="incident_id" value={incident.id} />
                <select
                  name="status"
                  defaultValue={incident.status}
                  className="h-11 rounded-lg border bg-card px-3 text-sm"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  name="severity"
                  defaultValue={incident.severity}
                  className="h-11 rounded-lg border bg-card px-3 text-sm"
                >
                  {Object.entries(severityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="action_note"
                  className="h-11 rounded-lg border bg-card px-3 text-sm md:col-span-1"
                  placeholder="Acao tomada"
                />
                <Button type="submit">Salvar resposta</Button>
              </form>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-center">
            <h2 className="text-lg font-semibold">Nenhum incidente registrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando alguem reportar uma suspeita de seguranca, ela aparecera
              aqui para triagem.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
