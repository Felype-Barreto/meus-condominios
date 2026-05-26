import { getPublicAppUrl } from "@/lib/public-url";

function normalizeAsaasApiUrl(value: string | undefined) {
  const raw = (value ?? "https://api.asaas.com/v3").trim().replace(/\/+$/, "");
  if (!raw) return "https://api.asaas.com/v3";
  return raw.endsWith("/v3") ? raw : `${raw}/v3`;
}

const ASAAS_API_URL = normalizeAsaasApiUrl(process.env.ASAAS_API_URL);
const APP_URL = getPublicAppUrl();

type AsaasCustomerResponse = {
  id: string;
};

type AsaasSubscriptionResponse = {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

type AsaasPaymentResponse = {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixTransaction?: string;
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
  const url = `${ASAAS_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...asaasHeaders(),
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { message: text.slice(0, 500) };
        }
      })()
    : null;

  if (!response.ok) {
    console.error("Asaas request failed", {
      status: response.status,
      path,
      host: (() => {
        try {
          return new URL(url).host;
        } catch {
          return "invalid-url";
        }
      })(),
    });
    const message =
      body?.errors?.[0]?.description ??
      body?.message ??
      `Não foi possível concluir a operação no Asaas. Código ${response.status}.`;
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

export async function createAsaasPremiumPayment(input: {
  customerId: string;
  subscriptionId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
}) {
  const today = new Date().toISOString().slice(0, 10);

  return asaasRequest<AsaasPaymentResponse>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      dueDate: today,
      value: 39.9,
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
