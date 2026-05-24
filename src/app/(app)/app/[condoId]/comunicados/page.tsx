import { AnnouncementForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { markAnnouncementReadAction } from "@/lib/actions/core-modules";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { Megaphone } from "lucide-react";

export default async function AnnouncementsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: announcements }, { data: canViewReads }, { data: apartments }] = await Promise.all([
    supabase.from("announcements").select("id,title,body,target_type,urgent,pinned,created_at,announcement_reads(user_id,read_at)").eq("condominium_id", condoId).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(getEconomyPageSize(60)),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.view_reads" }),
    supabase.from("apartments").select("id,number,blocks(name)").eq("condominium_id", condoId).order("number").limit(getEconomyPageSize(300)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Comunicação</p>
        <h1 className="mt-2 text-3xl font-semibold">Avisos</h1>
      </div>
      <AnnouncementForm condoId={condoId} apartments={(apartments ?? []) as never} />
      {announcements?.length ? (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap gap-2">
                {item.urgent ? <StatusBadge tone="warning">Urgente</StatusBadge> : null}
                {item.pinned ? <StatusBadge>Fixado</StatusBadge> : null}
                <StatusBadge>{item.target_type}</StatusBadge>
              </div>
              <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <form action={markAnnouncementReadAction}>
                  <input type="hidden" name="condominium_id" value={condoId} />
                  <input type="hidden" name="announcement_id" value={item.id} />
                  <Button size="sm" variant="outline">Marcar como lido</Button>
                </form>
                {canViewReads ? <span className="text-sm text-muted-foreground">Leituras: {item.announcement_reads?.length ?? 0}</span> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Megaphone} title="Nenhum aviso" description="Publique avisos oficiais para o condomínio." />
      )}
    </div>
  );
}
