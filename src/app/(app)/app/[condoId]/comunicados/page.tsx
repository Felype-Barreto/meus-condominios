import { AnnouncementManager, type AnnouncementItem } from "@/components/app/announcement-manager";
import { EmptyState } from "@/components/common/empty-state";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Megaphone } from "lucide-react";

export default async function AnnouncementsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  const [
    { data: announcements },
    { data: canViewReads },
    { data: canCreate },
    { data: canEdit },
    { data: canDelete },
    { data: apartments },
  ] = await Promise.all([
    supabase
      .from("announcements")
      .select("id,title,body,target_type,target_ids,urgent,pinned,created_at,updated_at,starts_at,expires_at,announcement_reads(user_id,read_at)")
      .eq("condominium_id", condoId)
      .order("pinned", { ascending: false })
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(getEconomyPageSize(60)),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.view_reads" }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.create" }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.edit" }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.delete" }),
    supabase
      .from("apartments")
      .select("id,number,blocks(name)")
      .eq("condominium_id", condoId)
      .order("number")
      .limit(getEconomyPageSize(300)),
  ]);

  const nowIso = new Date().toISOString();
  const canCreateAnnouncement = !access.isResident && (access.isAdmin || access.isSyndic || Boolean(canCreate));
  const canEditAnnouncement = !access.isResident && (access.isAdmin || access.isSyndic || Boolean(canEdit));
  const canDeleteAnnouncement = !access.isResident && (access.isAdmin || Boolean(canDelete));
  const visibleAnnouncements = (announcements ?? []).filter((item) => {
    if (canCreateAnnouncement || canEditAnnouncement || canDeleteAnnouncement) return true;
    const startsAt = item.starts_at ?? item.created_at;
    return startsAt <= nowIso && (!item.expires_at || item.expires_at >= nowIso);
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Comunicação</p>
        <h1 className="mt-2 text-3xl font-semibold">Avisos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Publique comunicados oficiais, defina por quanto tempo ficam visíveis e mantenha histórico editável para a administração.
        </p>
      </div>
      {visibleAnnouncements.length || canCreateAnnouncement ? (
        <AnnouncementManager
          condoId={condoId}
          announcements={visibleAnnouncements as AnnouncementItem[]}
          apartments={(apartments ?? []) as never}
          canCreate={canCreateAnnouncement}
          canEdit={canEditAnnouncement}
          canDelete={canDeleteAnnouncement}
          canViewReads={Boolean(canViewReads)}
        />
      ) : (
        <EmptyState icon={Megaphone} title="Nenhum aviso" description="Quando a administração publicar avisos, eles aparecem aqui." />
      )}
    </div>
  );
}
