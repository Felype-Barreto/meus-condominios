import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Database, LifeBuoy, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateAccountProfileAction } from "./actions";

export default async function AccountSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Minha conta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Configuracoes da conta</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Estas configuracoes acompanham sua conta, independentemente do condominio aberto.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Perfil</h2>
          </div>
          <form action={updateAccountProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input value={profile?.email ?? user.email ?? ""} readOnly />
            </div>
            <Button type="submit" className="md:w-fit">
              Salvar perfil
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Atalhos da conta</h2>
          <div className="mt-5 grid gap-3">
            <Button asChild variant="outline">
              <Link href="/app/assinatura">Assinatura e limites</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/condominios">Condominios administrados</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/notificacoes">
                <Bell className="h-4 w-4" />
                Notificacoes
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/meus-dados">
                <Database className="h-4 w-4" />
                Meus dados
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/suporte">
                <LifeBuoy className="h-4 w-4" />
                Suporte
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
