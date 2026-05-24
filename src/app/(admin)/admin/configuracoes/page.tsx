import { updatePlatformSettingsAction } from "@/app/(admin)/admin/actions";
import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { platformRoleLabels, requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase, maskEmail } from "@/lib/admin/data";
import {
  mergePlatformSetting,
  platformSettingsKeys,
  type PlatformSettingsKey,
} from "@/lib/admin/platform-settings";

const roleEnvKeys = [
  "PLATFORM_OWNER_EMAILS",
  "PLATFORM_ADMIN_EMAILS",
  "PLATFORM_SUPPORT_EMAILS",
  "PLATFORM_FINANCE_EMAILS",
  "PLATFORM_SECURITY_EMAILS",
  "PLATFORM_READONLY_EMAILS",
];

const roleOptions = [
  "platform_admin",
  "platform_support",
  "platform_finance",
  "platform_security",
  "platform_readonly",
];

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberText(value: unknown) {
  return typeof value === "number" ? String(value) : String(value ?? "");
}

function bool(value: unknown) {
  return value === true;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function TextArea({
  name,
  defaultValue,
  disabled,
  rows = 3,
}: {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue}
      disabled={disabled}
      rows={rows}
      className="w-full rounded-lg border bg-card px-3.5 py-3 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function CheckField({
  label,
  name,
  defaultChecked,
  disabled,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 text-sm">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function SectionCard({
  title,
  description,
  section,
  canEdit,
  children,
}: {
  title: string;
  description: string;
  section: PlatformSettingsKey;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <AdminStatus value={canEdit ? "editavel" : "somente_leitura"} />
      </div>
      <form action={updatePlatformSettingsAction} className="mt-5 grid gap-4">
        <input type="hidden" name="section" value={section} />
        {children}
        <div className="flex justify-end">
          <Button type="submit" disabled={!canEdit}>
            Salvar {title}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default async function AdminSettingsPage() {
  const session = await requirePlatformSession([
    "platform_owner",
    "platform_admin",
    "platform_support",
    "platform_finance",
    "platform_security",
    "platform_readonly",
  ]);
  const supabase = createAdminSupabase();
  const [{ data: staff }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("platform_admin_users")
      .select("id,role,status,require_2fa,created_at,profiles(email)")
      .order("created_at", { ascending: false }),
    supabase.from("platform_settings").select("key,value,updated_at").in("key", platformSettingsKeys),
  ]);

  const settings = Object.fromEntries(
    platformSettingsKeys.map((key) => {
      const row = (settingsRows ?? []).find((item) => item.key === key);
      return [key, mergePlatformSetting(key, row?.value as Record<string, unknown> | null)];
    }),
  ) as Record<PlatformSettingsKey, Record<string, unknown>>;

  const configuredEnvKeys = roleEnvKeys.filter((key) => Boolean(process.env[key]));
  const canEditCritical = session.role === "platform_owner";
  const canEditNonCritical = session.role === "platform_owner" || session.role === "platform_admin";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Configuracoes internas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Parametros globais da plataforma sem expor tokens, secrets ou chaves sensiveis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Equipe no banco" value={staff?.length ?? 0} />
        <AdminMetricCard label="Allowlists env" value={configuredEnvKeys.length} />
        <AdminMetricCard label="Secoes configuraveis" value={platformSettingsKeys.length} />
        <AdminMetricCard label="Seu papel" value={platformRoleLabels[session.role]} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Credenciais e segredos</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tokens, service role, senhas, chaves privadas e credenciais de provedores devem ficar apenas em variaveis de ambiente. Esta tela bloqueia valores com cara de segredo e nao exibe allowlists completas vindas do ambiente.
        </p>
      </Card>

      <SectionCard
        title="Planos"
        description="Precos exibidos, status comercial e texto de limites. Alteracao critica: somente platform_owner."
        section="plans"
        canEdit={canEditCritical}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Gratis mensal"><Input name="free_price_monthly" defaultValue={text(settings.plans.free_price_monthly)} disabled={!canEditCritical} /></Field>
          <Field label="Premium mensal"><Input name="premium_price_monthly" defaultValue={text(settings.plans.premium_price_monthly)} disabled={!canEditCritical} /></Field>
          <Field label="Premium anual"><Input name="premium_price_yearly" defaultValue={text(settings.plans.premium_price_yearly)} disabled={!canEditCritical} /></Field>
          <Field label="Pro mensal"><Input name="pro_price_monthly" defaultValue={text(settings.plans.pro_price_monthly)} disabled={!canEditCritical} /></Field>
          <Field label="Pro anual"><Input name="pro_price_yearly" defaultValue={text(settings.plans.pro_price_yearly)} disabled={!canEditCritical} /></Field>
          <Field label="Total mensal"><Input name="total_price_monthly" defaultValue={text(settings.plans.total_price_monthly)} disabled={!canEditCritical} /></Field>
          <Field label="Total anual"><Input name="total_price_yearly" defaultValue={text(settings.plans.total_price_yearly)} disabled={!canEditCritical} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <CheckField name="free_active" label="Gratis ativo" defaultChecked={bool(settings.plans.free_active)} disabled={!canEditCritical} />
          <CheckField name="premium_active" label="Premium ativo" defaultChecked={bool(settings.plans.premium_active)} disabled={!canEditCritical} />
          <CheckField name="pro_active" label="Pro ativo" defaultChecked={bool(settings.plans.pro_active)} disabled={!canEditCritical} />
          <CheckField name="total_active" label="Total ativo" defaultChecked={bool(settings.plans.total_active)} disabled={!canEditCritical} />
        </div>
        <Field label="Texto comercial"><TextArea name="commercial_text" defaultValue={text(settings.plans.commercial_text)} disabled={!canEditCritical} /></Field>
        <Field label="Resumo de limites"><TextArea name="limits_text" defaultValue={text(settings.plans.limits_text)} disabled={!canEditCritical} /></Field>
      </SectionCard>

      <SectionCard
        title="WhatsApp"
        description="Creditos por plano, add-ons, limite diario e bloqueio operacional global. Nao salve credenciais Meta aqui."
        section="whatsapp"
        canEdit={canEditCritical}
      >
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Gratis"><Input name="free_credits" type="number" defaultValue={numberText(settings.whatsapp.free_credits)} disabled={!canEditCritical} /></Field>
          <Field label="Premium"><Input name="premium_credits" type="number" defaultValue={numberText(settings.whatsapp.premium_credits)} disabled={!canEditCritical} /></Field>
          <Field label="Pro"><Input name="pro_credits" type="number" defaultValue={numberText(settings.whatsapp.pro_credits)} disabled={!canEditCritical} /></Field>
          <Field label="Total"><Input name="total_credits" type="number" defaultValue={numberText(settings.whatsapp.total_credits)} disabled={!canEditCritical} /></Field>
          <Field label="Limite diario/condo"><Input name="daily_limit_per_condo" type="number" defaultValue={numberText(settings.whatsapp.daily_limit_per_condo)} disabled={!canEditCritical} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Status global">
            <select name="global_status" defaultValue={text(settings.whatsapp.global_status)} disabled={!canEditCritical} className="h-11 rounded-lg border bg-card px-3 text-sm">
              <option value="not_configured">Nao configurado</option>
              <option value="configured">Configurado</option>
              <option value="degraded">Instavel</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </Field>
          <CheckField name="globally_blocked" label="Bloquear automacao WhatsApp globalmente" defaultChecked={bool(settings.whatsapp.globally_blocked)} disabled={!canEditCritical} />
        </div>
        <Field label="Add-ons exibidos"><TextArea name="addons_text" defaultValue={text(settings.whatsapp.addons_text)} disabled={!canEditCritical} /></Field>
        <Field label="Motivo do bloqueio"><TextArea name="block_reason" defaultValue={text(settings.whatsapp.block_reason)} disabled={!canEditCritical} rows={2} /></Field>
      </SectionCard>

      <SectionCard
        title="Seguranca"
        description="2FA, allowlist, rate limits e chaves globais de protecao. Alteracao critica: somente platform_owner."
        section="security"
        canEdit={canEditCritical}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CheckField name="require_2fa_admin" label="Exigir 2FA para admin" defaultChecked={bool(settings.security.require_2fa_admin)} disabled={!canEditCritical} />
          <CheckField name="qr_public_global_enabled" label="QR publico global habilitado" defaultChecked={bool(settings.security.qr_public_global_enabled)} disabled={!canEditCritical} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Rate limit admin por 10 min"><Input name="admin_rate_limit_per_10min" type="number" defaultValue={numberText(settings.security.admin_rate_limit_per_10min)} disabled={!canEditCritical} /></Field>
          <Field label="Limite de revelacao sensivel por 10 min"><Input name="sensitive_reveal_limit_per_10min" type="number" defaultValue={numberText(settings.security.sensitive_reveal_limit_per_10min)} disabled={!canEditCritical} /></Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Bloquear revelacao sensivel para papeis</p>
          <div className="grid gap-2 md:grid-cols-3">
            {roleOptions.map((role) => (
              <CheckField
                key={role}
                name="sensitive_reveal_blocked_roles"
                label={role}
                defaultChecked={list(settings.security.sensitive_reveal_blocked_roles).includes(role)}
                disabled={!canEditCritical}
              />
            ))}
          </div>
        </div>
        <Field label="Allowlist adicional de e-mails internos">
          <TextArea name="allowlist_emails" defaultValue={text(settings.security.allowlist_emails)} disabled={!canEditCritical} rows={4} />
        </Field>
      </SectionCard>

      <SectionCard
        title="Suporte"
        description="Parametros nao criticos de atendimento. platform_admin pode alterar."
        section="support"
        canEdit={canEditNonCritical}
      >
        <Field label="E-mail de suporte"><Input name="support_email" defaultValue={text(settings.support.support_email)} disabled={!canEditNonCritical} /></Field>
        <Field label="Categorias"><Input name="categories" defaultValue={text(settings.support.categories)} disabled={!canEditNonCritical} /></Field>
        <Field label="Mensagem padrao"><TextArea name="default_message" defaultValue={text(settings.support.default_message)} disabled={!canEditNonCritical} /></Field>
        <Field label="Horario de atendimento textual"><TextArea name="service_hours" defaultValue={text(settings.support.service_hours)} disabled={!canEditNonCritical} rows={2} /></Field>
      </SectionCard>

      <SectionCard
        title="Legal"
        description="Versoes e links legais usados em telas e consentimentos. platform_admin pode alterar."
        section="legal"
        canEdit={canEditNonCritical}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Versao dos termos"><Input name="terms_version" defaultValue={text(settings.legal.terms_version)} disabled={!canEditNonCritical} /></Field>
          <Field label="Versao da privacidade"><Input name="privacy_version" defaultValue={text(settings.legal.privacy_version)} disabled={!canEditNonCritical} /></Field>
          <Field label="Versao consentimento WhatsApp"><Input name="whatsapp_consent_version" defaultValue={text(settings.legal.whatsapp_consent_version)} disabled={!canEditNonCritical} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Link termos"><Input name="terms_url" defaultValue={text(settings.legal.terms_url)} disabled={!canEditNonCritical} /></Field>
          <Field label="Link privacidade"><Input name="privacy_url" defaultValue={text(settings.legal.privacy_url)} disabled={!canEditNonCritical} /></Field>
          <Field label="Link cookies"><Input name="cookies_url" defaultValue={text(settings.legal.cookies_url)} disabled={!canEditNonCritical} /></Field>
          <Field label="Link cancelamento"><Input name="cancellation_url" defaultValue={text(settings.legal.cancellation_url)} disabled={!canEditNonCritical} /></Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Manutencao"
        description="Modo manutencao e bloqueio temporario de novos cadastros. Alteracao critica: somente platform_owner."
        section="maintenance"
        canEdit={canEditCritical}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CheckField name="maintenance_mode" label="Ativar modo manutencao" defaultChecked={bool(settings.maintenance.maintenance_mode)} disabled={!canEditCritical} />
          <CheckField name="block_new_signups" label="Bloquear novos cadastros temporariamente" defaultChecked={bool(settings.maintenance.block_new_signups)} disabled={!canEditCritical} />
        </div>
        <Field label="Mensagem de manutencao"><TextArea name="maintenance_message" defaultValue={text(settings.maintenance.maintenance_message)} disabled={!canEditCritical} /></Field>
      </SectionCard>

      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Equipe cadastrada</h2>
          <p className="mt-1 text-sm text-muted-foreground">E-mails mascarados. Allowlist de ambiente mostra apenas quais variaveis existem.</p>
        </div>
        <div className="divide-y">
          {(staff ?? []).map((member) => {
            const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
            return (
              <div
                key={member.id}
                className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{maskEmail(profile?.email)}</p>
                  <p className="text-xs text-muted-foreground">
                    {platformRoleLabels[member.role as keyof typeof platformRoleLabels] ?? member.role} - 2FA{" "}
                    {member.require_2fa ? "obrigatorio" : "opcional"}
                  </p>
                </div>
                <AdminStatus value={member.status} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
