import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    status?: string;
    priority?: string;
    assigned?: string;
  }>;
};

const financeCategories = new Set(["cobranca", "cancelamento", "reembolso"]);
const securityCategories = new Set(["seguranca", "privacidade_lgpd"]);

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function metadataOf(value: unknown) {
  return (value ?? {}) as Record<string, unknown>;
}

function slaTone(createdAt: string, priority: string, status: string) {
  if (status === "closed" || status === "resolved") return "resolvido";
  const ageHours = (new Date().getTime() - new Date(createdAt).getTime()) / 36e5;
  if (priority === "urgent" && ageHours > 4) return "atenção alta";
  if (priority === "high" && ageHours > 24) return "atenção";
  if (ageHours > 72) return "acompanhar";
  return "normal";
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
    "platform_readonly",
  ]);
  const params = (await searchParams) ?? {};
  const supabase = createAdminSupabase();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(`
      id,category,subject,message,status,priority,metadata,assigned_to,created_at,updated_at,
      condominiums(name,slug),
      profiles(full_name,email)
    `)
    .order("updated_at", { ascending: false })
    .limit(200);

  const assignedIds = Array.from(new Set((tickets ?? []).map((ticket) => ticket.assigned_to).filter(Boolean))) as string[];
  const { data: assignedProfiles } = assignedIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", assignedIds)
    : { data: [] };
  const assignedById = new Map((assignedProfiles ?? []).map((profile) => [profile.id, profile]));

  let rows = tickets ?? [];
  if (session.role === "platform_finance") rows = rows.filter((ticket) => financeCategories.has(ticket.category));
  if (session.role === "platform_security") rows = rows.filter((ticket) => securityCategories.has(ticket.category));
  if (session.role === "platform_readonly") rows = rows.filter((ticket) => !securityCategories.has(ticket.category));

  if (params.q) {
    const needle = params.q.toLowerCase();
    rows = rows.filter((ticket) => {
      const condo = joined(ticket.condominiums);
      const profile = joined(ticket.profiles);
      return (
        ticket.subject.toLowerCase().includes(needle) ||
        ticket.message.toLowerCase().includes(needle) ||
        condo?.name?.toLowerCase().includes(needle) ||
        profile?.email?.toLowerCase().includes(needle)
      );
    });
  }
  if (params.category && params.category !== "all") rows = rows.filter((ticket) => ticket.category === params.category);
  if (params.status && params.status !== "all") rows = rows.filter((ticket) => ticket.status === params.status);
  if (params.priority && params.priority !== "all") rows = rows.filter((ticket) => ticket.priority === params.priority);
  if (params.assigned === "mine") rows = rows.filter((ticket) => ticket.assigned_to === session.userId);
  if (params.assigned === "unassigned") rows = rows.filter((ticket) => !ticket.assigned_to);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Suporte</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inbox interno de chamados. Sem e-mail integrado: respostas ficam salvas como nota interna.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Abertos" value={rows.filter((r) => r.status === "open").length} />
        <AdminMetricCard label="Em andamento" value={rows.filter((r) => r.status === "in_progress").length} />
        <AdminMetricCard label="Aguardando cliente" value={rows.filter((r) => r.status === "waiting_customer").length} />
        <AdminMetricCard label="Urgentes" value={rows.filter((r) => r.priority === "urgent").length} />
      </div>

      <Card className="p-5">
        <form className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]" action="/admin/suporte">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input name="q" defaultValue={params.q ?? ""} className="pl-9" placeholder="Buscar assunto, mensagem, condomínio ou e-mail" />
          </div>
          <select name="category" defaultValue={params.category ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todas categorias</option>
            <option value="duvida">Dúvida</option>
            <option value="cobranca">Cobrança</option>
            <option value="cancelamento">Cancelamento</option>
            <option value="reembolso">Reembolso</option>
            <option value="problema_tecnico">Problema técnico</option>
            <option value="privacidade_lgpd">Privacidade/LGPD</option>
            <option value="seguranca">Segurança</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="outro">Outro</option>
          </select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todos status</option>
            <option value="open">Aberto</option>
            <option value="waiting_customer">Aguardando cliente</option>
            <option value="in_progress">Em andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <select name="priority" defaultValue={params.priority ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todas prioridades</option>
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          <select name="assigned" defaultValue={params.assigned ?? "all"} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="all">Todos responsáveis</option>
            <option value="mine">Meus</option>
            <option value="unassigned">Sem responsável</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {rows.map((ticket) => {
          const condo = joined(ticket.condominiums);
          const profile = joined(ticket.profiles);
          const assigned = assignedById.get(ticket.assigned_to ?? "");
          const metadata = metadataOf(ticket.metadata);
          return (
            <Link key={ticket.id} href={`/admin/suporte/${ticket.id}`} className="block">
              <Card className="p-5 transition hover:border-primary/50 hover:shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{ticket.subject}</h2>
                      <AdminStatus value={ticket.status} />
                      <AdminStatus value={ticket.priority} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ticket.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {ticket.category} · {condo?.name ?? "Sem condomínio"} · {profile?.full_name ?? maskEmail(profile?.email ?? String(metadata.email ?? ""))}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm lg:min-w-64">
                    <p className="text-muted-foreground">
                      Aberto: {new Date(ticket.created_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-muted-foreground">
                      Atualizado: {new Date(ticket.updated_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-muted-foreground">
                      Responsável: {assigned?.full_name ?? maskEmail(assigned?.email)}
                    </p>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      SLA visual: {slaTone(ticket.created_at, ticket.priority, ticket.status)}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
