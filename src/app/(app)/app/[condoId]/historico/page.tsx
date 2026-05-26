import { CalendarDays, History, LockKeyhole } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HistoryItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  status: string;
  created_at: string;
  apartment?: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function apartmentLabel(row: {
  apartments?: { number?: string | null; blocks?: { name?: string | null } | null } | null;
}) {
  if (!row.apartments?.number) return undefined;
  return `${row.apartments.blocks?.name ?? "Bloco"} - ${row.apartments.number}`;
}

export default async function CondominiumHistoryPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 90);

  const { data: condo } = await supabase
    .from("condominiums")
    .select("name,plan")
    .eq("id", condoId)
    .single();

  if ((condo?.plan ?? "free") === "free") {
    return (
      <Card className="p-6">
        <LockKeyhole className="h-8 w-8 text-warning" />
        <h1 className="mt-5 text-2xl font-semibold">Histórico bloqueado no plano grátis</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          O histórico do condomínio guarda registros operacionais por até 3 meses, como portaria,
          visitantes, encomendas, ocorrências e reservas. Faça upgrade para Premium para liberar.
        </p>
      </Card>
    );
  }

  const [
    { data: packages },
    { data: visitors },
    { data: incidents },
    { data: bookings },
    { data: audits },
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("id,recipient_name,description,status,picked_up_by,picked_up_at,created_at,apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("visitor_contact_requests")
      .select("id,visitor_name,message,status,created_at,apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("incidents")
      .select("id,title,description,status,severity,created_at,apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("bookings")
      .select("id,title,start_at,end_at,status,created_at,common_areas(name),apartments(number,blocks(name))")
      .eq("condominium_id", condoId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,created_at")
      .eq("condominium_id", condoId)
      .gte("created_at", historyStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const items: HistoryItem[] = [
    ...((packages ?? []) as Array<{
      id: string;
      recipient_name: string | null;
      description: string | null;
      status: string;
      picked_up_by: string | null;
      picked_up_at: string | null;
      created_at: string;
      apartments?: { number?: string | null; blocks?: { name?: string | null } | null } | null;
    }>).map((item) => ({
      id: `package-${item.id}`,
      type: "Encomenda",
      title: item.recipient_name ?? "Encomenda registrada",
      detail: item.picked_up_at
        ? `Retirada por ${item.picked_up_by ?? "não informado"}`
        : item.description ?? "Aguardando retirada",
      status: item.status,
      created_at: item.created_at,
      apartment: apartmentLabel(item),
    })),
    ...((visitors ?? []) as Array<{
      id: string;
      visitor_name: string | null;
      message: string | null;
      status: string;
      created_at: string;
      apartments?: { number?: string | null; blocks?: { name?: string | null } | null } | null;
    }>).map((item) => ({
      id: `visitor-${item.id}`,
      type: "Visitante",
      title: item.visitor_name ?? "Visitante registrado",
      detail: item.message ?? "Solicitação de contato registrada",
      status: item.status,
      created_at: item.created_at,
      apartment: apartmentLabel(item),
    })),
    ...((incidents ?? []) as Array<{
      id: string;
      title: string | null;
      description: string | null;
      status: string;
      severity: string;
      created_at: string;
      apartments?: { number?: string | null; blocks?: { name?: string | null } | null } | null;
    }>).map((item) => ({
      id: `incident-${item.id}`,
      type: "Ocorrência",
      title: item.title ?? "Ocorrência registrada",
      detail: item.description ?? item.severity,
      status: item.status,
      created_at: item.created_at,
      apartment: apartmentLabel(item),
    })),
    ...((bookings ?? []) as Array<{
      id: string;
      title: string | null;
      status: string;
      start_at: string | null;
      created_at: string;
      common_areas?: { name?: string | null } | null;
      apartments?: { number?: string | null; blocks?: { name?: string | null } | null } | null;
    }>).map((item) => ({
      id: `booking-${item.id}`,
      type: "Agendamento",
      title: item.common_areas?.name ?? item.title ?? "Reserva registrada",
      detail: item.start_at ? `Reservado para ${formatDate(item.start_at)}` : "Reserva registrada",
      status: item.status,
      created_at: item.created_at,
      apartment: apartmentLabel(item),
    })),
    ...((audits ?? []) as Array<{
      id: string;
      action: string;
      entity_type: string;
      created_at: string;
    }>).map((item) => ({
      id: `audit-${item.id}`,
      type: "Sistema",
      title: item.action.replaceAll("_", " "),
      detail: item.entity_type,
      status: "registrado",
      created_at: item.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name ?? "Condomínio"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Histórico do condomínio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Registros operacionais dos últimos 3 meses, reunindo portaria, visitantes,
          encomendas, ocorrências, reservas e ações importantes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <History className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Eventos listados</p>
          <strong className="mt-1 block text-3xl">{items.length}</strong>
        </Card>
        <Card className="p-5">
          <CalendarDays className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Retenção exibida</p>
          <strong className="mt-1 block text-3xl">90 dias</strong>
        </Card>
        <Card className="p-5">
          <LockKeyhole className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Plano</p>
          <strong className="mt-1 block text-3xl capitalize">{condo?.plan ?? "free"}</strong>
        </Card>
      </div>

      <Card className="p-5">
        <div className="space-y-3">
          {items.length ? (
            items.slice(0, 180).map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">{item.type}</p>
                    <h2 className="mt-1 font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    {item.apartment ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.apartment}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge>{item.status}</StatusBadge>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Nenhum registro encontrado nos últimos 3 meses.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
