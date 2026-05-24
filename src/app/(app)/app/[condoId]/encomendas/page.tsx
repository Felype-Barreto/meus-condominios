import { PackageForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { Package } from "lucide-react";

type PackageRow = {
  id: string;
  recipient_name: string | null;
  description: string | null;
  status: string;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

export default async function PackagesPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: packages }, { data: apartments }] = await Promise.all([
    supabase.from("packages").select("id,recipient_name,description,status,created_at,apartments(number,blocks(name))").eq("condominium_id", condoId).order("created_at", { ascending: false }).limit(getEconomyPageSize(60)),
    supabase.from("apartments").select("id,number,blocks(name)").eq("condominium_id", condoId).order("number").limit(getEconomyPageSize(300)),
  ]);
  const packageRows = (packages ?? []) as unknown as PackageRow[];
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Portaria</p><h1 className="mt-2 text-3xl font-semibold">Encomendas</h1></div>
      <PackageForm condoId={condoId} apartments={(apartments ?? []) as never} />
      {packageRows.length ? <div className="grid gap-4 md:grid-cols-2">{packageRows.map((item) => (
        <Card key={item.id} className="p-5">
          <StatusBadge tone={item.status === "waiting" ? "warning" : "success"}>{item.status}</StatusBadge>
          <h2 className="mt-3 font-semibold">{item.recipient_name ?? "Destinatário não informado"}</h2>
          <p className="text-sm text-muted-foreground">{item.apartments?.blocks?.name} - {item.apartments?.number}</p>
          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
        </Card>
      ))}</div> : <EmptyState icon={Package} title="Nenhuma encomenda" description="Registre encomendas e acompanhe retiradas." />}
    </div>
  );
}
