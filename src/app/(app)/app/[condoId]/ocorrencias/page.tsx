import { IncidentForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { Bell } from "lucide-react";

type IncidentRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
};

export default async function IncidentsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: incidents }, { data: apartments }] = await Promise.all([
    supabase.from("incidents").select("id,type,title,description,severity,status,created_at,apartments(number,blocks(name))").eq("condominium_id", condoId).order("created_at", { ascending: false }).limit(getEconomyPageSize(60)),
    supabase.from("apartments").select("id,number,blocks(name)").eq("condominium_id", condoId).order("number").limit(getEconomyPageSize(300)),
  ]);
  const incidentRows = (incidents ?? []) as unknown as IncidentRow[];
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Segurança</p><h1 className="mt-2 text-3xl font-semibold">Ocorrências</h1></div>
      <IncidentForm condoId={condoId} apartments={(apartments ?? []) as never} />
      {incidentRows.length ? <div className="space-y-4">{incidentRows.map((item) => (
        <Card key={item.id} className="p-5">
          <div className="flex flex-wrap gap-2"><StatusBadge>{item.type}</StatusBadge><StatusBadge tone={item.severity === "critical" ? "error" : item.severity === "high" ? "warning" : "neutral"}>{item.severity}</StatusBadge><StatusBadge>{item.status}</StatusBadge></div>
          <h2 className="mt-3 font-semibold">{item.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        </Card>
      ))}</div> : <EmptyState icon={Bell} title="Nenhuma ocorrência" description="Ocorrências são visíveis apenas para administração autorizada." />}
    </div>
  );
}
