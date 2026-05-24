"use client";

import { Building2, Check, Copy, DoorOpen, Edit3, Link2, Plus, UsersRound } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  createApartmentAction,
  createBlockAction,
  deleteApartmentAction,
  deleteBlockAction,
  deleteFloorAction,
  type ApartmentStructureState,
  updateApartmentAction,
  updateBlockAction,
} from "@/app/(app)/app/[condoId]/apartamentos/actions";
import {
  createResidentInviteAction,
  type InviteState,
} from "@/app/(app)/app/[condoId]/convites/actions";
import { RoleBadge } from "@/components/common/role-badge";
import { DeleteConfirmation } from "@/components/common/delete-confirmation";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ApartmentGridMembership = {
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
};

export type ApartmentGridApartment = {
  id: string;
  number: string;
  floor: string | null;
  status: string;
  notes_private: string | null;
  memberships: ApartmentGridMembership[];
};

export type ApartmentGridBlock = {
  id: string;
  name: string;
  sort_order: number;
  apartments: ApartmentGridApartment[];
};

type FloorGroup = {
  value: string;
  label: string;
  apartments: ApartmentGridApartment[];
};

const initialInviteState: InviteState = { status: "idle" };
const initialStructureState: ApartmentStructureState = { status: "idle" };

function apartmentStatus(apartment: ApartmentGridApartment) {
  const active = apartment.memberships.filter((membership) => membership.status === "active");
  if (active.length > 0) return { label: "Ocupado", tone: "success" as const };
  if (apartment.status === "maintenance") return { label: "Manutencao", tone: "warning" as const };
  return { label: "Vago", tone: "neutral" as const };
}

function floorLabel(floor: string | null) {
  if (!floor) return "Sem andar";
  const normalized = floor.trim().toLowerCase();
  if (["0", "t", "terreo"].includes(normalized)) return "Terreo";
  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber)) return `${asNumber} andar`;
  return floor;
}

function floorSortValue(floor: string) {
  const parsed = Number.parseInt(floor, 10);
  return Number.isFinite(parsed) ? parsed : 999;
}

function naturalApartmentSort(a: ApartmentGridApartment, b: ApartmentGridApartment) {
  return a.number.localeCompare(b.number, "pt-BR", { numeric: true, sensitivity: "base" });
}

function buildFloorGroups(apartments: ApartmentGridApartment[], extraFloors: string[]): FloorGroup[] {
  const floors = new Map<string, ApartmentGridApartment[]>();
  floors.set("0", []);

  for (const apartment of apartments) {
    const value = (apartment.floor ?? "").trim() || "sem-andar";
    floors.set(value, [...(floors.get(value) ?? []), apartment]);
  }

  for (const floor of extraFloors) floors.set(floor, floors.get(floor) ?? []);

  return Array.from(floors.entries())
    .map(([value, floorApartments]) => ({
      value,
      label: floorLabel(value),
      apartments: floorApartments.slice().sort(naturalApartmentSort),
    }))
    .sort((a, b) => floorSortValue(a.value) - floorSortValue(b.value) || a.label.localeCompare(b.label));
}

function nextBlockName(blocks: ApartmentGridBlock[]) {
  const nextIndex = blocks.length + 1;
  if (nextIndex <= 26) return `Bloco ${String.fromCharCode(64 + nextIndex)}`;
  return `Bloco ${nextIndex}`;
}

function nextFloorValue(floors: FloorGroup[]) {
  const numericFloors = floors
    .map((floor) => floorSortValue(floor.value))
    .filter((floor) => floor !== 999);

  return String(Math.max(0, ...numericFloors) + 1);
}

