"use client";

import { Check, Copy, Edit3, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { announcementTemplates } from "@/lib/product-content";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
  type ModuleActionState,
} from "@/lib/actions/core-modules";

type ApartmentChoice = {
  id: string;
  number: string;
  blocks?: { name: string | null } | null;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_ids: string[] | null;
  urgent: boolean;
  pinned: boolean;
  created_at: string;
  updated_at?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  announcement_reads?: { user_id: string | null; read_at: string | null }[];
};

const initialState: ModuleActionState = { status: "idle" };

function dateInputValue(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatDate(value?: string | null) {
  if (!value) return "Indeterminado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getAnnouncementStatus(item: AnnouncementItem) {
  const now = Date.now();
  const startsAt = item.starts_at ? new Date(item.starts_at).getTime() : new Date(item.created_at).getTime();
  const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : null;
  if (startsAt > now) return { label: "Agendado", tone: "warning" as const };
  if (expiresAt && expiresAt < now) return { label: "Encerrado", tone: "neutral" as const };
  return { label: "Ativo", tone: "success" as const };
}

function targetLabel(item: AnnouncementItem, apartments: ApartmentChoice[]) {
  if (item.target_type === "all") return "Todos";
  if (item.target_type === "apartment") {
    const ids = new Set(item.target_ids ?? []);
    const labels = apartments
      .filter((apartment) => ids.has(apartment.id))
      .map((apartment) => `${apartment.blocks?.name ?? "Bloco"} - ${apartment.number}`);
    return labels.length ? labels.join(", ") : "Apartamentos";
  }
  return item.target_type;
}

function Message({ state }: { state: ModuleActionState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`rounded-lg border p-3 text-sm font-medium ${
        state.status === "success"
          ? "border-green-200 bg-green-50 text-success"
          : "border-red-200 bg-red-50 text-destructive"
      }`}
    >
      {state.message}
    </div>
  );
}

function apartmentLabel(apartment: ApartmentChoice) {
  return `${apartment.blocks?.name ?? "Bloco"} - Apto ${apartment.number}`;
}

