const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://api.asaas.com/v3";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://meuscondominios.site";

type AsaasCustomerResponse = {
  id: string;
};

type AsaasSubscriptionResponse = {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

export type AsaasPayment = {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  billingType?: string;
  externalReference?: string;
};

export type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: AsaasPayment;
};

function getAsaasApiKey() {
  const apiKey = process.env.ASAAS_API_KEY?.trim().split(/\s+/)[0];
  if (!apiKey) {
    throw new Error("Asaas API key não configurada.");
  }
  return apiKey;
}

function asaasHeaders() {
  return {
    "User-Agent": "MeusCondominios/1.0",
    accept: "application/json",
    "content-type": "application/json",
    access_token: getAsaasApiKey(),
  };
}

async function asaasRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      ...asaasHeaders(),
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      body?.errors?.[0]?.description ??
      body?.message ??
      "Não foi possível concluir a operação no Asaas.";
    throw new Error(message);
  }

  return body as T;
}

export function isValidAsaasWebhookToken(token: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  return Boolean(expected && token && token.trim() === expected);
}

export async function createAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  userId: string;
}) {
  return asaasRequest<AsaasCustomerResponse>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      mobilePhone: input.phone?.replace(/\D/g, "") || undefined,
      externalReference: input.userId,
      groupName: "Meus Condomínios",
    }),
  });
}

export async function createAsaasPremiumSubscription(input: {
  customerId: string;
  subscriptionId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
}) {
  const today = new Date().toISOString().slice(0, 10);

  return asaasRequest<AsaasSubscriptionResponse>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      nextDueDate: today,
      value: 39.9,
      cycle: "MONTHLY",
      description: "Meus Condomínios - Plano Premium mensal",
      externalReference: input.subscriptionId,
      callback: {
        successUrl: `${APP_URL}/app/assinatura?pagamento=asaas`,
        autoRedirect: true,
      },
    }),
  });
}

export async function getAsaasSubscriptionPayments(subscriptionId: string) {
  return asaasRequest<{ data?: AsaasPayment[] }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
    {
      method: "GET",
    },
  );
}
