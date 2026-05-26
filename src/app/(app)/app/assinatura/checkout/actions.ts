"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAsaasCustomer,
  createAsaasPremiumPayment,
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
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]).default("PIX"),
});

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function checkoutError(message: string): never {
  redirect(`/app/assinatura/checkout?plano=premium&erro=${encodeURIComponent(message)}`);
}

export async function startPremiumCheckout(formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    checkoutError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const checkout = parsed.data;
  let paymentUrl: string | null = null;

  try {
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

    if (localSubscription.plan === "premium" && localSubscription.status === "active") {
      redirect("/app/assinatura?status=active");
    }

    const metadata = metadataOf(localSubscription.metadata);
    const existingPaymentUrl =
      typeof metadata.checkout_invoice_url === "string"
        ? metadata.checkout_invoice_url
        : null;

    if (existingPaymentUrl && ["paused", "past_due"].includes(localSubscription.status)) {
      redirect(existingPaymentUrl);
    }

    let customerId =
      typeof metadata.asaas_customer_id === "string"
        ? metadata.asaas_customer_id
        : null;

    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: checkout.name,
        cpfCnpj: checkout.cpfCnpj,
        phone: checkout.phone,
        email: user.email ?? profile?.email ?? "",
        userId: user.id,
      });
      customerId = customer.id;
    }

    const asaasPayment = await createAsaasPremiumPayment({
      customerId,
      subscriptionId: localSubscription.id,
      billingType: checkout.billingType,
    });

    paymentUrl = asaasPayment.invoiceUrl ?? asaasPayment.bankSlipUrl ?? null;

    await adminSupabase
      .from("subscriptions")
      .update({
        plan: "premium",
        status: "paused",
        provider: "asaas",
        metadata: {
          ...metadata,
          asaas_customer_id: customerId,
          checkout_payment_id: asaasPayment.id,
          checkout_invoice_url: paymentUrl ?? null,
          billing_type: checkout.billingType,
        },
      })
      .eq("id", localSubscription.id);

    await adminSupabase.from("billing_events").insert({
      condominium_id: null,
      user_id: user.id,
      event_type: "asaas_premium_payment_checkout_started",
      provider: "asaas",
      amount_cents: 3990,
      currency: "BRL",
      status: "pending",
      metadata: {
        subscription_id: localSubscription.id,
        payment_id: asaasPayment.id,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;

    console.error("Asaas premium checkout failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    checkoutError(
      error instanceof Error
        ? error.message
        : "Não foi possível iniciar o pagamento.",
    );
  }

  if (!paymentUrl) {
    checkoutError("O pagamento foi iniciado, mas o link do Asaas não retornou. Tente novamente em instantes.");
  }

  redirect(paymentUrl);
}
