import { NextResponse, type NextRequest } from "next/server";
import {
  isValidAsaasWebhookToken,
  type AsaasWebhookPayload,
} from "@/lib/billing/asaas";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const paidEvents = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const overdueEvents = new Set(["PAYMENT_OVERDUE"]);
const canceledEvents = new Set([
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
]);
const failedEvents = new Set(["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"]);

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function subscriptionPatch(event: string) {
  if (paidEvents.has(event)) {
    const periodEnd = addDays(new Date(), 35).toISOString();
    return {
      status: "active",
      current_period_end: periodEnd,
      condominium_status: "active",
    };
  }

  if (overdueEvents.has(event)) {
    return {
      status: "past_due",
      condominium_status: "past_due",
    };
  }

  if (failedEvents.has(event)) {
    return {
      status: "past_due",
      condominium_status: "past_due",
    };
  }

  if (canceledEvents.has(event)) {
    return {
      status: "canceled",
      current_period_end: new Date().toISOString(),
      condominium_status: "canceled",
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const token =
    request.headers.get("asaas-access-token") ??
    request.headers.get("asaas_access_token");
  if (!isValidAsaasWebhookToken(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as AsaasWebhookPayload;
  const event = payload.event ?? "UNKNOWN";
  const payment = payload.payment ?? {};
  const providerSubscriptionId = payment.subscription ?? null;
  const localSubscriptionId = payment.externalReference ?? null;

  const adminSupabase = createSupabaseServiceClient();
  let subscriptionId: string | null = null;
  let userId: string | null = null;

  if (providerSubscriptionId || localSubscriptionId) {
    let query = adminSupabase
      .from("subscriptions")
      .select("id,user_id,metadata")
      .limit(1);

    if (providerSubscriptionId) {
      query = query.eq("provider_subscription_id", providerSubscriptionId);
    } else {
      query = query.eq("id", localSubscriptionId);
    }

    const { data: subscription } = await query.maybeSingle();
    subscriptionId = subscription?.id ?? null;
    userId = subscription?.user_id ?? null;

    const patch = subscriptionPatch(event);
    if (subscriptionId && patch) {
      const { condominium_status: condominiumStatus, ...subscriptionUpdate } = patch;
      await adminSupabase
        .from("subscriptions")
        .update({
          ...subscriptionUpdate,
          plan: "premium",
          provider: "asaas",
          provider_subscription_id: providerSubscriptionId,
          metadata: {
            ...metadataOf(subscription?.metadata),
            last_asaas_event: event,
            last_asaas_payment_id: payment.id ?? null,
            last_asaas_payment_status: payment.status ?? null,
          },
        })
        .eq("id", subscriptionId);

      if (userId) {
        const condoPatch = {
          ...(paidEvents.has(event) ? { plan: "premium" } : {}),
          subscription_status: condominiumStatus,
        };

        await adminSupabase
          .from("condominiums")
          .update(condoPatch)
          .eq("owner_user_id", userId)
          .not("subscription_status", "in", "(canceled,blocked,pending_deletion)");
      }
    }
  }

  await adminSupabase.from("billing_events").insert({
    condominium_id: null,
    user_id: userId,
    event_type: `asaas_${event.toLowerCase()}`,
    provider: "asaas",
    amount_cents:
      typeof payment.value === "number" ? Math.round(payment.value * 100) : null,
    currency: "BRL",
    status: payment.status ?? event,
    metadata: {
      webhook_id: payload.id ?? null,
      subscription_id: subscriptionId,
      provider_subscription_id: providerSubscriptionId,
      payment_id: payment.id ?? null,
      billing_type: payment.billingType ?? null,
      due_date: payment.dueDate ?? null,
    },
  });

  return NextResponse.json({ received: true });
}
