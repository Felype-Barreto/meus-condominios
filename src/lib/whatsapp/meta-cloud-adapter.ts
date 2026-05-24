import type {
  WhatsAppAdapter,
  WhatsAppAdapterSendInput,
  WhatsAppAdapterSendResult,
} from "@/lib/whatsapp/adapter";

type MetaMessageResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
};

export class MetaCloudWhatsAppAdapter implements WhatsAppAdapter {
  readonly name = "meta_cloud_api";
  readonly configured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );

  async sendTemplate(
    input: WhatsAppAdapterSendInput,
  ): Promise<WhatsAppAdapterSendResult> {
    if (!this.configured) {
      return { accepted: false, error: "WhatsApp não configurado" };
    }

    if (!input.to) {
      return { accepted: false, error: "Destino WhatsApp não informado." };
    }

    return this.postMessage({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language },
        components: input.components ?? [],
      },
    });
  }

  async sendGroupMessage(
    input: WhatsAppAdapterSendInput,
  ): Promise<WhatsAppAdapterSendResult> {
    if (!this.configured) {
      return { accepted: false, error: "WhatsApp não configurado" };
    }

    if (!input.groupId) {
      return { accepted: false, error: "Grupo WhatsApp não configurado." };
    }

    return {
      accepted: false,
      error:
        "Envio automático para grupos depende de elegibilidade/configuração da conta Meta. Use compartilhamento manual enquanto isso.",
    };
  }

  private async postMessage(payload: Record<string, unknown>) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0";

    if (!phoneNumberId || !accessToken) {
      return { accepted: false, error: "WhatsApp não configurado" };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json().catch(() => ({}))) as MetaMessageResponse;

      if (!response.ok) {
        return {
          accepted: false,
          statusCode: response.status,
          error: json.error?.message ?? "Falha ao enviar pelo WhatsApp.",
        };
      }

      return {
        accepted: true,
        statusCode: response.status,
        providerMessageId: json.messages?.[0]?.id ?? null,
      };
    } catch (error) {
      return {
        accepted: false,
        error: error instanceof Error ? error.message : "Falha inesperada no adapter.",
      };
    }
  }
}