function CreateBlockForm({
  blocks,
  condoId,
  disabled,
}: {
  blocks: ApartmentGridBlock[];
  condoId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(createBlockAction, initialStructureState);
  const suggestedName = nextBlockName(blocks);

  return (
    <form action={action} className="rounded-lg border bg-card p-5">
      <input type="hidden" name="condominium_id" value={condoId} />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
          <Plus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Adicionar bloco</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie outro bloco quando o condominio tiver mais de uma torre.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input name="name" defaultValue={suggestedName} disabled={disabled || pending} />
        <Button type="submit" disabled={disabled || pending}>
          Adicionar
        </Button>
      </div>
      {disabled ? (
        <p className="mt-3 text-sm text-muted-foreground">Limite de blocos do plano atingido.</p>
      ) : null}
      {state.status !== "idle" ? (
        <p className={`mt-3 text-sm font-medium ${state.status === "success" ? "text-success" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DeleteBlockButton({
  block,
  condoId,
}: {
  block: ApartmentGridBlock;
  condoId: string;
}) {
  return (
    <DeleteConfirmation
      action={deleteBlockAction}
      fields={{
        condominium_id: condoId,
        block_id: block.id,
      }}
      title={`Excluir ${block.name}?`}
      description={`Isso exclui o bloco ${block.name} e tambem remove os apartamentos vinculados a ele.`}
      triggerLabel="Excluir bloco"
    />
  );
}

function EditBlockForm({
  block,
  condoId,
}: {
  block: ApartmentGridBlock;
  condoId: string;
}) {
  const [state, action, pending] = useActionState(updateBlockAction, initialStructureState);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="condominium_id" value={condoId} />
      <input type="hidden" name="block_id" value={block.id} />
      <Input name="name" defaultValue={block.name} disabled={pending} />
      <Button type="submit" variant="outline" disabled={pending}>
        Salvar bloco
      </Button>
      {state.status !== "idle" ? (
        <p className={`text-sm font-medium sm:col-span-2 ${state.status === "success" ? "text-success" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function AddApartmentForm({
  blockId,
  condoId,
  disabled,
  floor,
}: {
  blockId: string;
  condoId: string;
  disabled: boolean;
  floor: FloorGroup;
}) {
  const [state, action, pending] = useActionState(createApartmentAction, initialStructureState);

  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="condominium_id" value={condoId} />
      <input type="hidden" name="block_id" value={blockId} />
      <input type="hidden" name="floor" value={floor.value} />
      <Input name="number" placeholder="Numero do apartamento" disabled={disabled || pending} />
      <Button type="submit" variant="outline" disabled={disabled || pending}>
        <Plus className="h-4 w-4" />
        Apartamento
      </Button>
      {disabled ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Limite de apartamentos do plano atingido.
        </p>
      ) : null}
      {state.status !== "idle" ? (
        <p className={`text-sm font-medium sm:col-span-2 ${state.status === "success" ? "text-success" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DeleteFloorButton({
  blockId,
  condoId,
  floor,
}: {
  blockId: string;
  condoId: string;
  floor: FloorGroup;
}) {
  return (
    <DeleteConfirmation
      action={deleteFloorAction}
      fields={{
        condominium_id: condoId,
        block_id: blockId,
        floor: floor.value,
      }}
      title={`Excluir ${floor.label}?`}
      description={`Isso remove todos os apartamentos do ${floor.label}. Convites e historicos podem perder a referencia dessas unidades.`}
      triggerLabel="Excluir andar"
    />
  );
}

function InviteApartmentForm({
  apartment,
  condoId,
}: {
  apartment: ApartmentGridApartment;
  condoId: string;
}) {
  const [state, formAction, pending] = useActionState(createResidentInviteAction, initialInviteState);
  const [copied, setCopied] = useState(false);

  return (
    <form action={formAction} className="rounded-lg border bg-muted p-4">
      <input type="hidden" name="condominium_id" value={condoId} />
      <input type="hidden" name="invite_type" value="resident" />
      <input type="hidden" name="apartment_id" value={apartment.id} />
      <div className="flex items-start gap-3">
        <Link2 className="mt-1 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Convite para o apartamento {apartment.number}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O link fica preso a esta unidade e o cadastro entra para aprovacao.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor={`invite-email-${apartment.id}`}>E-mail opcional</Label>
          <Input id={`invite-email-${apartment.id}`} name="email" type="email" placeholder="morador@email.com" />
        </div>
        <Button type="submit" className="self-end" disabled={pending}>
          Gerar link
        </Button>
      </div>
      {state.status === "error" ? (
        <p className="mt-3 text-sm font-medium text-destructive">{state.message}</p>
      ) : null}
      {state.inviteUrl ? (
        <div className="mt-4 rounded-lg border bg-card p-3">
          <p className="break-all text-sm text-muted-foreground">{state.inviteUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(state.inviteUrl ?? "");
              setCopied(true);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function ApartmentDetail({
  apartment,
  canPrivateNotes,
  canViewContacts,
  condoId,
}: {
  apartment: ApartmentGridApartment;
  canPrivateNotes: boolean;
  canViewContacts: boolean;
  condoId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(updateApartmentAction, initialStructureState);
  const activeMemberships = apartment.memberships.filter((membership) => membership.status === "active");
  const pendingMemberships = apartment.memberships.filter((membership) => membership.status === "pending");
  const primaryResident = activeMemberships[0] ?? pendingMemberships[0] ?? null;
  const canShowPrimaryPhone =
    Boolean(primaryResident) &&
    canViewContacts &&
    primaryResident?.privacy_settings?.allow_admin_contact !== false;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Apartamento</p>
            <h2 className="mt-1 text-3xl font-semibold">{apartment.number}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{floorLabel(apartment.floor)}</p>
          </div>
          <StatusBadge tone={apartmentStatus(apartment).tone}>
            {apartmentStatus(apartment).label}
          </StatusBadge>
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Responsavel</p>
          {primaryResident ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={primaryResident.role} />
                <StatusBadge tone={primaryResident.status === "active" ? "success" : "warning"}>
                  {primaryResident.status === "active" ? "Ativo" : "Pendente"}
                </StatusBadge>
              </div>
              <p className="mt-3 text-lg font-semibold">
                {canViewContacts ? primaryResident.profiles?.full_name ?? "Morador" : "Morador vinculado"}
              </p>
              <div className="mt-1 text-sm text-muted-foreground">
                <p>{canViewContacts ? primaryResident.profiles?.email ?? "E-mail nao informado" : "E-mail oculto"}</p>
                <p>
                  {canShowPrimaryPhone
                    ? primaryResident.profiles?.phone ?? "Telefone nao informado"
                    : "Telefone oculto"}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum responsavel cadastrado nesta unidade.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 font-semibold">{apartmentStatus(apartment).label}</p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Andar</p>
          <p className="mt-1 font-semibold">{floorLabel(apartment.floor)}</p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Cadastros</p>
          <p className="mt-1 font-semibold">
            {activeMemberships.length} ativo(s), {pendingMemberships.length} pendente(s)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Moradores vinculados</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Até 2 responsáveis por apartamento.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/app/${condoId}/convites?apartamento=${apartment.id}`}>
              Atribuir responsável
            </a>
          </Button>
        </div>
        {activeMemberships.length || pendingMemberships.length ? (
          [...activeMemberships, ...pendingMemberships].map((membership) => {
            const canShowPhone = canViewContacts && membership.privacy_settings?.allow_admin_contact !== false;
            return (
              <div key={membership.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={membership.role} />
                  <StatusBadge tone={membership.status === "active" ? "success" : "warning"}>
                    {membership.status === "active" ? "Ativo" : "Pendente"}
                  </StatusBadge>
                </div>
                <p className="mt-3 font-semibold">
                  {canViewContacts ? membership.profiles?.full_name ?? "Morador" : "Morador vinculado"}
                </p>
                {canViewContacts ? (
                  <div className="mt-1 text-sm text-muted-foreground">
                    <p>{membership.profiles?.email ?? "E-mail nao informado"}</p>
                    <p>
                      {canShowPhone
                        ? membership.profiles?.phone ?? "Telefone nao informado"
                        : "Telefone oculto pelo morador"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dados de contato dependem de permissao e consentimento.
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            Nenhum responsavel cadastrado nesta unidade.
          </p>
        )}
      </div>

      {canPrivateNotes && apartment.notes_private ? (
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold">Nota interna</p>
          <p className="mt-2 text-sm text-muted-foreground">{apartment.notes_private}</p>
        </div>
      ) : null}

      {editing ? (
        <form action={editAction} className="rounded-lg border bg-background p-4">
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="apartment_id" value={apartment.id} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Editar apartamento</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`apt-number-${apartment.id}`}>Numero</Label>
              <Input id={`apt-number-${apartment.id}`} name="number" defaultValue={apartment.number} disabled={editPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`apt-floor-${apartment.id}`}>Andar</Label>
              <Input id={`apt-floor-${apartment.id}`} name="floor" defaultValue={apartment.floor ?? "0"} disabled={editPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`apt-status-${apartment.id}`}>Status</Label>
              <select
                id={`apt-status-${apartment.id}`}
                name="status"
                defaultValue={apartment.status}
                disabled={editPending}
                className="h-11 w-full rounded-lg border bg-card px-3 text-sm"
              >
                <option value="vacant">Vago</option>
                <option value="occupied">Ocupado</option>
                <option value="reserved">Reservado</option>
                <option value="maintenance">Manutencao</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline" className="mt-3" disabled={editPending}>
            Salvar apartamento
          </Button>
          {editState.status !== "idle" ? (
            <p className={`mt-3 text-sm font-medium ${editState.status === "success" ? "text-success" : "text-destructive"}`}>
              {editState.message}
            </p>
          ) : null}
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          <Edit3 className="h-4 w-4" />
          Editar apartamento
        </Button>
      )}

      <DeleteConfirmation
        action={deleteApartmentAction}
        fields={{
          condominium_id: condoId,
          apartment_id: apartment.id,
        }}
        title={`Excluir apartamento ${apartment.number}?`}
        description="Isso remove a unidade da grade. Vinculos e historicos podem perder a referencia deste apartamento."
        triggerLabel="Excluir apartamento"
      />

      <InviteApartmentForm apartment={apartment} condoId={condoId} />
    </div>
  );
}

export function ApartmentGrid({
  blocks,
  canPrivateNotes,
  canViewContacts,
  condoId,
  limits,
  usage,
}: {
  blocks: ApartmentGridBlock[];
  canPrivateNotes: boolean;
  canViewContacts: boolean;
  condoId: string;
  limits: {
    blocks: number;
    totalApartments: number;
  };
  usage: {
    blocks: number;
    apartments: number;
  };
}) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [extraFloorsByBlock, setExtraFloorsByBlock] = useState<Record<string, string[]>>({});

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const selectedApartment =
    selectedBlock?.apartments.find((apartment) => apartment.id === selectedApartmentId) ??
    selectedBlock?.apartments[0] ??
    null;

  const selectedFloors = useMemo(() => {
    const blockId = selectedBlock?.id;
    return buildFloorGroups(
      selectedBlock?.apartments ?? [],
      blockId ? extraFloorsByBlock[blockId] ?? [] : [],
    );
  }, [extraFloorsByBlock, selectedBlock]);

  const canAddBlock = !limits.blocks || usage.blocks < limits.blocks;
  const canAddApartment = !limits.totalApartments || usage.apartments < limits.totalApartments;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {blocks.map((block) => {
          const occupied = block.apartments.filter((apartment) =>
            apartment.memberships.some((membership) => membership.status === "active"),
          ).length;
          const total = block.apartments.length;
          const percent = total ? Math.round((occupied / total) * 100) : 0;

          return (
            <div
              key={block.id}
              className="group rounded-lg border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10"
            >
              <button
                type="button"
                className="block w-full cursor-pointer text-left"
                onClick={() => {
                  setSelectedBlockId(block.id);
                  setSelectedApartmentId(null);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <StatusBadge tone={occupied === total && total > 0 ? "success" : "neutral"}>
                    {occupied}/{total}
                  </StatusBadge>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{block.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {occupied} de {total} apartamentos com responsavel ativo
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </button>
              <div className="mt-4">
                <DeleteBlockButton block={block} condoId={condoId} />
              </div>
            </div>
          );
        })}
        <CreateBlockForm blocks={blocks} condoId={condoId} disabled={!canAddBlock} />
      </div>

      <Dialog
        open={Boolean(selectedBlock)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBlockId(null);
            setSelectedApartmentId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          {selectedBlock ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBlock.name}</DialogTitle>
                <DialogDescription>
                  Grade de apartamentos por andar, com detalhe de responsavel e convite rapido.
                </DialogDescription>
              </DialogHeader>
              <EditBlockForm block={selectedBlock} condoId={condoId} />

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  {selectedFloors.map((floor) => {
                    return (
                      <section key={floor.value} className="rounded-lg border bg-background p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-primary" />
                          <h3 className="flex-1 text-sm font-semibold">{floor.label}</h3>
                          {floor.apartments.length ? (
                            <div className="[&_button]:min-h-9 [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs">
                              <DeleteFloorButton
                                blockId={selectedBlock.id}
                                condoId={condoId}
                                floor={floor}
                              />
                            </div>
                          ) : null}
                        </div>
                        {floor.apartments.length ? (
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                            {floor.apartments.map((apartment) => {
                              const status = apartmentStatus(apartment);
                              const selected = apartment.id === selectedApartment?.id;
                              return (
                                <button
                                  key={apartment.id}
                                  type="button"
                                  className={`h-14 rounded-lg border text-sm font-semibold transition ${
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : status.tone === "success"
                                        ? "border-success/30 bg-success/10 text-success hover:border-success/50"
                                        : "bg-card hover:border-primary/50 hover:bg-muted"
                                  }`}
                                  onClick={() => setSelectedApartmentId(apartment.id)}
                                >
                                  {apartment.number}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-lg border border-dashed bg-muted p-3 text-sm text-muted-foreground">
                            Nenhum apartamento neste andar.
                          </p>
                        )}
                        <AddApartmentForm
                          blockId={selectedBlock.id}
                          condoId={condoId}
                          disabled={!canAddApartment}
                          floor={floor}
                        />
                      </section>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const nextFloor = nextFloorValue(selectedFloors);
                      setExtraFloorsByBlock((current) => ({
                        ...current,
                        [selectedBlock.id]: [...(current[selectedBlock.id] ?? []), nextFloor],
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar andar
                  </Button>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Detalhes da unidade</p>
                      <h3 className="text-xl font-semibold">{selectedApartment ? "Resumo" : "Selecione"}</h3>
                    </div>
                  </div>
                  {selectedApartment ? (
                    <ApartmentDetail
                      apartment={selectedApartment}
                      canPrivateNotes={canPrivateNotes}
                      canViewContacts={canViewContacts}
                      condoId={condoId}
                    />
                  ) : (
                    <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                      Clique em um apartamento para ver responsavel, contatos permitidos e gerar convite.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
