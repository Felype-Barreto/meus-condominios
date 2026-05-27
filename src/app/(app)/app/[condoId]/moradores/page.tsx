import { Check, Search, Send, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResidentInvitePanel } from "@/components/app/resident-invite-panel";
import { RoleBadge } from "@/components/common/role-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getPublicAppUrl } from "@/lib/public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  removePersonMembershipAction,
  reviewResidentMembershipAction,
  sendPersonMessageAction,
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

type PendingMembership = {
  id: string;
  role: "resident" | "owner";
  status: string;
  created_at: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  apartments?: {
    number?: string | null;
    blocks?: { name?: string | null } | null;
  } | null;
};

type InviteRow = {
  token: string;
  invite_type: string;
  role: string;
  email: string | null;
  status: string;
  created_at: string | null;
  expires_at: string | null;
};

type MemberMessage = {
  id: string;
  sender_id: string;
  target_membership_id: string;
  body: string;
  created_at: string;
  expires_at: string;
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

function inviteLabel(type: string) {
  const labels: Record<string, string> = {
    resident: "Morador",
    owner: "Proprietario",
    syndic: "Sindico",
    doorman: "Guarita",
    admin: "Administracao",
  };
  return labels[type] ?? type;
}

function isResponsible(row: PersonRow) {
  return row.privacy_settings?.is_apartment_responsible === true;
}

function getContactLabel(row: PersonRow, phoneVisible: boolean) {
  const phone = row.profiles?.phone;
  if (!phone) return "Não informado";
  return phoneVisible ? phone : "Oculto";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function apartmentLabel(row: PersonRow) {
  if (!row.apartments?.number) return "-";
  return `${row.apartments.blocks?.name ?? "Bloco"} - ${row.apartments.number}`;
}

function sameApartmentPeople(row: PersonRow, rows: PersonRow[]) {
  const apartmentId = row.apartments?.id;
  if (!apartmentId) return [];
  return rows.filter((item) => item.id !== row.id && item.apartments?.id === apartmentId);
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
    { data: pendingMemberships },
    { data: activeInvites },
  ] = await Promise.all([
    supabase.from("condominiums").select("name,slug").eq("id", condoId).single(),
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
    supabase
      .from("memberships")
      .select(
        `
        id,
        role,
        status,
        created_at,
        profiles!memberships_user_id_fkey(full_name,email),
        apartments(number,blocks(name))
      `,
      )
      .eq("condominium_id", condoId)
      .in("role", ["resident", "owner"])
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select("token,invite_type,role,email,status,created_at,expires_at")
      .eq("condominium_id", condoId)
      .eq("status", "active")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(8),
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

  await supabase.rpc("purge_expired_member_messages");

  const rowIds = rows.map((row) => row.id);
  const { data: memberMessages } = rowIds.length
    ? await supabase
        .from("member_messages")
        .select("id,sender_id,target_membership_id,body,created_at,expires_at")
        .eq("condominium_id", condoId)
        .in("target_membership_id", rowIds)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(120)
    : { data: [] };

  const messagesByMembership = ((memberMessages ?? []) as MemberMessage[]).reduce<Record<string, MemberMessage[]>>(
    (acc, message) => {
      acc[message.target_membership_id] ??= [];
      acc[message.target_membership_id].push(message);
      return acc;
    },
    {},
  );

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
  const pendingRows = (pendingMemberships ?? []) as unknown as PendingMembership[];
  const invites = (activeInvites ?? []) as unknown as InviteRow[];
  const appUrl = getPublicAppUrl();

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
          <Link href="#convites">Convidar pessoa</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-xs">
            <thead className="bg-muted/70 text-left text-[0.72rem] uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="w-14 px-3 py-2 font-semibold">Nº</th>
                <th className="w-32 px-3 py-2 font-semibold">
                  <FilterPanel title="Tipo">
                    <SelectFilter filters={filters} name="tipo" options={[...roleOptions]} />
                  </FilterPanel>
                </th>
                <th className="w-56 px-3 py-2 font-semibold">
                  <FilterPanel title="Nome">
                    <NameFilter filters={filters} />
                  </FilterPanel>
                </th>
                <th className="w-36 px-3 py-2 font-semibold">
                  <FilterPanel title="Bloco">
                    <SelectFilter filters={filters} name="bloco" options={[["", "Todos"], ...blockOptions]} />
                  </FilterPanel>
                </th>
                <th className="w-36 px-3 py-2 font-semibold">
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
                <th className="w-56 px-3 py-2 font-semibold">E-mail</th>
                <th className="w-36 px-3 py-2 font-semibold">Telefone</th>
                <th className="w-28 px-3 py-2 font-semibold">
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
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, index) => {
                  const canSetResponsible = row.apartments?.id && ["resident", "owner"].includes(row.role);
                  const modalId = `person-${row.id}`;
                  const housemates = sameApartmentPeople(row, rows);
                  const messages = messagesByMembership[row.id] ?? [];
                  return (
                    <tr key={row.id} className="h-11 border-b transition hover:bg-muted/45">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <RoleBadge role={row.role} />
                      </td>
                      <td className="px-3 py-2">
                        <input id={modalId} type="checkbox" className="peer sr-only" />
                        <label
                          htmlFor={modalId}
                          className="flex min-w-0 cursor-pointer items-center gap-2 whitespace-nowrap font-semibold hover:text-primary"
                        >
                          {isResponsible(row) ? (
                            <span title="Responsavel do apartamento">
                              <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
                            </span>
                          ) : null}
                          <span className="truncate">{row.profiles?.full_name ?? "Sem nome"}</span>
                        </label>
                        <div className="fixed inset-0 z-50 hidden bg-black/55 p-4 peer-checked:block">
                          <div className="mx-auto mt-10 max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase text-primary">{roleLabel(row.role)}</p>
                                <h2 className="mt-1 text-2xl font-semibold">{row.profiles?.full_name ?? "Sem nome"}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">{apartmentLabel(row)}</p>
                              </div>
                              <label
                                htmlFor={modalId}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border hover:bg-muted"
                                aria-label="Fechar detalhes"
                              >
                                <X className="h-4 w-4" />
                              </label>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">E-mail</p>
                                <p className="mt-1 break-all font-semibold">{row.profiles?.email ?? "Nao informado"}</p>
                              </div>
                              <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">Telefone</p>
                                <p className="mt-1 font-semibold">{getContactLabel(row, phoneVisible)}</p>
                              </div>
                              <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">Status</p>
                                <p className="mt-1 font-semibold">{row.status === "active" ? "Ativo" : row.status === "pending" ? "Pendente" : row.status}</p>
                              </div>
                              <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">Criado em</p>
                                <p className="mt-1 font-semibold">{formatDate(row.created_at)}</p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg border bg-background p-3">
                              <p className="text-sm font-semibold">Mora com</p>
                              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                                {housemates.length ? (
                                  housemates.map((person) => (
                                    <p key={person.id}>
                                      {person.profiles?.full_name ?? "Sem nome"} - {roleLabel(person.role)}
                                    </p>
                                  ))
                                ) : (
                                  <p>Nenhuma outra pessoa deste apartamento apareceu na lista atual.</p>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg border bg-background p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">Chat interno</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Mensagens simples de texto. Elas somem automaticamente em ate 3 dias para reduzir custo e exposicao de dados.
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-lg border bg-card p-3">
                                {messages.length ? (
                                  messages.slice(0, 8).map((message) => (
                                    <div key={message.id} className="rounded-md bg-background p-2 text-sm">
                                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {message.sender_id === user?.id ? "Voce" : "Equipe"} - {formatDate(message.created_at)}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ativa para esta pessoa.</p>
                                )}
                              </div>
                              <form action={sendPersonMessageAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input type="hidden" name="condominium_id" value={condoId} />
                                <input type="hidden" name="membership_id" value={row.id} />
                                <Input name="body" maxLength={1000} placeholder="Escreva uma mensagem curta" className="sm:flex-1" />
                                <Button type="submit" size="sm">
                                  <Send className="h-4 w-4" />
                                  Enviar
                                </Button>
                              </form>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {row.status === "pending" && ["resident", "owner"].includes(row.role) ? (
                                <>
                                  <form action={reviewResidentMembershipAction}>
                                    <input type="hidden" name="condominium_id" value={condoId} />
                                    <input type="hidden" name="membership_id" value={row.id} />
                                    <input type="hidden" name="decision" value="approve" />
                                    <Button type="submit" size="sm">
                                      <Check className="h-4 w-4" />
                                      Aprovar
                                    </Button>
                                  </form>
                                  <form action={reviewResidentMembershipAction}>
                                    <input type="hidden" name="condominium_id" value={condoId} />
                                    <input type="hidden" name="membership_id" value={row.id} />
                                    <input type="hidden" name="decision" value="reject" />
                                    <Button type="submit" size="sm" variant="outline">
                                      <X className="h-4 w-4" />
                                      Rejeitar
                                    </Button>
                                  </form>
                                </>
                              ) : null}
                              {canSetResponsible ? (
                                <form action={setApartmentResponsibleAction}>
                                  <input type="hidden" name="condominium_id" value={condoId} />
                                  <input type="hidden" name="membership_id" value={row.id} />
                                  <Button type="submit" size="sm" variant={isResponsible(row) ? "default" : "outline"}>
                                    Responsavel
                                  </Button>
                                </form>
                              ) : null}
                              {row.role !== "subscriber_admin" && row.profiles?.email ? (
                                <form action={sendPasswordResetForPersonAction}>
                                  <input type="hidden" name="condominium_id" value={condoId} />
                                  <input type="hidden" name="membership_id" value={row.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    Redefinir senha
                                  </Button>
                                </form>
                              ) : null}
                              {row.role !== "subscriber_admin" ? (
                                <form action={removePersonMembershipAction}>
                                  <input type="hidden" name="condominium_id" value={condoId} />
                                  <input type="hidden" name="membership_id" value={row.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                  </Button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="truncate whitespace-nowrap px-3 py-2 text-muted-foreground">{row.apartments?.blocks?.name ?? "-"}</td>
                      <td className="truncate whitespace-nowrap px-3 py-2 text-muted-foreground">{row.apartments?.number ?? "-"}</td>
                      <td className="truncate whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {row.profiles?.email ?? "Nao informado"}
                      </td>
                      <td className="truncate whitespace-nowrap px-3 py-2 text-muted-foreground">{getContactLabel(row, phoneVisible)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <StatusBadge
                          tone={row.status === "active" ? "success" : row.status === "pending" ? "warning" : "neutral"}
                        >
                          {row.status === "active" ? "Ativo" : row.status === "pending" ? "Pendente" : row.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma pessoa encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <section id="convites" className="space-y-4">
        <ResidentInvitePanel
          condoId={condoId}
          apartments={(apartmentRows ?? []) as never}
          selectedApartmentId={filters.apartamento ?? ""}
        />

        <Card className="p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Cadastros pendentes</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Aprove ou rejeite os cadastros enviados por link. Rejeitados saem desta fila e ficam apenas no historico.
              </p>
            </div>
            <StatusBadge tone={pendingRows.length ? "warning" : "success"}>
              {pendingRows.length} pendente(s)
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {pendingRows.length ? (
              pendingRows.map((membership) => (
                <div
                  key={membership.id}
                  className="flex flex-col gap-4 rounded-lg border bg-muted p-4 transition hover:border-primary/60 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone="warning">Pendente</StatusBadge>
                      <StatusBadge tone="neutral">{inviteLabel(membership.role)}</StatusBadge>
                    </div>
                    <p className="mt-3 font-semibold">
                      {membership.profiles?.full_name ?? membership.profiles?.email ?? "Cadastro sem nome"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {membership.apartments?.blocks?.name ?? "Bloco nao informado"} -{" "}
                      {membership.apartments?.number ?? "Apartamento nao informado"}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {membership.profiles?.email ?? "E-mail nao informado"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={reviewResidentMembershipAction}>
                      <input type="hidden" name="condominium_id" value={condoId} />
                      <input type="hidden" name="membership_id" value={membership.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <Button type="submit" size="sm">
                        Aprovar
                      </Button>
                    </form>
                    <form action={reviewResidentMembershipAction}>
                      <input type="hidden" name="condominium_id" value={condoId} />
                      <input type="hidden" name="membership_id" value={membership.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <Button type="submit" size="sm" variant="outline">
                        Rejeitar
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum cadastro pendente agora.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Codigo do condominio para login</p>
          <p className="mt-2 break-all text-2xl font-semibold">{condo?.slug ?? "codigo-indisponivel"}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Moradores, sindico e guarita usam este codigo na opcao Condominio da tela Entrar,
            junto com o e-mail e a senha criados pelo convite.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold">Convites ativos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Os links expiram em 10 minutos e saem daqui depois de usados ou vencidos.
          </p>
          <div className="mt-5 space-y-3">
            {invites.length ? (
              invites.map((invite) => (
                <div
                  key={invite.token}
                  className="flex flex-col gap-2 rounded-lg border bg-muted p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold">{invite.email ?? "Link copiavel"}</p>
                    <p className="break-all text-sm text-muted-foreground">
                      {appUrl}/convite/{invite.token}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inviteLabel(invite.invite_type)} / {inviteLabel(invite.role)}
                    </p>
                  </div>
                  <StatusBadge tone="success">Ativo</StatusBadge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum convite ativo no momento.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
