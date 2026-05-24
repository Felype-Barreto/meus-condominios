import { AlertTriangle, LogOut, MessageCircle, QrCode, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateMyProfileAction } from "./actions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name,email,phone")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Configurações</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Preferências da sua conta, privacidade, comunicação e operação do condomínio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 md:col-span-2">
          <UserRound className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Minha conta</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Atualize seu nome e telefone de contato. O e-mail da conta é usado para entrar no Meus Condomínios.
          </p>
          <form action={updateMyProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="condominium_id" value={condoId} />
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="(11) 90000-0000" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail de acesso</Label>
              <Input value={profile?.email ?? user?.email ?? ""} readOnly />
              <p className="text-xs text-muted-foreground">Para trocar o e-mail, use o fluxo de segurança da conta.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
              <Button type="submit">Salvar meus dados</Button>
              <Button type="submit" formAction={signOutAction} variant="outline">
                <LogOut className="h-4 w-4" />
                Sair da conta
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Meus dados e privacidade</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Exporte seus dados, solicite correção/exclusão e controle WhatsApp, telefone e QR público.
          </p>
          <Button asChild className="mt-5">
            <Link href={`/app/${condoId}/configuracoes/privacidade`}>Gerenciar privacidade</Link>
          </Button>
          <Button asChild className="mt-3" variant="outline">
            <Link href="/app/meus-dados">Central dos meus dados</Link>
          </Button>
          <Button asChild className="mt-3" variant="outline">
            <Link href={`/app/${condoId}/configuracoes/dados`}>Dados do condomínio</Link>
          </Button>
        </Card>

        <Card className="p-5">
          <QrCode className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">QR público seguro</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gere o QR para visitantes solicitarem contato sem exposição de moradores ou telefones.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href={`/app/${condoId}/configuracoes/qr-publico`}>Configurar QR público</Link>
          </Button>
        </Card>

        <Card className="p-5">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">WhatsApp</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure modo manual, créditos, opt-in, templates e integração futura com WhatsApp Business.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href={`/app/${condoId}/configuracoes/whatsapp`}>Configurar WhatsApp</Link>
          </Button>
          <Button asChild className="mt-3" variant="outline">
            <Link href={`/app/${condoId}/perfil/notificacoes`}>Minhas notificações</Link>
          </Button>
        </Card>

        <Card className="p-5">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Preferências gerais</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Dados cadastrais, canais oficiais e regras globais do condomínio serão centralizados aqui.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href={`/app/${condoId}/permissoes`}>Ver permissões</Link>
          </Button>
        </Card>

        <Card className="p-5">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Denúncias de abuso</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe denúncias sensíveis com discrição e registre providências.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href={`/app/${condoId}/seguranca/denuncias`}>Ver denúncias</Link>
          </Button>
          <Button asChild className="mt-3" variant="outline">
            <Link href={`/app/${condoId}/seguranca/incidentes`}>Ver incidentes</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
