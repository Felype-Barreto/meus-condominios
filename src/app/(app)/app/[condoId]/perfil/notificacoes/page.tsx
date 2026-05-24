import { Bell } from "lucide-react";
import { NotificationPreferencesCard } from "@/components/app/notification-preferences-card";
import { WhatsAppConsentManager } from "@/components/app/whatsapp-consent-manager";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWhatsAppCategories } from "@/lib/whatsapp/consent";
import { updateNotificationPreferencesAction } from "./actions";

type PrivacySettings = {
  allow_public_contact?: boolean;
  allow_whatsapp_redirect?: boolean;
};

export default async function NotificationPreferencesPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: membership }, { data: optIn }] = await Promise.all([
    user
      ? supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("memberships")
          .select("id, status, privacy_settings")
          .eq("condominium_id", condoId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("whatsapp_opt_ins")
          .select("phone, opted_in, categories")
          .eq("condominium_id", condoId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const privacy = (membership?.privacy_settings ?? {}) as PrivacySettings;
  const categories = normalizeWhatsAppCategories(optIn?.categories);

  if (!user || !membership) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Preferências indisponíveis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre na sua conta e acesse um condomínio onde você tenha vínculo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Perfil</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Notificações e consentimentos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Controle WhatsApp, avisos urgentes, encomendas, agendamentos, resumos
          e contato pelo QR público.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <NotificationPreferencesCard />
          <Card className="p-5">
            <Bell className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Dados usados para avisos</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-lg border bg-background p-3">
                <span className="block text-muted-foreground">Nome</span>
                <strong>{profile?.full_name ?? "Não informado"}</strong>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <span className="block text-muted-foreground">E-mail</span>
                <strong className="break-all">{profile?.email ?? user.email ?? "Não informado"}</strong>
              </div>
            </div>
          </Card>
        </div>

        <WhatsAppConsentManager
          condoId={condoId}
          phone={optIn?.phone ?? profile?.phone ?? ""}
          optedIn={Boolean(optIn?.opted_in)}
          categories={categories}
          allowPublicContact={privacy.allow_public_contact ?? false}
          allowWhatsAppRedirect={privacy.allow_whatsapp_redirect ?? false}
          action={updateNotificationPreferencesAction}
        />
      </div>
    </div>
  );
}
