import { PackageForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { Package } from "lucide-react";

type PackageRow = {
  id: string;
  recipient_name: string | null;
  description: string | null;
  status: string;
  created_at: string;
  picked_up_at?: string | null;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

export default async function PackagesPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  const canRegister = access.isAdmin || access.isSyndic || access.isDoorman;
  const packageQuery = supabase
    .from("packages")
    .select("id,recipient_name,description,status,created_at,picked_up_at,apartments(number,blocks(name))")
    .eq("condominium_id", condoId)
    .order("created_at", { ascending: false })
    .limit(getEconomyPageSize(60));
  if (access.isResident) {
    if (access.apartmentId) packageQuery.eq("apartment_id", access.apartmentId);
    else packageQuery.eq("apartment_id", "00000000-0000-0000-0000-000000000000");
  }
  const [{ data: packages }, { data: apartments }] = await Promise.all([
    packageQuery,
    supabase.from("apartments").select("id,number,blocks(name)").eq("condominium_id", condoId).order("number").limit(getEconomyPageSize(300)),
  ]);
  const packageRows = (packages ?? []) as unknown as PackageRow[];
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Portaria</p><h1 className="mt-2 text-3xl font-semibold">Encomendas</h1></div>
      {canRegister ? <PackageForm condoId={condoId} apartments={(apartments ?? []) as never} /> : null}
      {packageRows.length ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Destinatário</th>
                  <th className="px-4 py-3">Bloco</th>
                  <th className="px-4 py-3">Apartamento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Publicação</th>
                  <th className="px-4 py-3">Retirada</th>
                </tr>
              </thead>
              <tbody>
                {packageRows.map((item) => (
                  <tr key={item.id} className={item.status === "waiting" ? "border-b bg-green-500/5" : "border-b"}>
                    <td className="px-4 py-3 font-medium">{item.recipient_name ?? "Destinatário não informado"}</td>
                    <td className="px-4 py-3">{item.apartments?.blocks?.name ?? "-"}</td>
                    <td className="px-4 py-3">{item.apartments?.number ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={item.status === "waiting" ? "success" : "neutral"}>
                        {item.status === "waiting" ? "Ativo" : "Coletado"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">{item.picked_up_at ? new Date(item.picked_up_at).toLocaleDateString("pt-BR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : <EmptyState icon={Package} title="Nenhuma encomenda" description={access.isResident ? "Quando a portaria registrar uma encomenda para seu apartamento, ela aparecerá aqui." : "Registre encomendas e acompanhe retiradas."} />}
    </div>
  );
}
