import Link from "next/link";
import { adjustWhatsAppCreditsAdminAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, moneyFromCents } from "@/lib/admin/data";

function joined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminWhatsAppCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ condominium_id?: string }>;
}) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin", "platform_finance", "platform_readonly"]);
  const params = await searchParams;
  const month = currentMonth();
  const supabase = createAdminSupabase();
  const [{ data: condos }, { data: usage }, { data: addons }] = await Promise.all([
    supabase.from("condominiums").select("id,name,slug,plan").order("name", { ascending: true }).limit(500),
    supabase.from("whatsapp_usage").select("id,condominium_id,month,included_credits,used_credits,addon_credits,blocked_sends,condominiums(id,name,plan)").eq("month", month).limit(500),
    supabase.from("communication_addons").select("id,condominium_id,addon_type,credits,price_cents,status,valid_until,created_at,condominiums(id,name,plan)").order("created_at", { ascending: false }).limit(300),
  ]);
  const filteredUsage = params.condominium_id ? (usage ?? []).filter((row) => row.condominium_id === params.condominium_id) : (usage ?? []);
  const activeAddons = (addons ?? []).filter((addon) => addon.status === "active");
  const creditsSold = activeAddons.reduce((sum, addon) => sum + Math.max(Number(addon.credits ?? 0), 0), 0);
  const revenue = activeAddons.reduce((sum, addon) => sum + Number(addon.price_cents ?? 0), 0);
  const manualAdjustments = (addons ?? []).filter((addon) => ["manual_credit_add", "manual_credit_remove"].includes(addon.addon_type ?? "")).length;
  const canAct = ["platform_owner", "platform_admin"].includes(session.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">WhatsApp</p>
          <h1 className="mt-2 text-3xl font-semibold">Creditos e add-ons</h1>
        </div>
        <Button asChild variant="outline"><Link href="/admin/whatsapp">Voltar</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Creditos vendidos" value={creditsSold} />
        <AdminMetricCard label="Receita add-ons" value={moneyFromCents(revenue)} />
        <AdminMetricCard label="Ajustes manuais" value={manualAdjustments} />
        <AdminMetricCard label="Condominios com uso" value={filteredUsage.length} />
      </div>
      {canAct ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Ajustar credito manual</h2>
          <form action={adjustWhatsAppCreditsAdminAction} className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_2fr_auto]">
            <select name="condominium_id" defaultValue={params.condominium_id ?? ""} className="h-11 rounded-lg border bg-card px-3 text-sm" required>
              <option value="">Escolha o condominio</option>
              {(condos ?? []).map((condo) => <option key={condo.id} value={condo.id}>{condo.name} - {condo.plan}</option>)}
            </select>
            <select name="operation" defaultValue="add" className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="add">Adicionar</option>
              <option value="remove">Remover</option>
            </select>
            <Input name="amount" type="number" min="1" placeholder="Creditos" required />
            <Input name="reason" placeholder="Motivo obrigatorio" required />
            <Button type="submit">Aplicar</Button>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Uso mensal</h2></div>
          <div className="divide-y">
            {filteredUsage.map((row) => {
              const condo = joined(row.condominiums);
              const limit = Number(row.included_credits ?? 0) + Number(row.addon_credits ?? 0);
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <Link href={`/admin/condominios/${row.condominium_id}`} className="font-semibold hover:text-primary">{condo?.name ?? row.condominium_id}</Link>
                    <p className="text-xs text-muted-foreground">{Number(row.used_credits ?? 0)} usados - {limit} limite</p>
                  </div>
                  <AdminStatus value={row.month} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-5"><h2 className="text-lg font-semibold">Add-ons recentes</h2></div>
          <div className="divide-y">
            {(addons ?? []).map((addon) => {
              const condo = joined(addon.condominiums);
              return (
                <div key={addon.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <p className="font-semibold">{addon.addon_type}</p>
                    <p className="text-xs text-muted-foreground">{condo?.name ?? addon.condominium_id} - {Number(addon.credits ?? 0)} creditos</p>
                  </div>
                  <div className="text-right">
                    <p>{moneyFromCents(addon.price_cents)}</p>
                    <AdminStatus value={addon.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
