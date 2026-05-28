"use client";

import { Check, Copy, Loader2, Plus, Search } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AttachmentUploadField } from "@/components/app/attachment-upload-field";
import { PackagePhotoUploadField } from "@/components/app/package-photo-upload-field";
import { announcementTemplates } from "@/lib/product-content";
import {
  createAnnouncementAction,
  createBookingAction,
  createCommonAreaAction,
  createIncidentAction,
  createPackageAction,
  createTicketAction,
  type ModuleActionState,
} from "@/lib/actions/core-modules";

const initialState: ModuleActionState = { status: "idle" };

function Message({ state }: { state: ModuleActionState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`mt-4 rounded-lg border p-3 text-sm font-medium ${
        state.status === "success"
          ? "border-green-200 bg-green-50 text-success"
          : "border-red-200 bg-red-50 text-destructive"
      }`}
    >
      {state.message}
    </div>
  );
}

function FormTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function SelectApartment({
  apartments,
  name = "apartment_id",
}: {
  apartments: { id: string; number: string; blocks?: { name: string | null } | null }[];
  name?: string;
}) {
  return (
    <select
      name={name}
      className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
    >
      <option value="">Apartamento</option>
      {apartments.map((apartment) => (
        <option key={apartment.id} value={apartment.id}>
          {apartment.blocks?.name ?? "Bloco"} - {apartment.number}
        </option>
      ))}
    </select>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {children}
    </Button>
  );
}

type ApartmentChoice = { id: string; number: string; blocks?: { name: string | null } | null };

function apartmentLabel(apartment: ApartmentChoice) {
  return `${apartment.blocks?.name ?? "Bloco"} - Apto ${apartment.number}`;
}

