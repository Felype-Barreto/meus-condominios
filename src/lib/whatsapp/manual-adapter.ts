import type {
  WhatsAppAdapter,
  WhatsAppAdapterSendResult,
} from "@/lib/whatsapp/adapter";

export class ManualWhatsAppAdapter implements WhatsAppAdapter {
  readonly name = "manual";
  readonly configured = false;

  async sendTemplate(): Promise<WhatsAppAdapterSendResult> {
    return {
      accepted: false,
      error: "WhatsApp não configurado",
    };
  }

  async sendGroupMessage(): Promise<WhatsAppAdapterSendResult> {
    return {
      accepted: false,
      error: "WhatsApp não configurado",
    };
  }
}
