import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformRole =
  | "platform_owner"
  | "platform_admin"
  | "platform_support"
  | "platform_finance"
  | "platform_security"
  | "platform_readonly";

export type PlatformSession = {
  userId: string;
  email: string;
  role: PlatformRole;
  source: "database";
  twoFactorVerified: boolean;
  hostAllowed: boolean;
};

export const platformRoleLabels: Record<PlatformRole, string> = {
  platform_owner: "Dono",
  platform_admin: "Admin",
  platform_support: "Suporte",
  platform_finance: "Financeiro",
  platform_security: "Segurança",
  platform_readonly: "Leitura",
};

function parseEmailList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function roleFromEnv(email: string): PlatformRole | null {
  const normalized = email.toLowerCase();
  const owners = parseEmailList(process.env.PLATFORM_OWNER_EMAILS);
  const admins = parseEmailList(process.env.PLATFORM_ADMIN_EMAILS);
  const support = parseEmailList(process.env.PLATFORM_SUPPORT_EMAILS);
  const finance = parseEmailList(process.env.PLATFORM_FINANCE_EMAILS);
  const security = parseEmailList(process.env.PLATFORM_SECURITY_EMAILS);
  const readonly = parseEmailList(process.env.PLATFORM_READONLY_EMAILS);

  if (owners.has(normalized)) return "platform_owner";
  if (admins.has(normalized)) return "platform_admin";
  if (support.has(normalized)) return "platform_support";
  if (finance.has(normalized)) return "platform_finance";
  if (security.has(normalized)) return "platform_security";
  if (readonly.has(normalized)) return "platform_readonly";
  return null;
}

function adminAllowedEmails() {
  return new Set([
    ...parseEmailList(process.env.ADMIN_ALLOWED_EMAILS),
    ...parseEmailList(process.env.PLATFORM_OWNER_EMAILS),
    ...parseEmailList(process.env.PLATFORM_ADMIN_EMAILS),
    ...parseEmailList(process.env.PLATFORM_SUPPORT_EMAILS),
    ...parseEmailList(process.env.PLATFORM_FINANCE_EMAILS),
    ...parseEmailList(process.env.PLATFORM_SECURITY_EMAILS),
    ...parseEmailList(process.env.PLATFORM_READONLY_EMAILS),
  ]);
}

async function isHostAllowed() {
  const allowedHosts = parseEmailList(process.env.ADMIN_ALLOWED_HOSTS);
  if (!allowedHosts.size) return true;
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  return Boolean(host && allowedHosts.has(host));
}

export function hasPlatformRole(
  currentRole: PlatformRole,
  allowedRoles: PlatformRole[],
) {
  if (allowedRoles.includes(currentRole)) return true;
  return currentRole === "platform_owner";
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const hostAllowed = await isHostAllowed();
  if (!hostAllowed) return null;

  const allowedEmails = adminAllowedEmails();
  if (!allowedEmails.has(email)) return null;

  const { data: staff } = await supabase
    .from("platform_admin_users")
    .select("role,status,require_2fa")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const dbRole = staff?.role as PlatformRole | undefined;
  const envRole = roleFromEnv(email);
  const role = dbRole;

  if (!role) return null;
  if (envRole && envRole !== role && envRole !== "platform_owner") return null;

  const factors =
    (user as { factors?: Array<{ status?: string }> }).factors ?? [];
  const requireTwoFactor =
    staff?.require_2fa !== false &&
    ["platform_owner", "platform_admin"].includes(role) &&
    process.env.PLATFORM_ADMIN_REQUIRE_2FA !== "false" &&
    process.env.ADMIN_REQUIRE_MFA !== "false";
  const twoFactorVerified =
    !requireTwoFactor || factors.some((factor) => factor.status === "verified");

  return {
    userId: user.id,
    email,
    role,
    source: "database",
    twoFactorVerified,
    hostAllowed,
  };
}

export async function requirePlatformSession(
  allowedRoles: PlatformRole[] = [
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
    "platform_readonly",
  ],
) {
  const session = await getPlatformSession();

  if (!session) redirect("/app");
  if (!hasPlatformRole(session.role, allowedRoles)) redirect("/admin");
  if (!session.twoFactorVerified) redirect("/app");

  return session;
}

export async function getRequestAuditContext() {
  const headerStore = await headers();
  return {
    ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}
