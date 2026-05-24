import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, moneyFromCents } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminWhatsAppPage() {
  await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_finance",
    "platform_support",
    "platform_security",
    "platform_readonly",
  ]);
  const month = currentMonth();
  const supabase = createAdminSupabase();
  const [
    { data: accounts },
    { data: usage },
    { data: logs },
    { data: optIns },
    { data: addons },
    { data: groups },
    { data: safetyBlocks },
  ] = await Promise.all([
    supabase.from("whatsapp_accounts").select("id,condominium_id,status,provider,created_at,condominiums(id,name,plan,settings)").order("created_at", { ascending: false }).limit(80),
    supabase.from("whatsapp_usage").select("id,condominium_id,month,included_credits,used_credits,addon_credits,blocked_sends,condominiums(id,name,plan,settings)").eq("month", month).limit(1000),
    supabase.from("whatsapp_message_logs").select("id,condominium_id,status,target_type,message_type,error_message,created_at,condominiums(id,name,plan)").order("created_at", { ascending: false }).limit(80),
    supabase.from("whatsapp_opt_ins").select("id,condominium_id,opted_in,opted_out_at").limit(1000),
    supabase.from("communication_addons").select("id,condominium_id,addon_type,credits,price_cents,status,created_at,condominiums(id,name,plan)").eq("status", "active").limit(500),
    supabase.from("whatsapp_groups").select("id,condominium_id,status,enabled,created_at,condominiums(id,name,plan)").limit(500),
    supabase.from("audit_logs").select("id,condominium_id,action,created_at,condominiums(id,name,plan)").in("action", ["communication_safety_blocked", "communication_resend_unread_blocked"]).limit(200),
  ]);

  const used = (usage ?? []).reduce((sum, row) => sum + Number(row.used_credits ?? 0), 0);
  const included = (usage ?? []).reduce((sum, row) => sum + Number(row.included_credits ?? 0), 0);
  const addonCredits = (usage ?? []).reduce((sum, row) => sum + Number(row.addon_credits ?? 0), 0);
  const blockedByLimit = (usage ?? []).reduce((sum, row) => sum + Number(row.blocked_sends ?? 0), 0);
  const creditsSold = (addons ?? []).reduce((sum, row) => sum + Math.max(Number(row.credits ?? 0), 0), 0);
  const addonRevenue = (addons ?? []).reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0);
  const failedMessages = (logs ?? []).filter((log) => ["failed", "blocked", "opt_out", "no_consent"].includes(log.status ?? "")).length;
  const optOuts = (optIns ?? []).filter((row) => !row.opted_in || row.opted_out_at).length;
  const enabledGroups = (groups ?? []).filter((group) => group.enabled || group.status === "active").length;
  const blockedBySecurity = safetyBlocks?.length ?? 0;
  const estimatedCostCents = Number(process.env.WHATSAPP_ESTIMATED_COST_CENTS ?? 0);
  const estimatedCost = estimatedCostCents > 0 ? moneyFromCents(used * estimatedCostCents) : "Nao configurado";
  const topUsage = [...(usage ?? [])]
    .sort((a, b) => Number(b.used_credits ?? 0) - Number(a.used_credits ?? 0))
    .slice(0, 8);
  const nearLimit = (usage ?? [])
    .map((row) => {
      const limit = Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0);
      const percent = limit ? Math.round((Number(row.used_credits ?? 0) / limit) * 100) : 0;
      return { row, limit, percent };
    })
    .filter((item) => item.limit > 0 && item.percent >= 80)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);
  const blockedCondos = (accounts ?? []).filter((account) => account.status === "blocked");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
          <h1 className="mt-2 text-3xl font-semibold">WhatsApp</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Controle de uso, creditos, falhas, add-ons e riscos de custo sem expor telefone completo, payloads ou tokens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/whatsapp/logs">Logs</Link></Button>
          <Button asChild><Link href="/admin/whatsapp/creditos">Creditos</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Creditos usados no mes" value={used} hint={`${included + addonCredits} disponiveis`} />
        <AdminMetricCard label="Creditos vendidos" value={creditsSold} hint={moneyFromCents(addonRevenue)} />
        <AdminMetricCard label="Mensagens falhas" value={failedMessages} />
        <AdminMetricCard label="Opt-outs" value={optOuts} />
        <AdminMetricCard label="Add-ons ativos" value={addons?.length ?? 0} />
        <AdminMetricCard label="Grupos configurados" value={enabledGroups} />
        <AdminMetricCard label="Bloqueios seguranca" value={blockedBySecurity} />
        <AdminMetricCard label="Bloqueios por limite" value={blockedByLimit} hint={`Custo estimado: ${estimatedCost}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Condominios com maior uso</h2>
          </div>
          <div className="divide-y">
            {topUsage.map((row) => {
              const condo = joined(row.condominiums);
              const limit = Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0);
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <Link href={`/admin/condominios/${row.condominium_id}`} className="font-semibold hover:text-primary">{condo?.name ?? row.condominium_id}</Link>
                    <p className="text-xs text-muted-foreground">{Number(row.used_credits ?? 0)} de {limit} creditos</p>
                  </div>
                  <Button asChild variant="outline"><Link href={`/admin/whatsapp/logs?condominium_id=${row.condominium_id}`}>Ver logs</Link></Button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Perto ou acima do limite</h2>
          </div>
          <div className="divide-y">
            {nearLimit.map(({ row, percent, limit }) => {
              const condo = joined(row.condominiums);
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <Link href={`/admin/condominios/${row.condominium_id}`} className="font-semibold hover:text-primary">{condo?.name ?? row.condominium_id}</Link>
                    <p className="text-xs text-muted-foreground">{Number(row.used_credits ?? 0)} de {limit} creditos</p>
                  </div>
                  <AdminStatus value={percent >= 100 ? "acima do limite" : `${percent}% usado`} />
                </div>
              );
            })}
            {!nearLimit.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum condominio perto do limite neste mes.</p> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Erros recentes</h2></div>
          <div className="divide-y">
            {(logs ?? []).filter((log) => ["failed", "blocked", "opt_out", "no_consent"].includes(log.status ?? "")).slice(0, 8).map((log) => {
              const condo = joined(log.condominiums);
              return (
                <div key={log.id} className="p-4 text-sm">
                  <p className="font-semibold">{log.message_type}</p>
                  <p className="text-xs text-muted-foreground">{condo?.name ?? "Condominio"} - {log.status} - {new Date(log.created_at).toLocaleString("pt-BR")}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{log.error_message ?? "Sem resumo de erro."}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">WhatsApp bloqueado</h2></div>
          <div className="divide-y">
            {blockedCondos.map((account) => {
              const condo = joined(account.condominiums);
              return (
                <div key={account.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <p className="font-semibold">{condo?.name ?? account.condominium_id}</p>
                    <p className="text-xs text-muted-foreground">{account.provider} - telefone mascarado</p>
                  </div>
                  <AdminStatus value={account.status} />
                </div>
              );
            })}
            {!blockedCondos.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum condominio bloqueado.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <p className="text-sm leading-6 text-amber-950">
            Envio automatico deve respeitar opt-in, opt-out, limite mensal, seguranca de grupos e configuracao oficial. Use bloqueio manual quando houver risco de custo, abuso ou spam.
          </p>
        </div>
      </Card>
    </div>
  );
}