export function AnnouncementForm({
  condoId,
  apartments = [],
}: {
  condoId: string;
  apartments?: ApartmentChoice[];
}) {
  const [state, action, pending] = useActionState(createAnnouncementAction, initialState);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "apartment">("all");
  const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedLabels = apartments
    .filter((apartment) => selectedApartments.includes(apartment.id))
    .map(apartmentLabel);
  const preview = [`${title || "Titulo do aviso"}`, "", body || "Mensagem do aviso"].join("\n");

  return (
    <Card className="p-5">
      <FormTitle title="Criar aviso" description="Publique para todos ou escolha apartamentos especificos." />
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {announcementTemplates.slice(0, 9).map((template) => (
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
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_ids" value={JSON.stringify(selectedApartments)} />
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <Input name="title" placeholder="Titulo do aviso" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select
            value={targetType}
            onChange={(event) => {
              const nextValue = event.target.value === "apartment" ? "apartment" : "all";
              setTargetType(nextValue);
              if (nextValue === "all") setSelectedApartments([]);
            }}
            className="h-11 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="all">Enviar para todos</option>
            <option value="apartment">Escolher apartamentos</option>
          </select>
        </div>
        {targetType === "apartment" ? (
          <div className="rounded-lg border bg-background p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Destinatarios</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedLabels.length ? selectedLabels.join(", ") : "Nenhum apartamento selecionado."}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setChooserOpen(true)}>
                <Search className="h-4 w-4" />
                Selecionar
              </Button>
            </div>
          </div>
        ) : null}
        <textarea
          name="body"
          placeholder="Escreva a mensagem do aviso"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-36 rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input name="urgent" type="checkbox" className="accent-[#7C5C3E]" /> Urgente</label>
            <label className="flex items-center gap-2 text-sm"><input name="pinned" type="checkbox" className="accent-[#7C5C3E]" /> Fixado</label>
          </div>
          <SubmitButton pending={pending}>Publicar aviso</SubmitButton>
        </div>
      </form>
      <Message state={state} />
      {state.status === "success" ? (
        <div className="mt-4 rounded-lg border bg-muted p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Como ficou</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{preview}</pre>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(preview);
                setCopied(true);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}
      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Escolher apartamentos</DialogTitle>
            <DialogDescription>
              Selecione um ou varios apartamentos para receber este aviso.
            </DialogDescription>
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
                      setSelectedApartments((current) =>
                        checked
                          ? current.filter((id) => id !== apartment.id)
                          : [...current, apartment.id],
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
            <Button type="button" onClick={() => setChooserOpen(false)}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function CommonAreaForm({ condoId }: { condoId: string }) {
  const [state, action, pending] = useActionState(createCommonAreaAction, initialState);
  return (
    <Card className="p-5">
      <FormTitle title="Criar área comum" description="Cadastre o espaço, disponibilidade e regras que o morador deve aceitar antes de reservar." />
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-2 text-sm font-medium">
            Nome da área <span className="text-destructive">*</span>
            <Input name="name" required placeholder="Ex: Salão de festas" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Capacidade <span className="text-destructive">*</span>
            <Input name="capacity" type="number" min={1} required placeholder="Ex: 30" />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium">
          Descrição
          <textarea
            name="description"
            placeholder="Ex: Espaço com churrasqueira, mesas e pia."
            className="min-h-24 w-full rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Regras para o morador
          <textarea
            name="rules"
            placeholder="Ex: Entregar o espaço limpo, respeitar o horário e não ultrapassar a capacidade."
            className="min-h-28 w-full rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Horário inicial <span className="text-destructive">*</span>
            <Input name="available_start_time" type="time" defaultValue="08:00" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Horário final <span className="text-destructive">*</span>
            <Input name="available_end_time" type="time" defaultValue="22:00" />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">
            Duração mínima
            <Input name="min_duration_minutes" type="number" min={30} step={30} defaultValue={60} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Duração máxima
            <Input name="max_duration_minutes" type="number" min={30} step={30} defaultValue={240} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Antecedência mínima
            <Input name="min_notice_hours" type="number" min={0} defaultValue={24} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Limite mensal por apto.
            <Input name="max_bookings_per_apartment_month" type="number" min={1} defaultValue={4} />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium">
          Antecedência máxima em dias
          <Input name="max_notice_days" type="number" min={1} defaultValue={60} />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Dias disponíveis</p>
          <div className="grid gap-2 sm:grid-cols-4">
          {[
            ["0", "Dom"],
            ["1", "Seg"],
            ["2", "Ter"],
            ["3", "Qua"],
            ["4", "Qui"],
            ["5", "Sex"],
            ["6", "Sáb"],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
              <input name="available_days" type="checkbox" value={value} defaultChecked className="accent-[#7C5C3E]" />
              {label}
            </label>
          ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm"><input name="requires_approval" type="checkbox" className="accent-[#7C5C3E]" /> Exige aprovação da administração</label>
          <SubmitButton pending={pending}>Criar área</SubmitButton>
        </div>
      </form>
      <Message state={state} />
    </Card>
  );
}

export function BookingForm({
  condoId,
  areas,
  apartments,
}: {
  condoId: string;
  areas: { id: string; name: string }[];
  apartments: { id: string; number: string; blocks?: { name: string | null } | null }[];
}) {
  const [state, action, pending] = useActionState(createBookingAction, initialState);
  return (
    <Card className="p-5">
      <FormTitle title="Nova reserva" description="Escolha área, unidade e horário. Conflitos são bloqueados no backend." />
      <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="condominium_id" value={condoId} />
        <select name="common_area_id" className="h-11 rounded-lg border bg-card px-3 text-sm">
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
        <SelectApartment apartments={apartments} />
        <Input name="title" placeholder="Reserva" />
        <Input name="start_at" type="datetime-local" />
        <Input name="end_at" type="datetime-local" />
        <Input name="notes" placeholder="Observações" />
        <SubmitButton pending={pending}>Criar reserva</SubmitButton>
      </form>
      <Message state={state} />
    </Card>
  );
}

export function TicketForm({ condoId, apartments }: { condoId: string; apartments: { id: string; number: string; blocks?: { name: string | null } | null }[] }) {
  const [state, action, pending] = useActionState(createTicketAction, initialState);
  return (
    <Card className="p-5">
      <FormTitle title="Nova solicitação" description="Use para pedidos de morador: reclamação, manutenção, sugestão ou acompanhamento da administração." />
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className="grid gap-3 md:grid-cols-2">
          <select name="category" className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="reclamacao">Reclamação</option>
            <option value="manutencao">Manutenção</option>
            <option value="sugestao">Sugestão</option>
            <option value="barulho">Barulho</option>
            <option value="seguranca">Seguranca</option>
            <option value="limpeza">Limpeza</option>
            <option value="outros">Outros</option>
          </select>
          <SelectApartment apartments={apartments} />
          <Input name="title" placeholder="Título" />
          <select name="priority" className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
          </select>
        </div>
        <textarea
          name="description"
          placeholder="Descreva o que aconteceu, quando aconteceu e o que precisa ser feito."
          className="min-h-32 rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        <AttachmentUploadField condoId={condoId} folder="tickets" label="Anexos da solicitação" />
        <SubmitButton pending={pending}>Criar solicitação</SubmitButton>
      </form>
      <Message state={state} />
    </Card>
  );
}

export function PackageForm({ condoId, apartments }: { condoId: string; apartments: { id: string; number: string; blocks?: { name: string | null } | null }[] }) {
  const [state, action, pending] = useActionState(createPackageAction, initialState);
  return (
    <Card className="p-5">
      <FormTitle title="Registrar encomenda" description="Vincule a encomenda ao apartamento. Foto é opcional." />
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectApartment apartments={apartments} />
          <Input name="recipient_name" placeholder="Destinatario" />
        </div>
        <textarea
          name="description"
          placeholder="Descricao da encomenda"
          className="min-h-28 rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        <PackagePhotoUploadField condoId={condoId} />
        <SubmitButton pending={pending}>Registrar</SubmitButton>
      </form>
      <Message state={state} />
    </Card>
  );
}

export function IncidentForm({ condoId, apartments }: { condoId: string; apartments: { id: string; number: string; blocks?: { name: string | null } | null }[] }) {
  const [state, action, pending] = useActionState(createIncidentAction, initialState);
  return (
    <Card className="p-5">
      <FormTitle title="Nova ocorrência" description="Registro interno para administração, síndico ou guarita: segurança, dano, acesso indevido ou fato relevante." />
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="type" placeholder="Tipo. Ex: segurança, dano, barulho" />
          <SelectApartment apartments={apartments} />
          <Input name="title" placeholder="Título" />
          <select name="severity" className="h-11 rounded-lg border bg-card px-3 text-sm">
            <option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option>
          </select>
        </div>
        <textarea
          name="description"
          placeholder="Descreva a ocorrência com data, local, envolvidos e providências tomadas."
          className="min-h-32 rounded-lg border bg-card px-3 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        <AttachmentUploadField condoId={condoId} folder="incidents" label="Anexos da ocorrência" />
        <SubmitButton pending={pending}>Registrar ocorrência</SubmitButton>
      </form>
      <Message state={state} />
    </Card>
  );
}
