"use client";

import { CalendarClock, CheckCircle2, Copy, Loader2, Send, Share2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  createCommunicationWizardDispatchAction,
  type CommunicationActionState,
} from "@/app/(app)/app/[condoId]/comunicacao/actions";
import { SafetyAlert } from "@/components/app/safety-alert";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CommunicationPriority } from "@/lib/communication-content";
import {
  dispatchMessageTypeLabels,
  dispatchPriorityLabels,
  generateGroupSafeVersion,
  isGroupChannel,
  suggestChannelsForMessage,
  type ChannelSuggestion,
  type DispatchChannelInput,
  type DispatchComposerMessageType,
  type DispatchTargetType,
} from "@/lib/communication-dispatch";
import { validateDispatchSafety as validateFullDispatchSafety } from "@/lib/communication/safety";

const initialState: CommunicationActionState = { status: "idle" };
const messageTypes = Object.keys(dispatchMessageTypeLabels) as DispatchComposerMessageType[];
const priorities = Object.keys(dispatchPriorityLabels) as CommunicationPriority[];
const targetTypes: Array<{ value: DispatchTargetType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "block", label: "Bloco específico" },
  { value: "apartment", label: "Apartamento específico" },
  { value: "role", label: "Papel específico" },
  { value: "channel", label: "Canal específico" },
];
const recommendationGroups: Array<{ key: ChannelSuggestion["recommendation"]; title: string; empty: string }> = [
  { key: "recommended", title: "Canais recomendados", empty: "Nenhum canal recomendado para esta combinação." },
  { key: "manual_only", title: "Envio manual assistido", empty: "Nenhum canal manual sugerido." },
  { key: "optional", title: "Canais opcionais", empty: "Nenhum canal opcional." },
  { key: "blocked", title: "Bloqueados por segurança", empty: "Nenhum canal bloqueado por segurança." },
  { key: "upgrade_required", title: "Exigem upgrade", empty: "Nenhum canal exige upgrade agora." },
];

