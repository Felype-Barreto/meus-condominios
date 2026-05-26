"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAsaasCustomer,
  createAsaasPremiumSubscription,
  getAsaasSubscriptionPayments,
} from "@/lib/billing/asaas";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  cpfCnpj: z
    .string()
    .trim()
    .min(11, "Informe CPF ou CNPJ.")
    .transform((value) => value.replace(/\D/g, "")),
  phone: z.string().trim().optional(),
  billingType: z
    .enum(["UNDEFINED", "PIX", "BOLETO", "CREDIT_CARD"])
    .default("UNDEFINED"),
});

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function startPremiumCheckout(formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/app/assinatura/checkout?plano=premium&erro=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados inválidos.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const adminSupabase = createSupabaseServiceClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: currentSubscription } = await adminSupabase
    .from("subscriptions")
    .select("id,plan,status,provider_subscription_id,metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let localSubscription = currentSubscription;
  if (!localSubscription) {
    const { data: created, error } = await adminSupabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "premium",
        status: "paused",
        provider: "asaas",
        metadata: {},
      })
      .select("id,plan,status,provider_subscription_id,metadata")
      .single();

    if (error) throw new Error("Não foi possível iniciar a assinatura.");
    localSubscription = created;
  }

  if (
    localSubscription.plan === "premium" &&
    localSubscription.status === "active"
  ) {
    redirect("/app/assinatura?status=active");
  }

  const metadata = metadataOf(localSubscription.metadata);
  const existingPaymentUrl =
    typeof metadata.checkout_invoice_url === "string"
      ? metadata.checkout_invoice_url
      : null;

  if (
    localSubscription.provider_subscription_id &&
    existingPaymentUrl &&
    ["paused", "past_due"].includes(localSubscription.status)
  ) {
    redirect(existingPaymentUrl);
  }

  let customerId =
    typeof metadata.asaas_customer_id === "string"
      ? metadata.asaas_customer_id
      : null;

  if (!customerId) {
    const customer = await createAsaasCustomer({
      name: parsed.data.name,
      cpfCnpj: parsed.data.cpfCnpj,
      phone: parsed.data.phone,
      email: user.email ?? profile?.email ?? "",
      userId: user.id,
    });
    customerId = customer.id;
  }

  const asaasSubscription = await createAsaasPremiumSubscription({
    customerId,
    subscriptionId: localSubscription.id,
    billingType: parsed.data.billingType,
  });

  const payments = await getAsaasSubscriptionPayments(asaasSubscription.id);
  const firstPayment = payments.data?.[0];
  const paymentUrl = firstPayment?.invoiceUrl ?? firstPayment?.bankSlipUrl;

  await adminSupabase
    .from("subscriptions")
    .update({
      plan: "premium",
      status: "paused",
      provider: "asaas",
      provider_subscription_id: asaasSubscription.id,
      metadata: {
        ...metadata,
        asaas_customer_id: customerId,
        checkout_payment_id: firstPayment?.id ?? null,
        checkout_invoice_url: paymentUrl ?? null,
        billing_type: parsed.data.billingType,
      },
    })
    .eq("id", localSubscription.id);

  await adminSupabase.from("billing_events").insert({
    condominium_id: null,
    user_id: user.id,
    event_type: "asaas_subscription_checkout_started",
    provider: "asaas",
    amount_cents: 3990,
    currency: "BRL",
    status: "pending",
    metadata: {
      subscription_id: localSubscription.id,
      provider_subscription_id: asaasSubscription.id,
      payment_id: firstPayment?.id ?? null,
    },
  });

  if (!paymentUrl) {
    redirect("/app/assinatura/checkout?plano=premium&erro=link");
  }

  redirect(paymentUrl);
}
