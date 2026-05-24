import type { PlatformRole } from "@/lib/admin/auth";

export const sensitiveFieldKeys = [
  "phone",
  "email",
  "document",
  "resident_full_name",
  "visitor_data",
  "payment_data",
  "private_link",
  "log_payload",
  "complaint_content",
  "private_ticket_content",
  "attachment",
  "apartment",
] as const;

export type SensitiveField = (typeof sensitiveFieldKeys)[number];

export type SensitiveRevealContext = {
  module?: string | null;
  entityType?: string | null;
  condominiumId?: string | null;
};

const MASK = "••••••";

export function maskEmail(email?: string | null) {
  if (!email) return "Sem e-mail";
  const [name, domain] = email.split("@");
  if (!domain || !name) return MASK;
  return `${name.slice(0, Math.min(2, name.length))}***@${domain}`;
}

export function maskPhone(phone?: string | null) {
  if (!phone) return "Sem telefone";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return MASK;
  return `${MASK}${digits.slice(-4)}`;
}

export function maskName(name?: string | null) {
  if (!name) return "Sem nome";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return MASK;
  const first = parts[0];
  if (parts.length === 1) return `${first.slice(0, 1)}${MASK}`;
  return `${first} ${MASK}`;
}

export function maskDocument(document?: string | null) {
  if (!document) return "Sem documento";
  const digits = document.replace(/\D/g, "");
  if (digits.length <= 4) return MASK;
  return `${MASK}${digits.slice(-4)}`;
}

export function maskApartment(number?: string | number | null) {
  if (!number) return "Sem unidade";
  const value = String(number).trim();
  if (value.length <= 1) return MASK;
  return `${value.slice(0, 1)}${MASK}`;
}

export function maskSensitiveValue(value: unknown, field: SensitiveField) {
  const text = value == null ? "" : String(value);
  if (field === "email") return maskEmail(text);
  if (field === "phone") return maskPhone(text);
  if (field === "document") return maskDocument(text);
  if (field === "resident_full_name") return maskName(text);
  if (field === "apartment") return maskApartment(text);
  return text ? MASK : "Sem dado";
}

function inModule(context: SensitiveRevealContext | undefined, modules: string[]) {
  const moduleName = context?.module ?? "";
  return modules.some((item) => item === moduleName);
}

export function canRevealSensitiveField(
  userRole: PlatformRole,
  field: SensitiveField,
  context?: SensitiveRevealContext,
) {
  if (userRole === "platform_readonly") return false;
  if (userRole === "platform_owner") return true;

  if (userRole === "platform_admin") {
    if (field === "log_payload" || field === "payment_data") {
      return inModule(context, ["security", "incidents", "logs", "finance", "refunds", "billing", "whatsapp"]);
    }
    return true;
  }

  if (userRole === "platform_support") {
    if (!inModule(context, ["support", "condominiums", "users", "whatsapp"])) return false;
    return ["email", "phone", "resident_full_name", "private_link", "apartment", "private_ticket_content"].includes(field);
  }

  if (userRole === "platform_finance") {
    if (!inModule(context, ["finance", "refunds", "billing", "subscriptions"])) return false;
    return ["email", "resident_full_name", "payment_data", "document"].includes(field);
  }

  if (userRole === "platform_security") {
    if (!inModule(context, ["security", "incidents", "abuse", "logs", "whatsapp", "qr", "lgpd"])) return false;
    return [
      "email",
      "phone",
      "document",
      "resident_full_name",
      "visitor_data",
      "private_link",
      "log_payload",
      "complaint_content",
      "private_ticket_content",
      "attachment",
      "apartment",
    ].includes(field);
  }

  return false;
}

export function revealSensitiveField(input: {
  userRole: PlatformRole;
  field: SensitiveField;
  value: unknown;
  context?: SensitiveRevealContext;
}) {
  if (!canRevealSensitiveField(input.userRole, input.field, input.context)) {
    return null;
  }
  if (input.value == null || input.value === "") return "";
  return typeof input.value === "string" ? input.value : JSON.stringify(input.value, null, 2);
}
