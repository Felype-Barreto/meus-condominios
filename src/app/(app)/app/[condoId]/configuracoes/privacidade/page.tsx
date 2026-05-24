import { Download, Mail, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/status-badge";
import { officialContact } from "@/lib/app-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateWhatsAppOptInAction } from "@/app/(app)/app/[condoId]/whatsapp/actions";
import { updateMyPrivacySettingsAction } from "../actions";

type PrivacySettings = {
  allow_admin_contact?: boolean;
  allow_internal_search?: boolean;
  allow_public_qr_by_apartment?: boolean;
  allow_public_qr_by_name?: boolean;
  allow_whatsapp_redirect?: boolean;
  hide_phone_by_default?: boolean;
};

export default async function MyPrivacyPage({
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
    user ? supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("memberships")
          .select("id, role, status, privacy_settings")
          .eq("condominium_id", condoId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("whatsapp_opt_ins")
          .select("phone, opted_in, opted_in_at, opted_out_at")
          .eq("condominium_id", condoId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const settings = (membership?.privacy_settings ?? {}) as PrivacySettings;
  const defaultPhone = optIn?.phone ?? profile?.phone ?? "";
  const subject = encodeURIComponent("Solicitação de privacidade - Meus Condomínios");
  const correctionBody = encodeURIComponent(`Olá, quero solicitar correção dos meus dados no Meus Condomínios.\n\nNome: ${profile?.full_name ?? ""}\nE-mail: ${profile?.email ?? user?.email ?? ""}\nCondomínio: ${condoId}\nO que precisa ser corrigido:\n`);
  const deletionBody = encodeURIComponent(`Olá, quero solicitar exclusão ou revisão dos meus dados no Meus Condomínios.\n\nNome: ${profile?.full_name ?? ""}\nE-mail: ${profile?.email ?? user?.email ?? ""}\nCondomínio: ${condoId}\nDescrição do pedido:\n`);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Privacidade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Meus dados e consentimentos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Controle suas preferências de contato, QR público e WhatsApp. Seu telefone fica oculto por padrão em telas públicas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">Resumo da sua conta</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estes dados ajudam a localizar suas informações no condomínio e validar pedidos de privacidade.
              </p>
            </div>
            <StatusBadge tone={membership?.status === "active" ? "success" : "warning"}>
              {membership?.status === "active" ? "Cadastro ativo" : "Cadastro pendente"}
            </StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">Nome</span>
              <strong>{profile?.full_name ?? "Não informado"}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">E-mail</span>
              <strong className="break-all">{profile?.email ?? user?.email ?? "Não informado"}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">Papel</span>
              <strong>{membership?.role ?? "Não vinculado"}</strong>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={`/app/${condoId}/configuracoes/privacidade/export`}>
                <Download className="h-4 w-4" />
                Exportar meus dados
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${officialContact}?subject=${subject}&body=${correctionBody}`}>
                <Mail className="h-4 w-4" />
                Solicitar correção
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${officialContact}?subject=${subject}&body=${deletionBody}`}>
                Solicitar exclusão
              </a>
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <QrCode className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">QR público e busca interna</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Escolha como seu contato pode ser solicitado. O QR público não deve exibir seu telefone por padrão.
          </p>
          <form action={updateMyPrivacySettingsAction} className="mt-5 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="allow_admin_contact" type="checkbox" defaultChecked={settings.allow_admin_contact ?? true} className="mt-1 accent-[#7C5C3E]" />
              Permitir contato pela administração.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="allow_internal_search" type="checkbox" defaultChecked={settings.allow_internal_search ?? true} className="mt-1 accent-[#7C5C3E]" />
              Permitir aparecer em busca interna autorizada.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="allow_public_qr_by_apartment" type="checkbox" defaultChecked={settings.allow_public_qr_by_apartment ?? false} className="mt-1 accent-[#7C5C3E]" />
              Permitir QR público encontrar por apartamento.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="allow_public_qr_by_name" type="checkbox" defaultChecked={settings.allow_public_qr_by_name ?? false} className="mt-1 accent-[#7C5C3E]" />
              Permitir QR público encontrar por nome.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="allow_whatsapp_redirect" type="checkbox" defaultChecked={settings.allow_whatsapp_redirect ?? false} className="mt-1 accent-[#7C5C3E]" />
              Permitir redirecionamento para WhatsApp quando autorizado.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <input name="hide_phone_by_default" type="checkbox" value="on" defaultChecked={settings.hide_phone_by_default ?? true} className="mt-1 accent-[#7C5C3E]" />
              Ocultar telefone por padrão.
            </label>
            <Button type="submit" className="w-full sm:w-auto">Salvar privacidade</Button>
          </form>
        </Card>

        <Card className="p-5">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Consentimento WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Notificações automáticas por WhatsApp dependem do seu consentimento, plano, créditos e configuração do condomínio.
          </p>
          <div className="mt-4">
            <StatusBadge tone={optIn?.opted_in ? "success" : "warning"}>
              {optIn?.opted_in ? "Opt-in ativo" : "Sem opt-in"}
            </StatusBadge>
          </div>
          <form action={updateWhatsAppOptInAction} className="mt-5 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="opted_in" value="true" />
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone com DDD</Label>
              <Input id="phone" name="phone" inputMode="tel" placeholder="11999999999" defaultValue={defaultPhone} required />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Autorizar WhatsApp</Button>
          </form>
          {optIn?.opted_in ? (
            <form action={updateWhatsAppOptInAction} className="mt-3">
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="phone" value={optIn.phone ?? defaultPhone} />
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Revogar consentimento
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
