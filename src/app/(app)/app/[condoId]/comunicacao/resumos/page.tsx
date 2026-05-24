import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, ClipboardList, Send, ShieldCheck } from "lucide-react";
import { CommunicationNav } from "@/components/app/communication-nav";
import { CommunicationReportActions } from "@/components/app/communication-report-actions";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateCommunicationSummaryAction,
  scheduleCommunicationSummaryAction,
  sendCommunicationSummaryAction,
} from "../actions";

type SummaryRow = {
  id: string;
  summary_type: string;
  period_start: string;
  period_end: string;
  title: string;
  body: string;
  safe_group_body: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
};

type ChannelRow = {
  id: string;
  name: string;
  type: string;
  scope: string;
  status: string;
};

type Capabilities = {
  plan?: string;
  weekly_manual?: boolean;
  weekly_automatic?: boolean;
  daily_automatic?: boolean;
  group_summary?: boolean;
  block_summary?: boolean;
  whatsapp_private?: boolean;
};

const summaryTypes = [
  { value: "weekly", label: "Resumo semanal", helper: "Ideal para reduzir mensagens pequenas." },
  { value: "daily", label: "Resumo diário", helper: "Automático no Total." },
  { value: "packages", label: "Resumo de encomendas", helper: "Mostra quantidade aguardando retirada." },
  { value: "agenda", label: "Resumo de agenda", helper: "Reservas e próximos usos em formato geral." },
  { value: "maintenance", label: "Resumo de manutenção", helper: "Manutenções previstas e avisadas." },
  { value: "admin", label: "Resumo administrativo", helper: "Visão para síndico e administração." },
];

function typeLabel(type: string) {
  return summaryTypes.find((item) => item.value === type)?.label ?? type;
}

function statusTone(status: string) {
  if (status === "sent") return "success";
  if (status === "scheduled") return "warning";
  return "neutral";
}

