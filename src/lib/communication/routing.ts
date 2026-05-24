import type {
  CommunicationChannelType,
  CommunicationMessageType,
  CommunicationPriority,
  CommunicationScope,
} from "@/lib/communication-content";
import {
  isGroupCommunicationChannel,
  validateDispatchSafety,
} from "@/lib/communication/safety";

export type CommunicationRoutingMessageType = CommunicationMessageType | "ticket" | "visitor" | "gate";
export type CommunicationRoutingTargetType = "all" | "block" | "apartment" | "role" | "channel";

export type CommunicationRoutingChannel = {
  id: string;
  name: string;
  type: CommunicationChannelType;
  scope: CommunicationScope;
  status: string;
  plan_required: string;
  block_id: string | null;
  role: string | null;
  allowed_message_types: string[];
};

export type ChannelRecommendation =
  | "recommended"
  | "optional"
  | "blocked"
  | "upgrade_required"
  | "manual_only";

export type ChannelSafetyStatus = "safe" | "warning" | "blocked";

export type ChannelRoutingSuggestion = CommunicationRoutingChannel & {
  channelId: string;
  recommendation: ChannelRecommendation;
  reason: string;
  estimatedCredits: number;
  safetyStatus: ChannelSafetyStatus;
  safetyReasons: string[];
  mode: "manual" | "automatic" | "internal";
  recommended: boolean;
  compatible: boolean;
  costUnits: number;
  warnings: string[];
};

export type SuggestChannelsInput = {
  condoId: string;
  messageType: CommunicationRoutingMessageType;
  priority: CommunicationPriority;
  targetType: CommunicationRoutingTargetType;
  targetIds?: string[];
  blockId?: string;
  apartmentId?: string;
  role?: string;
  containsSensitiveData?: boolean;
  title?: string;
  body?: string;
  channelIds?: string[];
  channels?: CommunicationRoutingChannel[];
  plan?: string;
  whatsappRemaining?: number;
  automaticOneToOne?: boolean;
  officialGroups?: boolean;
  manualGroups?: boolean;
  hasPrivateWhatsAppOptIn?: boolean;
};

const groupSafeTypes = new Set<CommunicationRoutingMessageType>([
  "announcement",
  "maintenance",
  "meeting",
  "security",
  "summary",
]);

const privateOnlyTypes = new Set<CommunicationRoutingMessageType>([
  "package",
  "booking",
  "ticket",
  "visitor",
]);

const portariaTypes = new Set<CommunicationRoutingMessageType>(["gate", "package", "visitor", "security"]);
const councilTypes = new Set<CommunicationRoutingMessageType>(["announcement", "meeting", "summary", "other"]);
const staffRoles = new Set(["staff", "council", "doorman", "gate"]);

function storedType(type: CommunicationRoutingMessageType): CommunicationMessageType {
  if (type === "ticket" || type === "visitor" || type === "gate") return "other";
  return type;
}

function isAutomatic(channel: CommunicationRoutingChannel) {
  return channel.type === "whatsapp_official" && channel.status === "active";
}

function channelMode(channel: CommunicationRoutingChannel): ChannelRoutingSuggestion["mode"] {
  if (channel.type === "app") return "internal";
  if (isAutomatic(channel)) return "automatic";
  return "manual";
}

function isPrivateWhatsApp(channel: CommunicationRoutingChannel) {
  return (
    (channel.type === "whatsapp_manual" || channel.type === "whatsapp_official") &&
    !isGroupCommunicationChannel(channel)
  );
}

function isCollective(input: SuggestChannelsInput) {
  return input.targetType === "all" || input.targetType === "block" || input.targetType === "role";
}

function affectsChannel(channel: CommunicationRoutingChannel, input: SuggestChannelsInput) {
  if (channel.type === "app") return true;
  if (input.targetType === "channel") return !input.targetIds?.length || input.targetIds.includes(channel.id);
  if (input.targetType === "all") return channel.scope === "all" || channel.scope === "staff" || channel.scope === "council" || channel.scope === "gate";
  if (input.targetType === "block") return channel.scope === "block" && (!input.blockId || channel.block_id === input.blockId);
  if (input.targetType === "apartment") return channel.scope === "apartment";
  if (input.targetType === "role") return channel.scope === "role" ? (!input.role || channel.role === input.role) : staffRoles.has(input.role ?? "") && staffRoles.has(channel.scope);
  return false;
}

function groupBlockedReason(input: SuggestChannelsInput) {
  if (privateOnlyTypes.has(input.messageType)) {
    if (input.messageType === "package") return "Bloqueado porque encomendas individuais não devem ser enviadas em grupos.";
    if (input.messageType === "visitor") return "Bloqueado porque pedidos de visitante não devem ir para grupos.";
    if (input.messageType === "booking") return "Bloqueado porque agendamentos individuais devem ficar em canais privados.";
    return "Bloqueado porque solicitações individuais não devem ser enviadas em grupos.";
  }

  if (input.containsSensitiveData) return "Bloqueado porque a mensagem parece conter dados sensíveis.";
  return "";
}

function groupReason(channel: CommunicationRoutingChannel, input: SuggestChannelsInput) {
  if (channel.scope === "block") return "Recomendado porque este aviso afeta apenas um bloco.";
  if (channel.scope === "gate") return "Recomendado porque a mensagem é útil para a Guarita/Cancela.";
  if (channel.scope === "council" || channel.scope === "staff") return "Recomendado para equipe administrativa sem dados pessoais sensíveis.";
  if (input.priority === "urgent") return "Recomendado porque este aviso urgente afeta todos os moradores.";
  return "Recomendado porque este aviso afeta todos os moradores.";
}

