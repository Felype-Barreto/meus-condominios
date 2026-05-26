import { Building2, CalendarDays, KeyRound, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/app/dashboard-card";
import { InstallMobileCard } from "@/components/app/install-mobile-card";
import {
  NotificationCenter,
  OnboardingChecklist,
  PriorityCards,
  QuickActions,
  ActivityTimeline,
} from "@/components/app/product-panels";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import { QRCodeCard } from "@/components/app/qr-code-card";
import { RoleBadge } from "@/components/common/role-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUsage } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canSendWhatsAppMessage } from "@/lib/whatsapp";

type UpcomingBooking = {
  id: string;
  title: string | null;
  start_at: string;
  status: string;
  common_areas?: { name: string | null } | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
};

async function countQuery<T>(query: PromiseLike<{ count: number | null; error: unknown; data: T | null }>) {
  const result = await query;
  if (result.error) return 0;
  return result.count ?? 0;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: syndic },
    { data: condo },
    { data: membership },
    { data: upcomingBookings },
    { data: notifications },
    { data: activity },
    usage,
    whatsUsage,
    residentsPending,
    bookingsPending,
    packagesWaiting,
    urgentTickets,
    unreadAnnouncements,
    activeResidents,
    resolvedTicketsMonth,
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("id")
      .eq("condominium_id", condoId)
      .eq("is_primary_syndic", true)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("condominiums")
      .select("name, public_code, plan")
      .eq("id", condoId)
      .single(),
    auth.user
      ? supabase
          .from("memberships")
          .select("role")
          .eq("condominium_id", condoId)
          .eq("user_id", auth.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("bookings")
      .select("id,title,start_at,status,common_areas(name)")
      .eq("condominium_id", condoId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(4),
    supabase
      .from("notifications")
      .select("id,title,body,href,created_at,read_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(6),
    getCurrentUsage(condoId).catch(() => ({
      blocks: 0,
      apartments: 0,
      admins: 0,
      syndics: 0,
      doormen: 0,
      common_areas: 0,
      bookings_month: 0,
      tickets_month: 0,
      announcements_month: 0,
      packages_month: 0,
      storage_mb: 0,
    })),
    canSendWhatsAppMessage(condoId).catch(() => ({
      remaining: 0,
      used: 0,
      limit: 0,
      percent: 0,
      warn: false,
      blocked: false,
      plan: "free",
      allowed: false,
      included: 0,
      extra: 0,
      manual_only: true,
    })),
    countQuery(supabase.from("memberships").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("status", "pending")),
    countQuery(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("status", "pending")),
    countQuery(supabase.from("packages").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("status", "waiting")),
    countQuery(supabase.from("tickets").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("priority", "urgent").neq("status", "closed")),
    countQuery(supabase.from("announcements").select("id", { count: "exact", head: true }).eq("condominium_id", condoId)),
    countQuery(supabase.from("memberships").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("status", "active").in("role", ["resident", "owner"])),
    countQuery(supabase.from("tickets").select("id", { count: "exact", head: true }).eq("condominium_id", condoId).eq("status", "closed").gte("updated_at", monthStart.toISOString())),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const upcoming = (upcomingBookings ?? []) as unknown as UpcomingBooking[];
  const role = membership?.role ?? "subscriber_admin";
  const onboardingCompleted = {
    apartments: usage.apartments > 0,
    syndic: Boolean(syndic),
    residents: activeResidents > 0,
    commonArea: usage.common_areas > 0,
    announcement: usage.announcements_month > 0 || unreadAnnouncements > 0,
    qr: Boolean(condo?.public_code),
    whatsapp: !whatsUsage.manual_only || whatsUsage.limit > 0,
    gate: usage.doormen > 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {condo?.name ?? "Condomínio"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Painel geral</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Abertura rápida para moradores, síndico e guarita acompanharem avisos,
            reservas, encomendas e pendências do dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RoleBadge role={role as never} />
          <StatusBadge tone="success">Dados protegidos</StatusBadge>
        </div>
      </div>

      {!syndic ? (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-warning">
                Este condomínio ainda não possui síndico definido.
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Defina você como síndico ou envie um convite para outra pessoa.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/sindico`}>Definir síndico agora</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <OnboardingChecklist condoId={condoId} completed={onboardingCompleted} />
      <InstallMobileCard />
      <QuickActions condoId={condoId} role={role} />

      <PriorityCards
        items={[
          { label: "Moradores pendentes", value: residentsPending, detail: "Cadastros aguardando aprovação.", tone: residentsPending ? "warning" : "success" },
          { label: "Reservas pendentes", value: bookingsPending, detail: "Pedidos de áreas comuns para avaliar.", tone: bookingsPending ? "warning" : "success" },
          { label: "Encomendas na portaria", value: packagesWaiting, detail: "Itens aguardando retirada.", tone: packagesWaiting ? "warning" : "success" },
          { label: "Solicitações urgentes", value: urgentTickets, detail: "Reclamações ou pedidos marcados como urgentes.", tone: urgentTickets ? "error" : "success" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Apartamentos" value={String(usage.apartments)} detail="Unidades cadastradas" icon={Building2} />
        <DashboardCard title="Moradores ativos" value={String(activeResidents)} detail="Moradores e proprietários aprovados" icon={Users} />
        <DashboardCard title="Reservas do mês" value={String(usage.bookings_month)} detail="Uso das áreas comuns" icon={CalendarDays} />
        <DashboardCard title="WhatsApp manual" value="Copiar" detail="Envio automático fica bloqueado até Pro/Total." icon={MessageCircle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Agenda próxima</h2>
          <div className="mt-5 space-y-3">
            {upcoming.length ? (
              upcoming.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/app/${condoId}/agendamentos`}
                  className="block rounded-lg border bg-background p-4 text-sm hover:bg-muted"
                >
                  <p className="font-semibold">{booking.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {booking.common_areas?.name} · {new Date(booking.start_at).toLocaleString("pt-BR")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                Nenhuma reserva futura.
              </p>
            )}
          </div>
        </Card>
        <NotificationCenter
          condoId={condoId}
          notifications={(notifications ?? []) as NotificationRow[]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <AdSenseSlot
          plan={condo?.plan ?? "free"}
          pathname={`/app/${condoId}/dashboard`}
          label="Publicidade"
        />
        <ActivityTimeline
          items={(activity ?? []) as ActivityRow[]}
          condoId={condoId}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Engajamento e resolução</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Avisos publicados</p>
              <strong className="mt-1 block text-2xl">{unreadAnnouncements}</strong>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Resolvidas no mês</p>
              <strong className="mt-1 block text-2xl">{resolvedTicketsMonth}</strong>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Plano</p>
              <strong className="mt-1 block text-2xl">{condo?.plan ?? "free"}</strong>
            </div>
          </div>
        </Card>
      </div>

      <AdSenseSlot
        plan={condo?.plan ?? "free"}
        pathname={`/app/${condoId}/dashboard`}
        label="Publicidade"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <QRCodeCard
          title="QR Code de cadastro e visitantes"
          value={`${appUrl}/visitante/${condo?.public_code ?? condoId}`}
        />
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Guarita/Cancela</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A portaria tem painel simples para buscar apartamento, registrar
            encomenda, visitante e ocorrência sem acessar dados desnecessários.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/app/${condoId}/guarita`}>Abrir painel</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
