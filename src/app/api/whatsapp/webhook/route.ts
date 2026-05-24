import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id?: string;
          status?: "sent" | "delivered" | "read" | "failed";
          errors?: Array<{ message?: string; code?: number }>;
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          timestamp?: string;
        }>;
        metadata?: {
          phone_number_id?: string;
        };
      };
    }>;
  }>;
};

function verifySignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expectedToken && token === expectedToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verificação inválida." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];

    for (const change of changes) {
      const value = change.value;

      for (const status of value?.statuses ?? []) {
        if (!status.id || !status.status) continue;

        const now = new Date().toISOString();
        await supabase
          .from("whatsapp_message_logs")
          .update({
            status: status.status,
            delivered_at: status.status === "delivered" ? now : undefined,
            read_at: status.status === "read" ? now : undefined,
            failed_at: status.status === "failed" ? now : undefined,
            error_message:
              status.status === "failed"
                ? status.errors?.[0]?.message ?? "Falha informada pela Meta."
                : undefined,
          })
          .eq("provider_message_id", status.id);
      }

      for (const message of value?.messages ?? []) {
        const phoneNumberId = value?.metadata?.phone_number_id ?? null;
        const { data: account } = phoneNumberId
          ? await supabase
              .from("whatsapp_accounts")
              .select("condominium_id")
              .eq("business_phone_number_id", phoneNumberId)
              .maybeSingle()
          : { data: null };

        if (!account?.condominium_id) continue;

        await supabase.from("audit_logs").insert({
          condominium_id: account.condominium_id,
          action: "whatsapp_webhook_message_received",
          entity_type: "whatsapp",
          entity_id: null,
          metadata: {
            provider_message_id: message.id ?? null,
            from_masked: message.from ? `***${message.from.slice(-4)}` : null,
            type: message.type ?? null,
            phone_number_id: phoneNumberId,
          },
        });
      }
    }
  } catch {
    return NextResponse.json({ received: true, processed: false });
  }

  return NextResponse.json({ received: true, processed: true });
}
