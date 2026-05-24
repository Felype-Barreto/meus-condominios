import Link from "next/link";
import { updateCondoWhatsAppStatusAdminAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminWhatsAppUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string }>;
}) {
  await requirePlatformSession(["platform_owner", "platform_admin", "platform_finance", "platform_readonly"]);
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const query = (params.q ?? "").trim().toLowerCase();
  const supabase = createAdminSupabase();
  const { data: usage } = await supabase
    .from("whatsapp_usage")
    .select("id,condominium_id,month,included_credits,used_credits,addon_credits,blocked_sends,condominiums(id,name,slug,plan,settings)")
    .eq("month", month)
    .order("used_credits", { ascending: false })
    .limit(500);

  const rows = (usage ?? []).filter((row) => {
    if (!query) return true;
    const condo = joined(row.condominiums);
    return [condo?.name, condo?.slug, condo?.plan, row.condominium_id].some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const totalUsed = rows.reduce((sum, row) => sum + Number(row.used_credits ?? 0), 0);
  const totalLimit = rows.reduce((sum, row) => sum + Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0), 0);
  const blocked = rows.reduce((sum, row) => sum + Number(row.blocked_sends ?? 0), 0);
  const overLimit = rows.filter((row) => {
    const limit = Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0);
    return limit > 0 && Number(row.used_credits ?? 0) >= limit;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">WhatsApp</p>
          <h1 className="mt-2 text-3xl font-semibold">Uso por condominio</h1>
        </div>
        <Button asChild variant="outline"><Link href="/admin/whatsapp">Voltar</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Creditos usados" value={totalUsed} />
        <AdminMetricCard label="Limite total" value={totalLimit} />
        <AdminMetricCard label="Bloqueios por limite" value={blocked} />
        <AdminMetricCard label="Acima do limite" value={overLimit} />
      </div>
      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar condominio ou plano" />
          <Input name="month" defaultValue={month} placeholder="YYYY-MM" />
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>
      <div className="grid gap-4">
        {rows.map((row) => {
          const condo = joined(row.condominiums);
          const limit = Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0);
          const percent = limit ? Math.round((Number(row.used_credits ?? 0) / limit) * 100) : 0;
          const settings = (condo?.settings ?? {}) as Record<string, unknown>;
          return (
            <Card key={row.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/condominios/${row.condominium_id}`} className="text-lg font-semibold hover:text-primary">{condo?.name ?? row.condominium_id}</Link>
                    <AdminStatus value={condo?.plan ?? "sem plano"} />
                    {settings.platform_whatsapp_disabled ? <AdminStatus value="bloqueado" /> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{Number(row.used_credits ?? 0)} de {limit} creditos - {percent}% usado - {Number(row.blocked_sends ?? 0)} bloqueios</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline"><Link href={`/admin/whatsapp/logs?condominium_id=${row.condominium_id}`}>Logs</Link></Button>
                  <Button asChild variant="outline"><Link href={`/admin/whatsapp/creditos?condominium_id=${row.condominium_id}`}>Creditos</Link></Button>
                </div>
              </div>
              <form action={updateCondoWhatsAppStatusAdminAction} className="mt-4 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                <input type="hidden" name="condominium_id" value={row.condominium_id} />
                <select name="action" defaultValue={settings.platform_whatsapp_disabled ? "reactivate" : "block"} className="h-11 rounded-lg border bg-card px-3 text-sm">
                  <option value="block">Bloquear WhatsApp</option>
                  <option value="reactivate">Reativar WhatsApp</option>
                </select>
                <Input name="reason" placeholder="Motivo obrigatorio" required />
                <Button type="submit" variant="outline">Salvar</Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
