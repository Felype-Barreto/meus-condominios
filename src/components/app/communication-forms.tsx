"use client";

import { CopyPlus, Edit3, Loader2, Megaphone, Play, Plus, Save, Send } from "lucide-react";
import type React from "react";
import { useActionState, useState } from "react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCommunicationComposer } from "@/hooks/useCommunicationComposer";
import {
  communicationChannelTypeLabels,
  communicationMessageTypeLabels,
  communicationScopeLabels,
  type CommunicationChannelType,
  type CommunicationMessageType,
  type CommunicationScope,
} from "@/lib/communication-content";
import {
  createCommunicationChannelAction,
  createCommunicationDispatchAction,
  createCommunicationTemplateAction,
  duplicateCommunicationTemplateAction,
  testCommunicationChannelAction,
  toggleCommunicationChannelAction,
  toggleCommunicationTemplateAction,
  updateCommunicationChannelAction,
  type CommunicationActionState,
} from "@/app/(app)/app/[condoId]/comunicacao/actions";

const initialState: CommunicationActionState = { status: "idle" };
const messageTypes = Object.keys(communicationMessageTypeLabels) as CommunicationMessageType[];
const channelTypes = Object.keys(communicationChannelTypeLabels) as CommunicationChannelType[];
const scopes = Object.keys(communicationScopeLabels) as CommunicationScope[];

