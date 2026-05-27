import { Check, Search, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleBadge } from "@/components/common/role-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  removePersonMembershipAction,
  reviewResidentMembershipAction,
  sendPasswordResetForPersonAction,
  setApartmentResponsibleAction,
} from "./actions";

type SearchParams = {
  nome?: string;
  tipo?: string;
  bloco?: string;
  apartamento?: string;
  status?: string;
};

type PersonRole = "subscriber_admin" | "admin" | "syndic" | "doorman" | "resident" | "owner";

type PersonRow = {
  id: string;
  user_id: string | null;
  role: PersonRole;
  status: string;
  created_at: string | null;
  privacy_settings?: Record<string, unknown> | null;
  profiles?: {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  apartments?: {
    id?: string | null;
    number?: string | null;
    blocks?: { id?: string | null; name?: string | null } | null;
  } | null;
};

type ApartmentOption = {
  id: string;
  number: string | null;
  blocks?: { id: string | null; name: string | null } | null;
};

const roleOptions = [
  ["", "Todos"],
  ["resident", "Morador"],
  ["owner", "Proprietário"],
  ["syndic", "Síndico"],
  ["doorman", "Guarita"],
  ["admin", "Admin"],
  ["subscriber_admin", "Assinante"],
] as const;

function roleLabel(role: string) {
  return roleOptions.find(([value]) => value === role)?.[1] ?? role;
}

function isResponsible(row: PersonRow) {
  return row.privacy_settings?.is_apartment_responsible === true;
}

function getContactLabel(row: PersonRow, phoneVisible: boolean) {
  const phone = row.profiles?.phone;
  if (!phone) return "Não informado";
  return phoneVisible ? phone : "Oculto";
}

function FilterPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer select-none list-none rounded-md px-2 py-1 transition hover:bg-muted">
        {title}
      </summary>
      <div className="absolute left-0 top-9 z-20 w-64 rounded-lg border bg-card p-3 shadow-lg">
        {children}
      </div>
    </details>
  );
}

function HiddenFilters({ filters, except }: { filters: SearchParams; except?: keyof SearchParams }) {
  return (
    <>
      {Object.entries(filters).map(([key, value]) =>
        key === except || !value ? null : <input key={key} type="hidden" name={key} value={value} />,
      )}
    </>
  );
}