function dateLabel(value: string) {
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

export default async function CommunicationSummariesPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const defaultStart = format(subDays(today, 6), "yyyy-MM-dd");
  const defaultEnd = format(today, "yyyy-MM-dd");
  const [{ data: condo }, { data: summaries }, { data: channels }, { data: capabilities }] =
    await Promise.all([
      supabase.from("condominiums").select("name, plan").eq("id", condoId).single(),
      supabase
        .from("communication_summaries")
        .select("id, summary_type, period_start, period_end, title, body, safe_group_body, status, scheduled_for, sent_at, created_at")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("communication_channels")
        .select("id, name, type, scope, status")
        .eq("condominium_id", condoId)
        .neq("status", "inactive")
        .order("created_at", { ascending: false }),
      supabase.rpc("get_summary_plan_capabilities", { condo_id: condoId }),
    ]);

  const rows = (summaries ?? []) as SummaryRow[];
  const channelRows = (channels ?? []) as ChannelRow[];
  const caps = (capabilities ?? {}) as Capabilities;
  const latest = rows[0];
  const plan = String(caps.plan ?? condo?.plan ?? "free");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Resumos automáticos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Transforme vários avisos pequenos em um resumo claro, seguro e pronto para app,
            WhatsApp privado ou grupos quando o plano permitir.
          </p>
        </div>
        <StatusBadge tone={plan === "free" ? "warning" : "success"}>Plano {plan}</StatusBadge>
      </div>

      <CommunicationNav condoId={condoId} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <ClipboardList className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Manual copiável</p>
          <strong className="mt-1 block text-xl">Todos os planos</strong>
        </Card>
        <Card className="p-5">
          <CalendarClock className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Semanal automático</p>
          <strong className="mt-1 block text-xl">{caps.weekly_automatic ? "Disponível" : "Pro/Total"}</strong>
        </Card>
        <Card className="p-5">
          <Send className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Diário automático</p>
          <strong className="mt-1 block text-xl">{caps.daily_automatic ? "Disponível" : "Total"}</strong>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Seguro para grupo</p>
          <strong className="mt-1 block text-xl">{caps.group_summary ? "Liberado" : "Manual/privado"}</strong>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Gerar resumo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O Meus Condomínios monta um texto sem nomes, telefones, visitantes ou reclamações individuais.
          </p>
          <form action={generateCommunicationSummaryAction} className="mt-4 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <label className="block text-sm font-medium">
              Tipo
              <select name="summary_type" className="mt-1 h-11 w-full rounded-lg border bg-card px-3 text-sm">
                {summaryTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Início
                <input name="period_start" type="date" defaultValue={defaultStart} className="mt-1 h-11 w-full rounded-lg border bg-card px-3 text-sm" />
              </label>
              <label className="block text-sm font-medium">
                Fim
                <input name="period_end" type="date" defaultValue={defaultEnd} className="mt-1 h-11 w-full rounded-lg border bg-card px-3 text-sm" />
              </label>
            </div>
            <Button className="w-full min-h-11" type="submit">
              Gerar prévia
            </Button>
          </form>

          <div className="mt-6 border-t pt-5">
            <h3 className="font-semibold">Configurar frequência</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O agendamento cria o próximo resumo automático conforme o plano.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <form action={scheduleCommunicationSummaryAction}>
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="summary_type" value="weekly" />
                <Button className="w-full" variant="outline" type="submit" disabled={!caps.weekly_automatic}>
                  Agendar semanal
                </Button>
              </form>
              <form action={scheduleCommunicationSummaryAction}>
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="summary_type" value="daily" />
                <Button className="w-full" variant="outline" type="submit" disabled={!caps.daily_automatic}>
                  Agendar diário
                </Button>
              </form>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pré-visualização</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a versão segura para grupos quando houver canal coletivo.
              </p>
            </div>
            {latest ? <StatusBadge tone={statusTone(latest.status)}>{latest.status}</StatusBadge> : null}
          </div>

          {latest ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm font-semibold text-primary">{typeLabel(latest.summary_type)}</p>
                <h3 className="mt-2 text-xl font-semibold">{latest.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dateLabel(latest.period_start)} a {dateLabel(latest.period_end)}
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-6">{latest.body}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                <p className="font-semibold">Versão segura para grupos</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6">
                  {latest.safe_group_body ?? latest.body}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CommunicationReportActions title={latest.title} body={latest.body} />
              </div>
              <form action={sendCommunicationSummaryAction} className="rounded-lg border bg-background p-4">
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="summary_id" value={latest.id} />
                <h3 className="font-semibold">Escolher canais</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {channelRows.map((channel) => (
                    <label key={channel.id} className="flex min-h-12 items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                      <input name="channel_ids" value={channel.id} type="checkbox" className="mt-1 accent-[#7C5C3E]" />
                      <span>
                        <strong className="block">{channel.name}</strong>
                        <span className="text-muted-foreground">{channel.type} · {channel.scope}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <Button className="mt-4 w-full min-h-11" type="submit" disabled={!channelRows.length || latest.status === "sent"}>
                  Enviar resumo agora
                </Button>
              </form>
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum resumo gerado"
              description="Gere uma prévia para copiar, compartilhar, enviar ou agendar."
            />
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Histórico de resumos</h2>
        <div className="mt-4 space-y-3">
          {rows.length ? (
            rows.map((summary) => (
              <div key={summary.id} className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge>{typeLabel(summary.summary_type)}</StatusBadge>
                      <StatusBadge tone={statusTone(summary.status)}>{summary.status}</StatusBadge>
                    </div>
                    <p className="mt-3 font-semibold">{summary.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dateLabel(summary.period_start)} a {dateLabel(summary.period_end)}
                      {summary.scheduled_for ? ` · agendado para ${format(new Date(summary.scheduled_for), "dd/MM HH:mm")}` : ""}
                    </p>
                  </div>
                  <CommunicationReportActions title={summary.title} body={summary.body} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Os resumos gerados aparecerão aqui.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
