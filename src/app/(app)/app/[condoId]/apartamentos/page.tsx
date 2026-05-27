import { Building2, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { ApartmentGrid, type ApartmentGridBlock } from "@/components/app/apartment-grid";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ApartmentRow = {
  id: string;
  number: string;
  floor: string | null;
  status: string;
  notes_private: string | null;
  blocks: {
    id: string | null;
    name: string | null;
    sort_order: number | null;
  } | null;
  memberships: {
    id: string;
    role: "resident" | "owner";
    status: string;
    user_id: string | null;
    privacy_settings: {
      allow_admin_contact?: boolean;
      allow_internal_search?: boolean;
    } | null;
    profiles: {
      full_name: string | null;
      phone: string | null;
      email: string | null;
    } | null;
  }[];
};

type BlockRow = {
  id: string;
  name: string;
  sort_order: number;
};

function toBlocks(blocks: BlockRow[], apartments: ApartmentRow[]) {
  const blockMap = new Map<string, ApartmentGridBlock>(
    blocks.map((block) => [
      block.id,
      {
        id: block.id,
        name: block.name,
        sort_order: block.sort_order,
        apartments: [],
      },
    ]),
  );

  for (const apartment of apartments) {
    const blockId = apartment.blocks?.id ?? "sem-bloco";
    const block = blockMap.get(blockId) ?? {
      id: blockId,
      name: apartment.blocks?.name ?? "Sem bloco",
      sort_order: apartment.blocks?.sort_order ?? 999,
      apartments: [],
    };

    block.apartments.push({
      id: apartment.id,
      number: apartment.number,
      floor: apartment.floor,
      status: apartment.status,
      notes_private: apartment.notes_private,
      memberships: apartment.memberships ?? [],
    });
    blockMap.set(blockId, block);
  }

  return Array.from(blockMap.values())
    .map((block) => ({
      ...block,
      apartments: block.apartments.sort((a, b) =>
        a.number.localeCompare(b.number, "pt-BR", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export default async function ApartmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ condoId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { condoId } = await params;
  const { q = "", status = "" } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  if (access.isResident || access.isDoorman) redirect(`/app/${condoId}/dashboard`);
  const [{ data: condo }, { data: planLimits }, { data: usage }, { data: canViewContacts }, { data: canPrivateNotes }, { data: blockRows }] =
    await Promise.all([
      supabase.from("condominiums").select("name").eq("id", condoId).single(),
      supabase.rpc("get_plan_limits", { condo_id: condoId }),
      supabase.rpc("get_current_usage", { condo_id: condoId }),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "apartments.view_contacts",
      }),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "apartments.private_notes",
      }),
      supabase
        .from("blocks")
        .select("id,name,sort_order")
        .eq("condominium_id", condoId)
        .order("sort_order", { ascending: true }),
    ]);

  let query = supabase
    .from("apartments")
    .select(
      `
      id,
      number,
      floor,
      status,
      notes_private,
      blocks!apartments_block_id_fkey(id,name,sort_order),
      memberships!memberships_apartment_id_fkey(
        id,
        role,
        status,
        user_id,
        privacy_settings,
        profiles!memberships_user_id_fkey(full_name,phone,email)
      )
    `,
    )
    .eq("condominium_id", condoId)
    .in("memberships.role", ["resident", "owner"])
    .order("sort_order", { referencedTable: "blocks", ascending: true })
    .order("number", { ascending: true })
    .limit(getEconomyPageSize(240));

  if (q) query = query.ilike("number", `%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const apartments = (data ?? []) as unknown as ApartmentRow[];
  const blocks = toBlocks((blockRows ?? []) as BlockRow[], apartments);
  const totalApartments = apartments.length;
  const occupiedApartments = apartments.filter((apartment) =>
    apartment.memberships?.some((membership) => membership.status === "active"),
  ).length;
  const pendingApartments = apartments.filter((apartment) =>
    apartment.memberships?.some((membership) => membership.status === "pending"),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name ?? "Unidades"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Apartamentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Blocos lado a lado, ocupação visível e convite rápido para cada unidade.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Apartamentos</p>
          <strong className="mt-1 block text-2xl">{totalApartments}</strong>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Com responsável ativo</p>
          <strong className="mt-1 block text-2xl">{occupiedApartments}</strong>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Cadastros pendentes</p>
          <strong className="mt-1 block text-2xl">{pendingApartments}</strong>
        </Card>
      </div>

      <Card className="p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar apartamento"
              className="border-0 px-0 focus-visible:ring-0"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="vacant">Vago</option>
            <option value="occupied">Ocupado</option>
            <option value="maintenance">Manutenção</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      {blocks ? (
        <ApartmentGrid
          blocks={blocks}
          canPrivateNotes={Boolean(canPrivateNotes)}
          canViewContacts={Boolean(canViewContacts)}
          condoId={condoId}
          limits={{
            blocks: Number((planLimits as { max_blocks?: number } | null)?.max_blocks ?? 0),
            totalApartments: Number((planLimits as { max_total_apartments?: number } | null)?.max_total_apartments ?? 0),
          }}
          usage={{
            blocks: Number((usage as { blocks?: number } | null)?.blocks ?? blocks.length),
            apartments: Number((usage as { apartments?: number } | null)?.apartments ?? totalApartments),
          }}
        />
      ) : (
        <EmptyState
          icon={Building2}
          title="Nenhum apartamento encontrado"
          description="Ajuste a busca ou crie a estrutura do condomínio."
        />
      )}
    </div>
  );
}