function SelectFilter({
  filters,
  name,
  options,
}: {
  filters: SearchParams;
  name: keyof SearchParams;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <form className="space-y-3">
      <HiddenFilters filters={filters} except={name} />
      <select
        name={name}
        defaultValue={String(filters[name] ?? "")}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
      >
        {options.map(([value, label]) => (
          <option key={`${name}-${value}`} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" className="w-full">
        Filtrar
      </Button>
    </form>
  );
}

function NameFilter({ filters }: { filters: SearchParams }) {
  return (
    <form className="space-y-3">
      <HiddenFilters filters={filters} except="nome" />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="nome" defaultValue={filters.nome ?? ""} placeholder="Buscar nome ou e-mail" className="pl-9" />
      </div>
      <Button type="submit" size="sm" className="w-full">
        Filtrar
      </Button>
    </form>
  );
}

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ condoId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { condoId } = await params;
  const filters = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  if (access.isResident || access.isDoorman) redirect(`/app/${condoId}/dashboard`);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: condo },
    { data: isSubscriberAdmin },
    { data: canViewResidents },
    { data: canApproveResidents },
    { data: canViewPhone },
    { data: apartments },
  ] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.view",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.approve",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.view_phone",
    }),
    supabase
      .from("apartments")
      .select("id,number,blocks(id,name)")
      .eq("condominium_id", condoId)
      .order("number", { ascending: true }),
  ]);

  const canOpenPeople = Boolean(user && (isSubscriberAdmin || canViewResidents || canApproveResidents));

  if (!canOpenPeople) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Acesso limitado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu perfil não tem permissão para ver pessoas neste condomínio.
        </p>
      </Card>
    );
  }

  let query = supabase
    .from("memberships")
    .select(
      `
      id,
      user_id,
      role,
      status,
      created_at,
      privacy_settings,
      profiles!memberships_user_id_fkey(id,full_name,email,phone),
      apartments(id,number,blocks(id,name))
    `,
    )
    .eq("condominium_id", condoId)
    .in("role", ["subscriber_admin", "admin", "syndic", "doorman", "resident", "owner"])
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  if (filters.tipo) query = query.eq("role", filters.tipo);
  if (filters.status && ["active", "pending"].includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.apartamento) query = query.eq("apartment_id", filters.apartamento);

  const { data: memberships } = await query;
  let rows = (memberships ?? []) as unknown as PersonRow[];

  if (filters.bloco) {
    rows = rows.filter((row) => row.apartments?.blocks?.id === filters.bloco);
  }

  const nameFilter = String(filters.nome ?? "").trim().toLowerCase();
  if (nameFilter) {
    rows = rows.filter((row) => {
      const text = [
        row.profiles?.full_name,
        row.profiles?.email,
        row.apartments?.number,
        row.apartments?.blocks?.name,
        roleLabel(row.role),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(nameFilter);
    });
  }

  rows.sort((a, b) => {
    const responsibleOrder = Number(isResponsible(b)) - Number(isResponsible(a));
    if (responsibleOrder !== 0) return responsibleOrder;
    return (a.apartments?.number ?? "").localeCompare(b.apartments?.number ?? "", "pt-BR", { numeric: true });
  });

  const apartmentRows = (apartments ?? []) as unknown as ApartmentOption[];
  const blockOptions = Array.from(
    new Map(
      apartmentRows
        .map((apartment) => [apartment.blocks?.id ?? "", apartment.blocks?.name ?? "Bloco"] as [string, string])
        .filter(([id]) => id),
    ),
  );
  const filteredApartmentOptions = filters.bloco
    ? apartmentRows.filter((apartment) => apartment.blocks?.id === filters.bloco)
    : apartmentRows;
  const phoneVisible = Boolean(isSubscriberAdmin || canViewPhone);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Pessoas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Lista geral de moradores, síndicos, guarita e administradores. O responsável é só o contato
            principal do apartamento para portaria e QR.
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/${condoId}/convites`}>Convidar pessoa</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/70 text-left">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">
                  <FilterPanel title="Tipo">
                    <SelectFilter filters={filters} name="tipo" options={[...roleOptions]} />
                  </FilterPanel>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <FilterPanel title="Nome">
                    <NameFilter filters={filters} />
                  </FilterPanel>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <FilterPanel title="Bloco">
                    <SelectFilter filters={filters} name="bloco" options={[["", "Todos"], ...blockOptions]} />
                  </FilterPanel>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <FilterPanel title="Apartamento">
                    <SelectFilter
                      filters={filters}
                      name="apartamento"
                      options={[
                        ["", "Todos"],
                        ...filteredApartmentOptions.map((apartment) => [
                          apartment.id,
                          `${apartment.blocks?.name ?? "Bloco"} - ${apartment.number}`,
                        ] as [string, string]),
                      ]}
                    />
                  </FilterPanel>
                </th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold">
                  <FilterPanel title="Status">
                    <SelectFilter
                      filters={filters}
                      name="status"
                      options={[
                        ["", "Todos"],
                        ["active", "Ativo"],
                        ["pending", "Pendente"],
                      ]}
                    />
                  </FilterPanel>
                </th>
                <th className="px-4 py-3 font-semibold">Editar</th>
                <th className="px-4 py-3 font-semibold">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => {
                  const canSetResponsible = row.apartments?.id && ["resident", "owner"].includes(row.role);
                  return (
                    <tr key={row.id} className="border-b transition hover:bg-muted/45">
                      <td className="px-4 py-3">
                        <RoleBadge role={row.role} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {isResponsible(row) ? (
                            <span title="Responsável do apartamento">
                              <Star className="h-4 w-4 fill-primary text-primary" />
                            </span>
                          ) : null}
                          <span className="font-semibold">{row.profiles?.full_name ?? "Sem nome"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.apartments?.blocks?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.apartments?.number ?? "-"}</td>
                      <td className="px-4 py-3 break-all text-muted-foreground">
                        {row.profiles?.email ?? "Não informado"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{getContactLabel(row, phoneVisible)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={row.status === "active" ? "success" : row.status === "pending" ? "warning" : "neutral"}
                        >
                          {row.status === "active" ? "Ativo" : row.status === "pending" ? "Pendente" : row.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.status === "pending" && ["resident", "owner"].includes(row.role) ? (
                            <>
                              <form action={reviewResidentMembershipAction}>
                                <input type="hidden" name="condominium_id" value={condoId} />
                                <input type="hidden" name="membership_id" value={row.id} />
                                <input type="hidden" name="decision" value="approve" />
                                <Button type="submit" size="sm" aria-label="Aprovar cadastro">
                                  <Check className="h-4 w-4" />
                                </Button>
                              </form>
                              <form action={reviewResidentMembershipAction}>
                                <input type="hidden" name="condominium_id" value={condoId} />
                                <input type="hidden" name="membership_id" value={row.id} />
                                <input type="hidden" name="decision" value="reject" />
                                <Button type="submit" size="sm" variant="outline" aria-label="Rejeitar cadastro">
                                  <X className="h-4 w-4" />
                                </Button>
                              </form>
                            </>
                          ) : null}
                          {canSetResponsible ? (
                            <form action={setApartmentResponsibleAction}>
                              <input type="hidden" name="condominium_id" value={condoId} />
                              <input type="hidden" name="membership_id" value={row.id} />
                              <Button type="submit" size="sm" variant={isResponsible(row) ? "default" : "outline"}>
                                Responsável
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {row.role !== "subscriber_admin" && row.profiles?.email ? (
                            <form action={sendPasswordResetForPersonAction}>
                              <input type="hidden" name="condominium_id" value={condoId} />
                              <input type="hidden" name="membership_id" value={row.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                title="Enviar link de redefinição de senha"
                              >
                                Redefinir senha
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.role !== "subscriber_admin" ? (
                          <form action={removePersonMembershipAction}>
                            <input type="hidden" name="condominium_id" value={condoId} />
                            <input type="hidden" name="membership_id" value={row.id} />
                            <Button type="submit" size="sm" variant="outline" aria-label="Remover acesso">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma pessoa encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