function baseSafety(input: SuggestChannelsInput, channel: CommunicationRoutingChannel) {
  const safety = validateDispatchSafety({
    messageType: input.messageType === "gate" ? "other" : input.messageType,
    priority: input.priority,
    targetType: input.targetType,
    targetId: input.targetIds?.[0] ?? input.blockId ?? input.apartmentId ?? input.role,
    title: input.title ?? "",
    body: input.body ?? "",
    channelIds: [channel.id],
    channels: [channel],
    metadata: { containsSensitiveData: input.containsSensitiveData },
  });
  const safetyReasons = safety.risks.map((risk) => `${risk.label}: ${risk.suggestion}`);
  const blockedByRule = isGroupCommunicationChannel(channel) ? groupBlockedReason(input) : "";

  if (blockedByRule) safetyReasons.unshift(blockedByRule);

  return {
    safetyStatus: safetyReasons.length ? "blocked" as const : "safe" as const,
    safetyReasons,
  };
}

function estimateCredits(channel: CommunicationRoutingChannel) {
  return isAutomatic(channel) ? 1 : 0;
}

function planAllowsChannel(channel: CommunicationRoutingChannel, input: SuggestChannelsInput) {
  if (channel.type === "app") return true;
  if (channel.type === "whatsapp_official" && isGroupCommunicationChannel(channel)) {
    return Boolean(input.officialGroups);
  }
  if (channel.type === "whatsapp_official") {
    return Boolean(input.automaticOneToOne);
  }
  if (channel.type === "whatsapp_manual" && isGroupCommunicationChannel(channel)) {
    return input.plan !== "free" || Boolean(input.manualGroups) || channel.scope === "all";
  }
  return true;
}

function recommendedByContext(channel: CommunicationRoutingChannel, input: SuggestChannelsInput) {
  if (channel.type === "app") return true;
  if (!affectsChannel(channel, input)) return false;

  if (isPrivateWhatsApp(channel)) {
    return (
      privateOnlyTypes.has(input.messageType) ||
      (input.priority === "urgent" && input.targetType === "apartment") ||
      (input.priority === "important" && input.targetType === "apartment")
    );
  }

  if (isGroupCommunicationChannel(channel)) {
    if (!isCollective(input) || !groupSafeTypes.has(input.messageType)) return false;
    if (input.priority !== "important" && input.priority !== "urgent") return false;
    if (channel.scope === "block") return input.targetType === "block";
    if (channel.scope === "gate") return portariaTypes.has(input.messageType) || input.role === "doorman";
    if (channel.scope === "council" || channel.scope === "staff") return councilTypes.has(input.messageType) || staffRoles.has(input.role ?? "");
    return channel.scope === "all";
  }

  return false;
}

export function suggestChannelsForMessage(input: SuggestChannelsInput): ChannelRoutingSuggestion[] {
  const channels = input.channels ?? [];
  const remaining = input.whatsappRemaining ?? 0;

  return channels.map((channel) => {
    const estimatedCredits = estimateCredits(channel);
    const { safetyStatus, safetyReasons } = baseSafety(input, channel);
    const allowsPlan = planAllowsChannel(channel, input);
    const recommendedByRules = recommendedByContext(channel, input);
    const supportsType = channel.allowed_message_types.includes(storedType(input.messageType));
    const hasCredits = estimatedCredits <= remaining;
    const hasOptIn = !isPrivateWhatsApp(channel) || channel.type === "whatsapp_manual" || Boolean(input.hasPrivateWhatsAppOptIn);
    let recommendation: ChannelRecommendation = "optional";
    let reason = `${channel.name} pode ser usado, mas não é essencial para este disparo.`;

    if (channel.type === "app") {
      recommendation = "recommended";
      reason = "Recomendado porque o App Meus Condomínios sempre registra a comunicação internamente.";
    } else if (safetyStatus === "blocked" || !supportsType) {
      recommendation = "blocked";
      reason = safetyReasons[0] ?? "Bloqueado porque este canal não é seguro para esta mensagem.";
    } else if (!allowsPlan || !hasCredits || !hasOptIn) {
      recommendation = !allowsPlan ? "upgrade_required" : channel.type === "whatsapp_manual" ? "manual_only" : "upgrade_required";
      reason = !allowsPlan
        ? "Disponível apenas no plano Total ou com add-on Multi-grupos."
        : !hasCredits
          ? "Créditos WhatsApp insuficientes para automação."
          : "WhatsApp privado exige opt-in do morador.";
    } else if (channel.type === "whatsapp_manual") {
      recommendation = recommendedByRules ? "manual_only" : "optional";
      reason = recommendedByRules ? "Manual: copie e envie no grupo pelo WhatsApp." : reason;
    } else if (recommendedByRules) {
      recommendation = "recommended";
      reason = isGroupCommunicationChannel(channel)
        ? groupReason(channel, input)
        : "Recomendado para contato individual com opt-in e crédito disponível.";
    }

    const warnings = [...safetyReasons];
    if (!supportsType) warnings.unshift("Este canal não permite esse tipo de mensagem.");
    if (!allowsPlan) warnings.push("Disponível apenas no plano Total ou com add-on Multi-grupos.");
    if (!hasCredits) warnings.push("Créditos WhatsApp insuficientes para envio automático.");
    if (!hasOptIn) warnings.push("WhatsApp privado exige opt-in do morador.");

    return {
      ...channel,
      channelId: channel.id,
      recommendation,
      reason,
      estimatedCredits,
      safetyStatus,
      safetyReasons,
      mode: channelMode(channel),
      recommended: recommendation === "recommended" || recommendation === "manual_only",
      compatible: recommendation === "recommended" || recommendation === "optional" || recommendation === "manual_only",
      costUnits: estimatedCredits,
      warnings,
    };
  });
}
