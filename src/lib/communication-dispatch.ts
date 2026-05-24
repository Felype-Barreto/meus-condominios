import type {
  CommunicationChannelType,
  CommunicationMessageType,
  CommunicationPriority,
  CommunicationScope,
} from "@/lib/communication-content";
import { generateGroupSafeVersion as generateSafeGroupVersion, isGroupCommunicationChannel } from "@/lib/communication/safety";
import {
  suggestChannelsForMessage as routeChannelsForMessage,
  type ChannelRecommendation,
  type ChannelSafetyStatus,
} from "@/lib/communication/routing";

export type DispatchComposerMessageType = CommunicationMessageType | "ticket" | "visitor";
export type DispatchTargetType = "all" | "block" | "apartment" | "role" | "channel";

export type DispatchChannelInput = {
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

export type DispatchInput = {
  title: string;
  body: string;
  messageType: DispatchComposerMessageType;
  priority: CommunicationPriority;
  targetType: DispatchTargetType;
  targetId?: string;
  plan: string;
  whatsappRemaining: number;
  automaticOneToOne: boolean;
  officialGroups: boolean;
  manualGroups: boolean;
};

export type ChannelSuggestion = DispatchChannelInput & {
  channelId: string;
  recommendation: ChannelRecommendation;
  estimatedCredits: number;
  safetyStatus: ChannelSafetyStatus;
  safetyReasons: string[];
  recommended: boolean;
  compatible: boolean;
  costUnits: number;
  mode: "manual" | "automatic" | "internal";
  reason: string;
  warnings: string[];
};

export const dispatchMessageTypeLabels: Record<DispatchComposerMessageType, string> = {
  announcement: "Comunicado geral",
  maintenance: "Manutenção",
  meeting: "Assembleia",
  security: "Segurança",
  booking: "Agendamento",
  package: "Encomenda",
  ticket: "Solicitação",
  visitor: "Visitante",
  summary: "Resumo",
  other: "Outro",
};

export const dispatchPriorityLabels: Record<CommunicationPriority, string> = {
  low: "Baixa: só app",
  normal: "Normal: app + resumo",
  important: "Importante: app + WhatsApp privado se permitido",
  urgent: "Urgente: app + WhatsApp + grupos permitidos",
};

export function isGroupChannel(channel: Pick<DispatchChannelInput, "type" | "scope">) {
  return isGroupCommunicationChannel(channel);
}

export function generateGroupSafeVersion(input: Pick<DispatchInput, "title" | "body" | "messageType">) {
  return generateSafeGroupVersion(input);
}

export function estimateDispatchCost(_input: DispatchInput, channel: DispatchChannelInput) {
  if (channel.type === "app" || channel.type === "whatsapp_manual") return 0;
  if (channel.type === "whatsapp_official" && channel.status === "active") return 1;
  return 0;
}

export function suggestChannelsForMessage(input: DispatchInput, channels: DispatchChannelInput[]) {
  return routeChannelsForMessage({
    condoId: "",
    messageType: input.messageType,
    priority: input.priority,
    targetType: input.targetType,
    targetIds: input.targetId ? [input.targetId] : undefined,
    blockId: input.targetType === "block" ? input.targetId : undefined,
    apartmentId: input.targetType === "apartment" ? input.targetId : undefined,
    role: input.targetType === "role" ? input.targetId : undefined,
    title: input.title,
    body: input.body,
    channels,
    plan: input.plan,
    whatsappRemaining: input.whatsappRemaining,
    automaticOneToOne: input.automaticOneToOne,
    officialGroups: input.officialGroups,
    manualGroups: input.manualGroups,
  }) satisfies ChannelSuggestion[];
}
