import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateAbuseReportStatusAction } from "./actions";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em analise",
  action_required: "Precisa de acao",
  resolved: "Resolvida",
  rejected: "Rejeitada",
  escalated: "Escalada",
};

function statusTone(status?: string | null) {
  if (status === "resolved") return "success" as const;
  if (status === "rejected") return "neutral" as const;
  return "warning" as const;
}

export default async function AbuseReportsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: reports } = await supabase
    .from("abuse_reports")
    .select("id, reason, description, status, entity_type, entity_id, created_at")
    .eq("condominium_id", condoId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Seguranca</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Denuncias de abuso</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Area restrita para analisar denuncias sem expor o denunciante para outros moradores.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <p className="text-sm leading-6 text-amber-950">
            Trate denuncias com discricao. Evite copiar dados pessoais para grupos e registre acoes relevantes,
            como bloqueio de usuario ou remocao de conteudo, na auditoria do condominio.
          </p>
        </div>
      </Card>

      <div className="grid gap-4">
        {(reports ?? []).length ? (
          reports?.map((report) => (
            <Card key={report.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{report.reason}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {report.entity_type ? `Origem: ${report.entity_type}` : "Origem nao informada"} -{" "}
                    {new Date(report.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <StatusBadge tone={statusTone(report.status)}>
                  {statusLabels[report.status ?? ""] ?? report.status}
                </StatusBadge>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {[
                  ["reviewing", "Marcar em analise"],
                  ["resolved", "Resolver"],
                  ["rejected", "Rejeitar"],
                ].map(([status, label]) => (
                  <form key={status} action={updateAbuseReportStatusAction}>
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="report_id" value={report.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button type="submit" variant="outline" className="w-full sm:w-auto">
                      {label}
                    </Button>
                  </form>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-center">
            <h2 className="text-lg font-semibold">Nenhuma denuncia registrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">Quando uma denuncia chegar, ela aparecera aqui.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