function Message({ state }: { state: CommunicationActionState }) {
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

function FieldSelect({
  name,
  children,
  defaultValue,
  onChange,
}: {
  name: string;
  children: React.ReactNode;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={onChange}
      className="h-12 w-full rounded-lg border bg-card px-3.5 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:h-11 md:text-sm"
    >
      {children}
    </select>
  );
}

export function CommunicationDispatchForm({
  condoId,
  channels,
}: {
  condoId: string;
  channels: { id: string; name: string; type: string; scope: string; status: string }[];
}) {
  const [state, action, pending] = useActionState(createCommunicationDispatchAction, initialState);
  const composer = useCommunicationComposer();

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-muted p-3 text-primary ring-1 ring-border">
          <Send className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Novo comunicado</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escreva uma vez, escolha os canais e confirme antes de publicar. O app Meus Condomínios é sempre incluído.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 grid gap-3">
        <input type="hidden" name="condominium_id" value={condoId} />
        <Input name="title" placeholder="Título do comunicado" />
        <textarea
          name="body"
          placeholder="Mensagem"
          className="min-h-32 rounded-lg border bg-card px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <FieldSelect name="priority" defaultValue={composer.priority}>
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="important">Importante</option>
            <option value="urgent">Urgente</option>
          </FieldSelect>
          <FieldSelect name="message_type" defaultValue="announcement">
            {messageTypes.map((type) => (
              <option key={type} value={type}>
                {communicationMessageTypeLabels[type]}
              </option>
            ))}
          </FieldSelect>
          <FieldSelect name="target_type" defaultValue="all">
            <option value="all">Todos</option>
            <option value="block">Bloco</option>
            <option value="apartment">Apartamento</option>
            <option value="role">Papel</option>
            <option value="channel">Canal</option>
          </FieldSelect>
        </div>
        <Input name="target_id" placeholder="ID do alvo, se necessário" />
        <Input name="scheduled_at" type="datetime-local" />

        <div>
          <p className="text-sm font-semibold">Canais</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <label key={channel.id} className="flex min-h-12 items-start gap-3 rounded-lg border bg-background p-3 text-sm">
                <input
                  type="checkbox"
                  name="channel_ids"
                  value={channel.id}
                  checked={composer.selectedChannels.includes(channel.id)}
                  onChange={() => composer.toggleChannel(channel.id)}
                  className="mt-1 accent-[#7C5C3E]"
                />
                <span>
                  <span className="block font-semibold">{channel.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {channel.type} · {channel.scope} · {channel.status}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex min-h-12 items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <input name="confirmed" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
          <span>
            Confirmei que a mensagem não contém dados sensíveis para grupos e que uma comunicação em massa deve ser enviada.
          </span>
        </label>

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Publicar nos canais
        </Button>
      </form>
      <Message state={state} />
    </Card>
  );
}

export function CommunicationChannelForm({
  condoId,
  blocks,
}: {
  condoId: string;
  blocks: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createCommunicationChannelAction, initialState);
  const [step, setStep] = useState(1);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Adicionar canal</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Configure em etapas. Canais de grupo não podem receber mensagens privadas.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {["Dados", "Alvo", "Mensagens"].map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index + 1)}
            className={`min-h-11 rounded-lg border px-3 font-semibold ${step === index + 1 ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className={step === 1 ? "grid gap-3 md:col-span-2 md:grid-cols-2" : "hidden"}>
          <Input name="name" placeholder="Grupo Geral, Bloco A, Portaria..." />
          <FieldSelect name="type" defaultValue="whatsapp_manual">
            {channelTypes.map((type) => (
              <option key={type} value={type}>{communicationChannelTypeLabels[type]}</option>
            ))}
          </FieldSelect>
          <FieldSelect name="mode" defaultValue="manual">
            <option value="">Automático pelo tipo</option>
            <option value="manual">Manual</option>
            <option value="official">Oficial</option>
          </FieldSelect>
          <FieldSelect name="plan_required" defaultValue="free">
            <option value="free">Grátis</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="total">Total</option>
          </FieldSelect>
        </div>

        <div className={step === 2 ? "grid gap-3 md:col-span-2 md:grid-cols-2" : "hidden"}>
          <FieldSelect name="scope" defaultValue="all">
            {scopes.map((scope) => (
              <option key={scope} value={scope}>{communicationScopeLabels[scope]}</option>
            ))}
          </FieldSelect>
          <FieldSelect name="block_id">
            <option value="">Sem bloco vinculado</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>{block.name}</option>
            ))}
          </FieldSelect>
          <Input name="role" placeholder="Papel, se aplicável" />
        </div>

        <div className={step === 3 ? "md:col-span-2" : "hidden"}>
          <p className="text-sm font-semibold">Tipos permitidos</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Para grupos, mantenha desmarcado encomenda e agendamento individual.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {messageTypes.map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
                <input
                  name="allowed_message_types"
                  type="checkbox"
                  value={type}
                  defaultChecked={!["package", "booking"].includes(type)}
                  className="accent-[#7C5C3E]"
                />
                {communicationMessageTypeLabels[type]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => setStep(Math.max(1, step - 1))}>
            Voltar
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep(Math.min(3, step + 1))}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar canal
            </Button>
          )}
        </div>
      </form>
      <Message state={state} />
    </Card>
  );
}

export type CommunicationChannelCardData = {
  id: string;
  name: string;
  type: CommunicationChannelType;
  scope: CommunicationScope;
  status: string;
  plan_required: string;
  role: string | null;
  block_id: string | null;
  allowed_message_types: CommunicationMessageType[];
  block_name?: string | null;
  last_status?: string | null;
  last_sent_at?: string | null;
  last_error?: string | null;
};

export function CommunicationChannelCard({
  condoId,
  channel,
  blocks,
}: {
  condoId: string;
  channel: CommunicationChannelCardData;
  blocks: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateCommunicationChannelAction, initialState);
  const isInactive = channel.status === "inactive";
  const isVirtual = channel.id === "app-obrigatorio";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{channel.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {communicationChannelTypeLabels[channel.type]} · {communicationScopeLabels[channel.scope]}
            {channel.block_name ? ` · ${channel.block_name}` : ""}
          </p>
        </div>
        <StatusBadge tone={channel.status === "active" ? "success" : channel.status === "inactive" ? "neutral" : "warning"}>
          {channel.status}
        </StatusBadge>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-3">
          <span className="text-muted-foreground">Plano mínimo</span>
          <strong className="block">{channel.plan_required}</strong>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <span className="text-muted-foreground">Último envio</span>
          <strong className="block">{channel.last_status ?? "sem envio"}</strong>
        </div>
      </div>

      {channel.last_error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-destructive">
          {channel.last_error}
        </p>
      ) : null}

      {!isVirtual ? (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing((value) => !value)}>
          <Edit3 className="h-4 w-4" />
          Editar
        </Button>
        <form action={toggleCommunicationChannelAction}>
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="channel_id" value={channel.id} />
          <input type="hidden" name="status" value={isInactive ? (channel.type === "whatsapp_manual" ? "manual_only" : "active") : "inactive"} />
          <Button size="sm" variant="outline">{isInactive ? "Ativar" : "Desativar"}</Button>
        </form>
        <form action={testCommunicationChannelAction}>
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="channel_id" value={channel.id} />
          <Button size="sm" variant="outline">
            <Play className="h-4 w-4" />
            Testar
          </Button>
        </form>
      </div>
      ) : (
        <p className="mt-4 rounded-lg border bg-background p-3 text-sm text-muted-foreground">
          Canal interno obrigatório. Ele é incluído automaticamente nos disparos.
        </p>
      )}

      {editing && !isVirtual ? (
        <form action={action} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="channel_id" value={channel.id} />
          <Input name="name" defaultValue={channel.name} />
          <FieldSelect name="type" defaultValue={channel.type}>
            {channelTypes.map((type) => (
              <option key={type} value={type}>{communicationChannelTypeLabels[type]}</option>
            ))}
          </FieldSelect>
          <FieldSelect name="mode" defaultValue={channel.type === "whatsapp_official" ? "official" : "manual"}>
            <option value="">Automático pelo tipo</option>
            <option value="manual">Manual</option>
            <option value="official">Oficial</option>
          </FieldSelect>
          <FieldSelect name="scope" defaultValue={channel.scope}>
            {scopes.map((scope) => (
              <option key={scope} value={scope}>{communicationScopeLabels[scope]}</option>
            ))}
          </FieldSelect>
          <FieldSelect name="block_id" defaultValue={channel.block_id ?? ""}>
            <option value="">Sem bloco vinculado</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>{block.name}</option>
            ))}
          </FieldSelect>
          <Input name="role" defaultValue={channel.role ?? ""} placeholder="Papel" />
          <FieldSelect name="status" defaultValue={channel.status}>
            <option value="active">active</option>
            <option value="manual_only">manual_only</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
            <option value="inactive">inactive</option>
          </FieldSelect>
          <FieldSelect name="plan_required" defaultValue={channel.plan_required}>
            <option value="free">Grátis</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="total">Total</option>
          </FieldSelect>
          <div className="grid gap-2 md:col-span-2 sm:grid-cols-2">
            {messageTypes.map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
                <input
                  name="allowed_message_types"
                  type="checkbox"
                  value={type}
                  defaultChecked={channel.allowed_message_types.includes(type)}
                  className="accent-[#7C5C3E]"
                />
                {communicationMessageTypeLabels[type]}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar canal
          </Button>
          <Message state={state} />
        </form>
      ) : null}
    </Card>
  );
}

export function CommunicationTemplateForm({ condoId }: { condoId: string }) {
  const [state, action, pending] = useActionState(createCommunicationTemplateAction, initialState);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Criar modelo</h2>
      <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="condominium_id" value={condoId} />
        <Input name="name" placeholder="Nome do modelo" />
        <Input name="category" placeholder="Categoria" />
        <Input name="title_template" placeholder="Título" />
        <FieldSelect name="message_type" defaultValue="announcement">
          {messageTypes.map((type) => (
            <option key={type} value={type}>{communicationMessageTypeLabels[type]}</option>
          ))}
        </FieldSelect>
        <textarea
          name="body_template"
          placeholder="Mensagem"
          className="min-h-28 rounded-lg border bg-card px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:col-span-2 md:text-sm"
        />
        <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
          <input name="safe_for_groups" type="checkbox" className="accent-[#7C5C3E]" />
          Seguro para grupos
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
          <input name="requires_private_channel" type="checkbox" className="accent-[#7C5C3E]" />
          Exige canal privado
        </label>
        <FieldSelect name="suggested_priority" defaultValue="normal">
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="important">Importante</option>
          <option value="urgent">Urgente</option>
        </FieldSelect>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Salvar modelo
        </Button>
      </form>
      <Message state={state} />
    </Card>
  );
}

export type CommunicationTemplateCardData = {
  id: string;
  name: string;
  category: string;
  title_template: string;
  body_template: string;
  message_type: string;
  safe_for_groups: boolean;
  requires_private_channel: boolean;
  suggested_priority: string;
  suggested_channels: string[];
  variables: string[];
  preview_example: string | null;
  active: boolean;
  condominium_id: string | null;
};

export function CommunicationTemplateCard({
  condoId,
  template,
}: {
  condoId: string;
  template: CommunicationTemplateCardData;
}) {
  const isCustom = Boolean(template.condominium_id);

  return (
    <Card className={`p-5 ${!template.active ? "opacity-65" : ""}`}>
      <div className="flex flex-wrap gap-2">
        <StatusBadge>{template.category}</StatusBadge>
        <StatusBadge>{template.message_type}</StatusBadge>
        {template.safe_for_groups ? <StatusBadge tone="success">Seguro para grupos</StatusBadge> : null}
        {template.requires_private_channel ? <StatusBadge tone="warning">Privado</StatusBadge> : null}
        {template.suggested_channels.some((channel) => channel.includes("whatsapp")) ? (
          <StatusBadge>Recomendado para WhatsApp</StatusBadge>
        ) : null}
      </div>
      <h2 className="mt-4 text-lg font-semibold">{template.name}</h2>
      <p className="mt-2 text-sm font-medium">{template.title_template}</p>
      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{template.body_template}</p>
      <div className="mt-4 rounded-lg border bg-background p-3">
        <p className="text-xs font-semibold text-muted-foreground">Prévia</p>
        <p className="mt-1 text-sm leading-6">{template.preview_example ?? template.body_template}</p>
      </div>
      {template.variables.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Variáveis: {template.variables.join(", ")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={`/app/${condoId}/comunicacao/disparos/novo?template=${template.id}`}>Usar modelo</a>
        </Button>
        <form action={duplicateCommunicationTemplateAction}>
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="template_id" value={template.id} />
          <Button size="sm" variant="outline">
            <CopyPlus className="h-4 w-4" />
            Duplicar
          </Button>
        </form>
        {isCustom ? (
          <form action={toggleCommunicationTemplateAction}>
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="template_id" value={template.id} />
            <input type="hidden" name="active" value={template.active ? "false" : "true"} />
            <Button size="sm" variant="outline">
              {template.active ? "Desativar" : "Ativar"}
            </Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
