import type {
  DispatchChannelInput,
  DispatchComposerMessageType,
  DispatchTargetType,
} from "@/lib/communication-dispatch";
import type { CommunicationPriority } from "@/lib/communication-content";

export type DispatchSafetyAttachment = {
  name?: string;
  url?: string;
  private?: boolean;
  visibility?: "public" | "internal" | "private";
};

export type DispatchSafetyInput = {
  messageType: DispatchComposerMessageType;
  priority: CommunicationPriority;
  targetType: DispatchTargetType;
  targetId?: string;
  title: string;
  body: string;
  channelIds: string[];
  channels: DispatchChannelInput[];
  attachments?: DispatchSafetyAttachment[];
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type SafetyRisk = {
  key: string;
  label: string;
  severity: "warning" | "blocked";
  channelId?: string;
  channelName?: string;
  suggestion: string;
};

export type DispatchSafetyResult = {
  allowed: boolean;
  risks: SafetyRisk[];
  selectedGroupChannels: DispatchChannelInput[];
  selectedPrivateChannels: DispatchChannelInput[];
  safeGroupVersion: string;
  recommendedChannelIds: string[];
};

const groupScopes = new Set(["all", "block", "staff", "council", "garage", "gate"]);
const privateMessageTypes = new Set<DispatchComposerMessageType>(["package", "booking", "ticket", "visitor"]);

const sensitivePatterns: Array<{ key: string; label: string; pattern: RegExp; suggestion: string }> = [
  {
    key: "phone",
    label: "telefone ou WhatsApp",
    pattern: /(\+?55\s?)?(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}|whats(app)?/i,
    suggestion: "Envie por canal privado ou oculte o telefone.",
  },
  {
    key: "email",
    label: "e-mail pessoal",
    pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    suggestion: "Remova o e-mail do texto para grupos.",
  },
  {
    key: "document",
    label: "CPF, CNPJ ou documento",
    pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|cpf|cnpj|rg|documento/i,
    suggestion: "Documentos devem ficar apenas em canal privado.",
  },
  {
    key: "visitor",
    label: "dados de visitante",
    pattern: /visitante|entrada liberada|portaria.*visit/i,
    suggestion: "Solicitações de visitante devem ser tratadas apenas em canais privados/autorizados.",
  },
  {
    key: "package_identity",
    label: "dados de encomenda identificável",
    pattern: /encomenda.*(para|nome|apto|apartamento)|retirada.*(por|apto|apartamento)/i,
    suggestion: "Use resumo anônimo sobre encomendas.",
  },
  {
    key: "apartment_private",
    label: "apartamento em contexto privado",
    pattern: /(reclama|solicita|barulho|ocorr[eê]ncia|problema|contra).{0,50}(apto|apartamento)\s*\d+/i,
    suggestion: "Não exponha unidade em reclamações ou ocorrências.",
  },
  {
    key: "billing",
    label: "inadimplência ou cobrança individual",
    pattern: /inadimpl|cobran[çc]a|boleto em atraso|d[ée]bito|condom[ií]nio em aberto/i,
    suggestion: "Cobranças individuais devem ficar fora de grupos.",
  },
  {
    key: "private_incident",
    label: "ocorrência privada",
    pattern: /ocorr[eê]ncia privada|briga|amea[çc]a|agress[aã]o|furto|viol[eê]ncia/i,
    suggestion: "Ocorrências privadas devem ser tratadas por administração autorizada.",
  },
  {
    key: "resident_private_link",
    label: "link privado de morador",
    pattern: /\/app\/[^/\s]+\/(moradores|apartamentos|solicitacoes|encomendas)|token=|convite\/[a-z0-9-]+/i,
    suggestion: "Não compartilhe links privados em canais de grupo.",
  },
  {
    key: "children",
    label: "dados de criança",
    pattern: /crian[çc]a|menor de idade|filho|filha|aluno|beb[eê]/i,
    suggestion: "Dados de crianças exigem canal privado e minimização.",
  },
  {
    key: "full_name_private",
    label: "nome completo em contexto privado",
    pattern: /(morador|propriet[aá]rio|reclama[çc][aã]o|encomenda|visitante).{0,80}\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+ [A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+/i,
    suggestion: "Use uma versão sem nome completo para grupos.",
  },
];

export function isGroupCommunicationChannel(channel: Pick<DispatchChannelInput, "type" | "scope">) {
  return (
    (channel.type === "whatsapp_manual" || channel.type === "whatsapp_official") &&
    groupScopes.has(channel.scope)
  );
}

function detectSensitiveText(input: DispatchSafetyInput) {
  const text = [
    input.title,
    input.body,
    JSON.stringify(input.variables ?? {}),
    JSON.stringify(input.metadata ?? {}),
  ].join("\n");

  return sensitivePatterns
    .filter((item) => item.pattern.test(text))
    .map((item) => ({
      key: item.key,
      label: item.label,
      severity: "blocked" as const,
      suggestion: item.suggestion,
    }));
}

function messageTypeGroupRisk(input: DispatchSafetyInput): SafetyRisk | null {
  if (privateMessageTypes.has(input.messageType)) {
    return {
      key: `type_${input.messageType}`,
      label: "tipo de mensagem privada",
      severity: "blocked",
      suggestion: "Remova canais de grupo e envie pelo app ou WhatsApp privado.",
    };
  }

  if (input.messageType === "security" && /\b(apto|apartamento|morador|nome|telefone)\b/i.test(input.body)) {
    return {
      key: "security_identifies_person",
      label: "segurança identificando pessoa específica",
      severity: "blocked",
      suggestion: "Transforme em orientação geral de segurança.",
    };
  }

  return null;
}

function attachmentRisks(input: DispatchSafetyInput) {
  return (input.attachments ?? [])
    .filter((attachment) => attachment.private || attachment.visibility === "private")
    .map((attachment) => ({
      key: "private_attachment",
      label: `anexo privado${attachment.name ? `: ${attachment.name}` : ""}`,
      severity: "blocked" as const,
      suggestion: "Remova anexos privados antes de enviar para grupos.",
    }));
}

export function generateGroupSafeVersion(dispatch: Pick<DispatchSafetyInput, "messageType" | "title" | "body">) {
  if (dispatch.messageType === "package") {
    return "Há novas encomendas aguardando retirada na portaria. Consulte o Meus Condomínios.";
  }

  if (dispatch.messageType === "ticket") {
    return "Há novas solicitações em análise pela administração.";
  }

  if (dispatch.messageType === "visitor") {
    return "Há novas solicitações de contato registradas no Meus Condomínios.";
  }

  if (dispatch.messageType === "booking") {
    return "A agenda das áreas comuns foi atualizada. Consulte os horários no Meus Condomínios.";
  }

  const sanitized = dispatch.body
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[e-mail oculto]")
    .replace(/(\+?55\s?)?(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/g, "[telefone oculto]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento oculto]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento oculto]")
    .replace(/\b(apto|apartamento)\s*\d+[a-z]?/gi, "unidade indicada no Meus Condomínios")
    .replace(/\b(encomenda|visitante|reclamação|cobrança|inadimplência|ocorrência privada)\b/gi, "informação privada");

  return [
    dispatch.title.trim() || "Comunicado do condomínio",
    "",
    sanitized.trim(),
    "",
    "Detalhes individuais ficam disponíveis apenas nos canais privados do Meus Condomínios.",
  ].join("\n");
}

export function validateDispatchSafety(dispatch: DispatchSafetyInput): DispatchSafetyResult {
  const selectedChannels = dispatch.channels.filter((channel) => dispatch.channelIds.includes(channel.id));
  const selectedGroupChannels = selectedChannels.filter(isGroupCommunicationChannel);
  const selectedPrivateChannels = selectedChannels.filter((channel) => !isGroupCommunicationChannel(channel));
  const risks: SafetyRisk[] = [];

  if (selectedGroupChannels.length) {
    const globalRisks = [
      ...detectSensitiveText(dispatch),
      ...attachmentRisks(dispatch),
      messageTypeGroupRisk(dispatch),
    ].filter(Boolean) as SafetyRisk[];

    selectedGroupChannels.forEach((channel) => {
      globalRisks.forEach((risk) => {
        risks.push({
          ...risk,
          channelId: channel.id,
          channelName: channel.name,
        });
      });
    });
  }

  if (
    dispatch.messageType === "maintenance" &&
    dispatch.targetType !== "all" &&
    dispatch.targetType !== "block" &&
    selectedGroupChannels.length
  ) {
    risks.push({
      key: "maintenance_wrong_scope",
      label: "manutenção fora de escopo geral/bloco",
      severity: "blocked",
      suggestion: "Use grupo apenas para manutenção geral ou por bloco.",
    });
  }

  if (dispatch.messageType === "summary" && selectedGroupChannels.length && detectSensitiveText(dispatch).length) {
    risks.push({
      key: "summary_not_anonymized",
      label: "resumo não anonimizado",
      severity: "blocked",
      suggestion: "Use a versão segura gerada pelo Meus Condomínios.",
    });
  }

  const blockedChannelIds = new Set(risks.map((risk) => risk.channelId).filter(Boolean) as string[]);
  const recommendedChannelIds = selectedChannels
    .filter((channel) => !blockedChannelIds.has(channel.id))
    .map((channel) => channel.id);

  return {
    allowed: risks.every((risk) => risk.severity !== "blocked"),
    risks,
    selectedGroupChannels,
    selectedPrivateChannels,
    safeGroupVersion: generateGroupSafeVersion(dispatch),
    recommendedChannelIds,
  };
}
