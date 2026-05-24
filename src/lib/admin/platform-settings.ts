export type PlatformSettingsKey =
  | "plans"
  | "whatsapp"
  | "security"
  | "support"
  | "legal"
  | "maintenance";

export const platformSettingsKeys = [
  "plans",
  "whatsapp",
  "security",
  "support",
  "legal",
  "maintenance",
] as const;

export const defaultPlatformSettings: Record<PlatformSettingsKey, Record<string, unknown>> = {
  plans: {
    free_price_monthly: "R$ 0",
    premium_price_monthly: "R$ 39,90",
    premium_price_yearly: "",
    pro_price_monthly: "R$ 99,90",
    pro_price_yearly: "",
    total_price_monthly: "R$ 249,90",
    total_price_yearly: "",
    free_active: true,
    premium_active: true,
    pro_active: false,
    total_active: false,
    commercial_text: "Planos free-first: comece gratis com WhatsApp manual e evolua quando o condominio precisar de mais uso.",
    limits_text: "Free: 24 aptos e 30 MB. Premium: 24 aptos e 500 MB. Pro e Total entram em breve.",
  },
  whatsapp: {
    free_credits: 0,
    premium_credits: 0,
    pro_credits: 500,
    total_credits: 2000,
    daily_limit_per_condo: 200,
    global_status: "not_configured",
    globally_blocked: false,
    addons_text: "500 mensagens: R$ 29,90; 1.000: R$ 49,90; 5.000: R$ 199,90.",
    block_reason: "",
  },
  security: {
    require_2fa_admin: true,
    qr_public_global_enabled: true,
    sensitive_reveal_blocked_roles: ["platform_readonly"],
    admin_rate_limit_per_10min: 20,
    sensitive_reveal_limit_per_10min: 10,
    allowlist_emails: "",
  },
  support: {
    support_email: "codeflowbr1@gmail.com",
    categories: "duvida,cobranca,cancelamento,reembolso,problema_tecnico,privacidade_lgpd,seguranca,whatsapp,outro",
    default_message: "Recebemos sua solicitacao e vamos analisar.",
    service_hours: "Atendimento por e-mail em horario comercial, salvo definicao contratual diferente.",
  },
  legal: {
    terms_version: "2026-05",
    privacy_version: "2026-05",
    whatsapp_consent_version: "2026-05",
    terms_url: "/termos",
    privacy_url: "/privacidade",
    cookies_url: "/cookies",
    cancellation_url: "/politica-de-cancelamento",
  },
  maintenance: {
    maintenance_mode: false,
    maintenance_message: "Estamos fazendo uma manutencao programada. Tente novamente em alguns minutos.",
    block_new_signups: false,
  },
};

const secretPatterns = [
  /token/i,
  /secret/i,
  /service[_-]?role/i,
  /password/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /authorization/i,
];

export function assertNoSecretPlatformSetting(value: Record<string, unknown>) {
  for (const [key, item] of Object.entries(value)) {
    if (secretPatterns.some((pattern) => pattern.test(key))) {
      throw new Error("Nao salve tokens, secrets ou chaves sensiveis nas configuracoes da plataforma.");
    }
    if (typeof item === "string" && /(sbp_|service_role|Bearer\s+|-----BEGIN)/i.test(item)) {
      throw new Error("O valor parece conter credencial sensivel. Use variaveis de ambiente.");
    }
  }
}

export function mergePlatformSetting(
  key: PlatformSettingsKey,
  value?: Record<string, unknown> | null,
) {
  return {
    ...defaultPlatformSettings[key],
    ...(value ?? {}),
  };
}
