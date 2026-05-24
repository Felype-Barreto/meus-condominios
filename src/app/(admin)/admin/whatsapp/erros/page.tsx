import Link from "next/link";
import { convertWhatsAppErrorToSupportTicketAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskPhone } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminWhatsAppErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ condominium_id?: string; status?: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_support", "platform_security", "platform_readonly"]);
  const params = await searchParams;
  const supabase = createAdminSupabase();
  let query = supabase
    .from("whatsapp_message_logs")
    .select("id,condominium_id,target_type,target_phone,target_group_id,message_type,status,error_message,created_at,condominiums(id,name,plan)")
    .in("status", params.status ? [params.status] : ["failed", "blocked", "opt_out", "no_consent"])
    .order("created_at", { ascending: false })
    .limit(120);
  if (params.condominium_id) query = query.eq("condominium_id", params.condominium_id);
  const [{ data: logs }, { data: safetyBlocks }, { data: usage }] = await Promise.all([
    query,
    supabase.from("audit_logs").select("id,condominium_id,action,created_at,condominiums(id,name,plan)").in("action", ["communication_safety_blocked", "communication_resend_unread_blocked"]).order("created_at", { ascending: false }).limit(80),
    supabase.from("whatsapp_usage").select("id,condominium_id,blocked_sends,condominiums(id,name,plan)").gt("blocked_sends", 0).limit(80),
  ]);

  const optOuts = (logs ?? []).filter((log) => ["opt_out", "no_consent"].includes(log.status ?? "")).length;
  const failed = (logs ?? []).filter((log) => log.status === "failed").length;
  const blocked = (logs ?? []).filter((log) => log.status === "blocked").length;
  const limitBlocked = (usage ?? []).reduce((sum, row) => sum + Number(row.blocked_sends ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">WhatsApp</p>
          <h1 className="mt-2 text-3xl font-semibold">Erros e bloqueios</h1>
        </div>
        <Button asChild variant="outline"><Link href="/admin/whatsapp">Voltar</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Falhas" value={failed} />
        <AdminMetricCard label="Bloqueios por status" value={blocked} />
        <AdminMetricCard label="Opt-out/sem consentimento" value={optOuts} />
        <AdminMetricCard label="Bloqueios por limite" value={limitBlocked} />
      </div>
      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="condominium_id" defaultValue={params.condominium_id ?? ""} placeholder="ID do condominio" />
          <select name="status" defaultValue={params.status ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos erros</option>
            <option value="failed">Falha</option>
            <option value="blocked">Bloqueado</option>
            <option value="opt_out">Opt-out</option>
            <option value="no_consent">Sem consentimento</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Logs com erro</h2></div>
          <div className="divide-y">
            {(logs ?? []).map((log) => {
              const condo = joined(log.condominiums);
              return (
                <div key={log.id} className="p-4 text-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold">{log.message_type}</p>
                      <p className="text-xs text-muted-foreground">{condo?.name ?? log.condominium_id} - {log.status} - telefone {maskPhone(log.target_phone)}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.error_message ?? "Sem resumo de erro."}</p>
                    </div>
                    <AdminStatus value={log.status} />
                  </div>
                  <form action={convertWhatsAppErrorToSupportTicketAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                    <input type="hidden" name="log_id" value={log.id} />
                    <input type="hidden" name="condominium_id" value={log.condominium_id} />
                    <Input name="subject" defaultValue={`Erro WhatsApp: ${log.message_type}`.slice(0, 100)} required />
                    <Input name="reason" placeholder="Resumo para suporte" required />
                    <Button type="submit" variant="outline">Criar chamado</Button>
                  </form>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Bloqueios de seguranca/limite</h2></div>
          <div className="divide-y">
            {[...(safetyBlocks ?? []), ...(usage ?? [])].map((item) => {
              const condo = joined(item.condominiums);
              const isUsage = "blocked_sends" in item;
              return (
                <div key={item.id} className="p-4 text-sm">
                  <p className="font-semibold">{isUsage ? "Bloqueio por limite" : item.action}</p>
                  <p className="text-xs text-muted-foreground">{condo?.name ?? item.condominium_id} {isUsage ? `- ${item.blocked_sends} bloqueios` : `- ${new Date(item.created_at).toLocaleString("pt-BR")}`}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
