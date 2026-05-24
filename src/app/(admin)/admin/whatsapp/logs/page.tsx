import Link from "next/link";
import { SensitiveField } from "@/components/admin/sensitive-field";
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

export default async function AdminWhatsAppLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; condominium_id?: string; page?: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_finance", "platform_support", "platform_security", "platform_readonly"]);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 50;
  const supabase = createAdminSupabase();
  let query = supabase
    .from("whatsapp_message_logs")
    .select("id,condominium_id,user_id,apartment_id,target_type,target_phone,target_group_id,template_key,message_type,status,error_message,created_at,condominiums(id,name,plan)")
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (params.status) query = query.eq("status", params.status);
  if (params.condominium_id) query = query.eq("condominium_id", params.condominium_id);
  const { data: logs } = await query;
  const rows = logs ?? [];
  const failed = rows.filter((log) => ["failed", "blocked", "opt_out", "no_consent"].includes(log.status ?? "")).length;
  const sent = rows.filter((log) => ["sent", "delivered", "read"].includes(log.status ?? "")).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">WhatsApp</p>
          <h1 className="mt-2 text-3xl font-semibold">Logs de mensagens</h1>
          <p className="mt-2 text-sm text-muted-foreground">Telefones e payloads ficam ocultos. Tokens nunca aparecem aqui.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/whatsapp">Voltar</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Nesta pagina" value={rows.length} />
        <AdminMetricCard label="Enviadas" value={sent} />
        <AdminMetricCard label="Falhas/bloqueios" value={failed} />
        <AdminMetricCard label="Pagina" value={page} />
      </div>
      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input name="condominium_id" defaultValue={params.condominium_id ?? ""} placeholder="ID do condominio" />
          <select name="status" defaultValue={params.status ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="">Todos status</option>
            {["queued", "sent", "delivered", "read", "failed", "blocked", "opt_out", "no_consent"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <Input name="page" defaultValue={String(page)} placeholder="Pagina" />
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>
      <div className="grid gap-4">
        {rows.map((log) => {
          const condo = joined(log.condominiums);
          return (
            <Card key={log.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{log.message_type}</h2>
                    <AdminStatus value={log.status} />
                    <AdminStatus value={log.target_type} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {condo?.name ?? log.condominium_id} - telefone{" "}
                    <SensitiveField
                      entityType="whatsapp_message_logs"
                      entityId={log.id}
                      field="phone"
                      contextModule="whatsapp"
                      maskedValue={maskPhone(log.target_phone)}
                    />{" "}
                    - grupo {log.target_group_id ? "configurado" : "nao"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")} - template {log.template_key ?? "sem template"}</p>
                  {log.error_message ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">Erro: {log.error_message}</p> : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline"><Link href={`/admin/whatsapp/erros?condominium_id=${log.condominium_id}`}>Erros</Link></Button>
                  <SensitiveField
                    label="Payload"
                    entityType="whatsapp_message_logs"
                    entityId={log.id}
                    field="log_payload"
                    contextModule="whatsapp"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="flex items-center justify-between p-5">
        <Button asChild variant="outline"><Link href={`/admin/whatsapp/logs?page=${Math.max(1, page - 1)}`}>Anterior</Link></Button>
        <p className="text-sm text-muted-foreground">Pagina {page}</p>
        <Button asChild variant="outline"><Link href={`/admin/whatsapp/logs?page=${page + 1}`}>Proxima</Link></Button>
      </Card>
    </div>
  );
}
