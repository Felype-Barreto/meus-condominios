import { CommonAreaForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { CalendarDays, Warehouse } from "lucide-react";
import Link from "next/link";

export default async function CommonAreasPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: areas, error } = await supabase
    .from("common_areas")
    .select("id,name,description,capacity,requires_approval,active,created_at")
    .eq("condominium_id", condoId)
    .order("created_at", { ascending: false })
    .limit(getEconomyPageSize(120));

  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Estrutura</p>
        <h1 className="mt-2 text-3xl font-semibold">Áreas comuns</h1>
      </div>
      <CommonAreaForm condoId={condoId} />
      {areas?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {areas.map((area) => (
            <Card key={area.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{area.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                </div>
                <StatusBadge tone={area.active ? "success" : "neutral"}>{area.active ? "Ativa" : "Inativa"}</StatusBadge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Capacidade: {area.capacity ?? "não informada"}</p>
              <p className="text-sm text-muted-foreground">Aprovação: {area.requires_approval ? "sim" : "não"}</p>
              <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
                <Link href={`/app/${condoId}/areas-comuns/${area.id}/agenda`}>
                  <CalendarDays className="h-4 w-4" />
                  Abrir agenda
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Warehouse} title="Nenhuma área comum" description="Cadastre os espaços reserváveis do condomínio." />
      )}
    </div>
  );
}
