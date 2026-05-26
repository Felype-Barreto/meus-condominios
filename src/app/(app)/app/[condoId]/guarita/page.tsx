import { LockKeyhole } from "lucide-react";
import { GatePanel } from "@/components/app/gate-panel";
import { Card } from "@/components/ui/card";
import { canInviteDoorman } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GatehousePage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { data: condo },
    { data: canViewPanel },
    { data: canManageRoles },
    { data: apartments },
    { data: waitingPackages },
    { data: visitors },
    { data: announcements },
    { data: todayBookings },
    doormanLimit,
  ] = await Promise.all([
    supabase.from("condominiums").select("id,name").eq("id", condoId).single(),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "gate.view_panel",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "settings.roles",
    }),
    supabase
      .from("apartments")
      .select("id,number,blocks(name)")
      .eq("condominium_id", condoId)
      .order("number", { ascending: true })
      .limit(120),
    supabase
      .from("packages")
      .select("id,apartment_id,recipient_name,description,created_at,apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("visitor_contact_requests")
      .select("id,apartment_id,visitor_name,visitor_phone,message,status,created_at,apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("announcements")
      .select("id,title,body,urgent,created_at")
      .eq("condominium_id", condoId)
      .or("target_type.eq.all,target_type.eq.gate")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select("id,apartment_id,title,start_at,end_at,status,common_areas(name)")
      .eq("condominium_id", condoId)
      .gte("start_at", todayStart.toISOString())
      .lte("start_at", todayEnd.toISOString())
      .in("status", ["pending", "approved"])
      .order("start_at", { ascending: true })
      .limit(60),
    canInviteDoorman(condoId),
  ]);

  if (!canViewPanel) {
    return (
      <Card className="p-6">
        <LockKeyhole className="h-8 w-8 text-warning" />
        <h1 className="mt-5 text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu papel ainda não tem permissão para acessar o painel da
          Guarita/Cancela.
        </p>
      </Card>
    );
  }

  return (
    <GatePanel
      condoId={condoId}
      condoName={condo?.name ?? "Condomínio"}
      apartments={(apartments ?? []) as never}
      waitingPackages={(waitingPackages ?? []) as never}
      recentVisitors={(visitors ?? []) as never}
      announcements={(announcements ?? []) as never}
      canInviteDoorman={canManageRoles === true && doormanLimit.allowed}
      todayBookings={(todayBookings ?? []) as never}
    />
  );
}