function StepHeader({ step }: { step: number }) {
  const labels = ["Tipo", "Prioridade", "Destino", "Mensagem", "Canais", "Prévia", "Enviar"];
  return (
    <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
      {labels.map((label, index) => (
        <div
          key={label}
          className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold ${
            step === index + 1 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function ActionMessage({ state }: { state: CommunicationActionState }) {
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

function recommendationTone(recommendation: ChannelSuggestion["recommendation"]) {
  if (recommendation === "recommended") return "success";
  if (recommendation === "blocked") return "error";
  if (recommendation === "upgrade_required" || recommendation === "manual_only") return "warning";
  return "neutral";
}

function ChannelSuggestionCard({
  channel,
  selected,
  onToggle,
}: {
  channel: ChannelSuggestion;
  selected: boolean;
  onToggle: (channelId: string) => void;
}) {
  return (
    <label className="rounded-lg border bg-background p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={channel.type === "app" || selected}
          onChange={() => {
            if (channel.type !== "app") onToggle(channel.id);
          }}
          disabled={channel.type === "app" || !channel.compatible}
          className="mt-1 accent-[#7C5C3E]"
        />
        <div className="min-w-0">
          <p className="font-semibold">{channel.name}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{channel.reason}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone={recommendationTone(channel.recommendation)}>
          {channel.recommendation}
        </StatusBadge>
        <StatusBadge>{channel.mode}</StatusBadge>
        <StatusBadge>{channel.estimatedCredits} crédito(s)</StatusBadge>
        <StatusBadge tone={channel.safetyStatus === "blocked" ? "error" : "success"}>
          {channel.safetyStatus === "blocked" ? "segurança bloqueou" : "seguro"}
        </StatusBadge>
      </div>
      {channel.warnings.length ? (
        <p className="mt-3 text-sm leading-5 text-warning">{channel.warnings[0]}</p>
      ) : null}
    </label>
  );
}

export function CommunicationDispatchWizard({
  condoId,
  condominiumName,
  channels,
  templates,
  initialTemplateId,
  plan,
  whatsappRemaining,
  automaticOneToOne,
  officialGroups,
  manualGroups,
}: {
  condoId: string;
  condominiumName: string;
  channels: DispatchChannelInput[];
  templates: { id: string; name: string; title_template: string; body_template: string; message_type: string }[];
  initialTemplateId?: string;
  plan: string;
  whatsappRemaining: number;
  automaticOneToOne: boolean;
  officialGroups: boolean;
  manualGroups: boolean;
}) {
  const [state, action, pending] = useActionState(createCommunicationWizardDispatchAction, initialState);
  const initialTemplate = templates.find((item) => item.id === initialTemplateId);
  const [step, setStep] = useState(1);
  const [messageType, setMessageType] = useState<DispatchComposerMessageType>(
    initialTemplate?.message_type && initialTemplate.message_type in dispatchMessageTypeLabels
      ? (initialTemplate.message_type as DispatchComposerMessageType)
      : "announcement",
  );
  const [priority, setPriority] = useState<CommunicationPriority>("normal");
  const [targetType, setTargetType] = useState<DispatchTargetType>("all");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState(initialTemplate?.title_template ?? "");
  const [body, setBody] = useState(initialTemplate?.body_template ?? "");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [safeVersionUsed, setSafeVersionUsed] = useState(false);
  const input = useMemo(
    () => ({
      title,
      body,
      messageType,
      priority,
      targetType,
      targetId,
      plan,
      whatsappRemaining,
      automaticOneToOne,
      officialGroups,
      manualGroups,
    }),
    [automaticOneToOne, body, manualGroups, messageType, officialGroups, plan, priority, targetId, targetType, title, whatsappRemaining],
  );
  const suggestions = useMemo(() => suggestChannelsForMessage(input, channels), [channels, input]);
  const selectedWithApp = useMemo(() => Array.from(new Set(["app-interno", ...selectedChannels])), [selectedChannels]);
  const safety = useMemo(
    () =>
      validateFullDispatchSafety({
        messageType,
        priority,
        targetType,
        targetId,
        title,
        body,
        channelIds: selectedWithApp,
        channels,
      }),
    [body, channels, messageType, priority, selectedWithApp, targetId, targetType, title],
  );
  const groupSafeVersion = generateGroupSafeVersion(input);
  const selectedCost = suggestions
    .filter((channel) => selectedChannels.includes(channel.id))
    .reduce((total, channel) => total + channel.costUnits, 0);
  const suggestionsByRecommendation = recommendationGroups.map((group) => ({
    ...group,
    channels: suggestions.filter((channel) => channel.recommendation === group.key),
  }));

  function toggleChannel(channelId: string) {
    setSelectedChannels((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId],
    );
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle(template.title_template);
    setBody(template.body_template);
    if (template.message_type in dispatchMessageTypeLabels) {
      setMessageType(template.message_type as DispatchComposerMessageType);
    }
  }

  async function copyMessage() {
    await navigator.clipboard?.writeText(`${title}\n\n${body}`);
  }

  async function shareManual() {
    const text = `${title}\n\n${body}\n\nMensagem enviada pelo Meus Condomínios - ${condominiumName}`;
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
    await navigator.clipboard?.writeText(text);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="condominium_id" value={condoId} />
      <input type="hidden" name="message_type" value={messageType} />
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="scheduled_at" value={scheduledAt} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="safe_version_used" value={safeVersionUsed ? "true" : "false"} />
      {selectedChannels.map((channelId) => (
        <input key={channelId} type="hidden" name="channel_ids" value={channelId} />
      ))}

      <StepHeader step={step} />
      <ActionMessage state={state} />
      {step >= 5 ? (
        <SafetyAlert
          safety={safety}
          onUseSafeVersion={() => {
            setBody(safety.safeGroupVersion);
            setSafeVersionUsed(true);
          }}
          onRemoveGroups={() => {
            const groupIds = new Set(channels.filter(isGroupChannel).map((channel) => channel.id));
            setSelectedChannels((current) => current.filter((channelId) => !groupIds.has(channelId)));
          }}
          onPrivateOnly={() => {
            setSelectedChannels((current) => {
              const privateIds = new Set(channels.filter((channel) => channel.type === "app" || !isGroupChannel(channel)).map((channel) => channel.id));
              return current.filter((channelId) => privateIds.has(channelId));
            });
          }}
        />
      ) : null}

      {step === 1 ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Tipo da mensagem</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {messageTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMessageType(type)}
                className={`min-h-14 rounded-lg border px-4 text-left text-sm font-semibold ${messageType === type ? "border-primary bg-muted text-primary" : "bg-card"}`}
              >
                {dispatchMessageTypeLabels[type]}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Prioridade</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {priorities.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPriority(item)}
                className={`min-h-16 rounded-lg border px-4 text-left text-sm font-semibold ${priority === item ? "border-primary bg-muted text-primary" : "bg-card"}`}
              >
                {dispatchPriorityLabels[item]}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Destino</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {targetTypes.map((target) => (
              <button
                key={target.value}
                type="button"
                onClick={() => setTargetType(target.value)}
                className={`min-h-14 rounded-lg border px-3 text-sm font-semibold ${targetType === target.value ? "border-primary bg-muted text-primary" : "bg-card"}`}
              >
                {target.label}
              </button>
            ))}
          </div>
          <Input className="mt-4" value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="ID do bloco, apartamento, papel ou canal quando necessário" />
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Mensagem</h2>
            <select onChange={(event) => applyTemplate(event.target.value)} className="h-11 rounded-lg border bg-card px-3 text-sm" defaultValue="">
              <option value="">Usar modelo pronto</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Corpo da mensagem"
              className="min-h-36 rounded-lg border bg-card px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
            />
            <Input placeholder="Anexos opcionais ficam disponíveis conforme plano" disabled />
          </div>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Canais sugeridos</h2>
            <StatusBadge>{selectedCost} crédito(s)</StatusBadge>
          </div>
          <div className="mt-4 space-y-5">
            {suggestionsByRecommendation.map((group) => (
              <section key={group.key} className="space-y-3">
                <div>
                  <h3 className="font-semibold">{group.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.channels.length ? `${group.channels.length} canal(is)` : group.empty}
                  </p>
                </div>
                {group.channels.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.channels.map((channel) => (
                      <ChannelSuggestionCard
                        key={channel.id}
                        channel={channel}
                        selected={selectedChannels.includes(channel.id)}
                        onToggle={toggleChannel}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-semibold">Prévia no app</h2>
            <p className="mt-4 text-sm font-semibold">{title || "Título do comunicado"}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body || "Mensagem..."}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">WhatsApp privado</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-6">{`${title}\n\n${body}`}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Versão segura para grupo</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-6">{groupSafeVersion}</p>
          </Card>
        </div>
      ) : null}

      {step === 7 ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Enviar ou agendar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Revise os canais selecionados. Envio em massa exige confirmação.
          </p>
          <label className="mt-4 flex min-h-12 items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <input name="confirmed" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
            <span>Confirmei que revisei a prévia, os canais e a segurança do conteúdo.</span>
          </label>
          <Input className="mt-3" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button name="intent" value="send" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar agora
            </Button>
            <Button name="intent" value="schedule" variant="outline" disabled={pending}>
              <CalendarClock className="h-4 w-4" />
              Agendar envio
            </Button>
            <Button name="intent" value="draft" variant="outline" disabled={pending}>
              <CheckCircle2 className="h-4 w-4" />
              Salvar rascunho
            </Button>
            <Button type="button" variant="outline" onClick={copyMessage}>
              <Copy className="h-4 w-4" />
              Copiar mensagem
            </Button>
            <Button type="button" variant="outline" onClick={shareManual}>
              <Share2 className="h-4 w-4" />
              Compartilhar manualmente
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => setStep(Math.max(1, step - 1))}>
          Voltar
        </Button>
        {step < 7 ? (
          <Button type="button" onClick={() => setStep(Math.min(7, step + 1))}>
            Continuar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
