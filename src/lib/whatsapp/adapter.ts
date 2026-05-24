import { ManualWhatsAppAdapter } from "@/lib/whatsapp/manual-adapter";
import { MetaCloudWhatsAppAdapter } from "@/lib/whatsapp/meta-cloud-adapter";
import { getEconomyModeDecision, isEconomyMode } from "@/lib/economy-mode";

export type WhatsAppTemplateComponent = {
  type: "body" | "header" | "button";
  parameters?: Array<{
    type: "text";
    text: string;
  }>;
};

export type WhatsAppAdapterSendInput = {
  to?: string | null;
  groupId?: string | null;
  templateName: string;
  templateKey: string;
  language: string;
  components?: WhatsAppTemplateComponent[];
  textFallback?: string | null;
  payload?: Record<string, unknown>;
};

export type WhatsAppAdapterSendResult = {
  accepted: boolean;
  providerMessageId?: string | null;
  error?: string | null;
  statusCode?: number;
};

export interface WhatsAppAdapter {
  readonly name: string;
  readonly configured: boolean;
  sendTemplate(input: WhatsAppAdapterSendInput): Promise<WhatsAppAdapterSendResult>;
  sendGroupMessage(input: WhatsAppAdapterSendInput): Promise<WhatsAppAdapterSendResult>;
}

export type WhatsAppConfigurationStatus = {
  configured: boolean;
  status: "active" | "not_configured";
  provider: "meta_cloud_api" | "manual";
  message: string;
};

export function getWhatsAppConfigurationStatus(): WhatsAppConfigurationStatus {
  if (isEconomyMode()) {
    return {
      configured: false,
      status: "not_configured",
      provider: "manual",
      message: getEconomyModeDecision("whatsapp_automatic").userMessage,
    };
  }

  const configured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );

  if (!configured) {
    return {
      configured: false,
      status: "not_configured",
      provider: "manual",
      message: "WhatsApp não configurado",
    };
  }

  return {
    configured: true,
    status: "active",
    provider: "meta_cloud_api",
    message: "WhatsApp Business Cloud API configurado",
  };
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  const status = getWhatsAppConfigurationStatus();
  return status.configured
    ? new MetaCloudWhatsAppAdapter()
    : new ManualWhatsAppAdapter();
}