function ApartmentChooser({
  apartments,
  selectedApartments,
  onChange,
}: {
  apartments: ApartmentChoice[];
  selectedApartments: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = apartments
    .filter((apartment) => selectedApartments.includes(apartment.id))
    .map(apartmentLabel);

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Destinatários</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedLabels.length ? selectedLabels.join(", ") : "Nenhum apartamento selecionado."}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Search className="h-4 w-4" />
          Selecionar
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Escolher apartamentos</DialogTitle>
            <DialogDescription>Selecione um ou vários apartamentos para receber este aviso.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
            {apartments.map((apartment) => {
              const checked = selectedApartments.includes(apartment.id);
              return (
                <label
                  key={apartment.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onChange(
                        checked
                          ? selectedApartments.filter((id) => id !== apartment.id)
                          : [...selectedApartments, apartment.id],
                      );
                    }}
                    className="accent-[#7C5C3E]"
                  />
                  <span className="font-semibold">Apartamento {apartment.number}</span>
                  <span className="text-sm text-muted-foreground">{apartment.blocks?.name ?? "Bloco"}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setOpen(false)}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementFields({
  condoId,
  apartments,
  item,
}: {
  condoId: string;
  apartments: ApartmentChoice[];
  item?: AnnouncementItem;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [targetType, setTargetType] = useState<"all" | "apartment">(item?.target_type === "apartment" ? "apartment" : "all");
  const [selectedApartments, setSelectedApartments] = useState<string[]>(item?.target_ids ?? []);
  const [durationPreset, setDurationPreset] = useState<"1" | "3" | "7" | "custom" | "indefinite">(
    item ? (item.expires_at ? "custom" : "indefinite") : "3",
  );
  const [startsOn, setStartsOn] = useState(dateInputValue(item?.starts_at ?? item?.created_at) || new Date().toLocaleDateString("en-CA"));
  const [endsOn, setEndsOn] = useState(dateInputValue(item?.expires_at));

  const preview = useMemo(() => [`${title || "Título do aviso"}`, "", body || "Mensagem do aviso"].join("\n"), [title, body]);

  return (
    <>
      <input type="hidden" name="condominium_id" value={condoId} />
      {item ? <input type="hidden" name="announcement_id" value={item.id} /> : null}
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_ids" value={JSON.stringify(selectedApartments)} />
      <input type="hidden" name="duration_preset" value={durationPreset} />
      <div className="grid gap-2 sm:grid-cols-3">
        {announcementTemplates.slice(0, 6).map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => {
              setTitle(template.title);
              setBody(template.body);
            }}
            className="min-h-11 rounded-lg border bg-background px-3 py-2 text-left text-sm font-medium hover:bg-muted"
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <label className="space-y-2 text-sm font-medium">
          Título
          <Input name="title" required placeholder="Ex: Manutenção do elevador" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Destino
          <select
            value={targetType}
            onChange={(event) => {
              const nextValue = event.target.value === "apartment" ? "apartment" : "all";
              setTargetType(nextValue);
              if (nextValue === "all") setSelectedApartments([]);
            }}
            className="h-11 w-full rounded-lg border bg-card px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="apartment">Apartamentos específicos</option>
          </select>
        </label>
      </div>
      {targetType === "apartment" ? (
        <ApartmentChooser apartments={apartments} selectedApartments={selectedApartments} onChange={setSelectedApartments} />
      ) : null}
      <label className="space-y-2 text-sm font-medium">
        Mensagem
        <textarea
          name="body"
          required
          placeholder="Escreva o aviso com as informações principais."
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-36 w-full rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        />
      </label>
      <div className="grid gap-3 lg:grid-cols-[180px_220px_1fr]">
        <label className="space-y-2 text-sm font-medium">
          Começa em
          <Input name="starts_on" type="date" required value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Duração
          <select
            value={durationPreset}
            onChange={(event) => setDurationPreset(event.target.value as typeof durationPreset)}
            className="h-11 w-full rounded-lg border bg-card px-3 text-sm"
          >
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="7">1 semana</option>
            <option value="indefinite">Indeterminado</option>
            <option value="custom">Escolher data final</option>
          </select>
        </label>
        {durationPreset === "custom" ? (
          <label className="space-y-2 text-sm font-medium">
            Termina em
            <Input name="ends_on" type="date" required value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input name="urgent" type="checkbox" defaultChecked={item?.urgent ?? false} className="accent-[#7C5C3E]" /> Urgente
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="pinned" type="checkbox" defaultChecked={item?.pinned ?? false} className="accent-[#7C5C3E]" /> Fixado
        </label>
      </div>
      <div className="rounded-lg border bg-muted p-4">
        <p className="text-sm font-semibold">Prévia para copiar</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{preview}</pre>
      </div>
    </>
  );
}

function CreateAnnouncementForm({ condoId, apartments }: { condoId: string; apartments: ApartmentChoice[] }) {
  const [state, action, pending] = useActionState(createAnnouncementAction, initialState);

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-lg font-semibold">Criar aviso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina quem recebe e por quanto tempo o aviso ficará visível.
        </p>
      </div>
      <form action={action} className="mt-4 grid gap-4">
        <AnnouncementFields condoId={condoId} apartments={apartments} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Message state={state} />
          <Button type="submit" disabled={pending} className="sm:ml-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar aviso
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EditAnnouncementDialog({
  condoId,
  apartments,
  item,
  open,
  onOpenChange,
}: {
  condoId: string;
  apartments: ApartmentChoice[];
  item: AnnouncementItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(updateAnnouncementAction, initialState);

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar aviso</DialogTitle>
          <DialogDescription>Ajuste conteúdo, destino e período de exibição.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
          <AnnouncementFields condoId={condoId} apartments={apartments} item={item} />
          <Message state={state} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar aviso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AnnouncementManager({
  condoId,
  announcements,
  apartments,
  canCreate,
  canEdit,
  canDelete,
  canViewReads,
}: {
  condoId: string;
  announcements: AnnouncementItem[];
  apartments: ApartmentChoice[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewReads: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const editingItem = announcements.find((item) => item.id === editingId);

  return (
    <div className="space-y-6">
      {canCreate ? <CreateAnnouncementForm condoId={condoId} apartments={apartments} /> : null}
      {announcements.length ? (
        <div className="space-y-3">
          {announcements.map((item) => {
            const status = getAnnouncementStatus(item);
            const preview = `${item.title}\n\n${item.body}`;
            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      {item.urgent ? <StatusBadge tone="warning">Urgente</StatusBadge> : null}
                      {item.pinned ? <StatusBadge>Fixado</StatusBadge> : null}
                      <StatusBadge>{targetLabel(item, apartments)}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                      <span>De: {formatDate(item.starts_at ?? item.created_at)}</span>
                      <span>Até: {formatDate(item.expires_at)}</span>
                      {canViewReads ? <span>Leituras: {item.announcement_reads?.length ?? 0}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(preview);
                        setCopiedId(item.id);
                      }}
                    >
                      {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedId === item.id ? "Copiado" : "Copiar"}
                    </Button>
                    {canEdit || canDelete ? (
                      <>
                        {canEdit ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(item.id)}>
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => {
                              if (!confirm(`Excluir o aviso "${item.title}"? Ele sumirá para todos os moradores.`)) return;
                              const formData = new FormData();
                              formData.set("condominium_id", condoId);
                              formData.set("announcement_id", item.id);
                              startDeleting(async () => {
                                await deleteAnnouncementAction(formData);
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
      {editingItem ? (
        <EditAnnouncementDialog
          condoId={condoId}
          apartments={apartments}
          item={editingItem}
          open={Boolean(editingId)}
          onOpenChange={(open) => setEditingId(open ? editingItem.id : null)}
        />
      ) : null}
    </div>
  );
}
