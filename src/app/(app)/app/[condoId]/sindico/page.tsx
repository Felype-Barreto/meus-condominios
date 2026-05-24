import { CalendarDays, Mail, ShieldCheck, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { PermissionToggle } from "@/components/app/permission-toggle";
import { RoleBadge } from "@/components/common/role-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultSyndicPermissions } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  becomeSyndicAction,
  inviteSyndicAction,
  removeSyndicAction,
  updateSyndicPermissionsAction,
} from "./actions";

type SyndicMembership = {
  id: string;
  role: "subscriber_admin" | "syndic";
  status: string;
  permissions: Record<string, boolean>;
  is_primary_syndic: boolean;
  user_id: string;
};

type SyndicProfile = {
  membership_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  start_date: string | null;
  professional_note: string | null;
};

export default async function SyndicPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: condo }, { data: memberships }, { data: profiles }, { data: invites }] =
    await Promise.all([
      supabase
        .from("condominiums")
        .select("id,name,plan")
        .eq("id", condoId)
        .single(),
      supabase
        .from("memberships")
        .select("id,role,status,permissions,is_primary_syndic,user_id")
        .eq("condominium_id", condoId)
        .or("role.eq.syndic,is_primary_syndic.eq.true")
        .order("created_at", { ascending: false }),
      supabase
        .from("syndic_profiles")
        .select("membership_id,full_name,email,phone,status,start_date,professional_note")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invites")
        .select("token,email,status,created_at,expires_at")
        .eq("condominium_id", condoId)
        .eq("invite_type", "syndic")
        .order("created_at", { ascending: false }),
    ]);

  const syndicMemberships = (memberships ?? []) as SyndicMembership[];
  const syndicProfiles = (profiles ?? []) as SyndicProfile[];
  const primary =
    syndicMemberships.find((membership) => membership.is_primary_syndic) ??
    syndicMemberships.find((membership) => membership.status === "active");
  const primaryProfile = primary
    ? syndicProfiles.find((profile) => profile.membership_id === primary.id)
    : undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {condo?.name ?? "Condomínio"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Síndico</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            O assinante principal sempre mantém acesso máximo. O síndico atua
            com permissões configuradas pelo administrador.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/${condoId}/permissoes`}>
            <ShieldCheck className="h-4 w-4" />
            Ver permissões
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <UserRoundCheck className="h-7 w-7 text-primary" />
            <h2 className="mt-5 text-xl font-semibold">Síndico atual</h2>
            {primary ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role={primary.role} />
                  <StatusBadge tone={primary.status === "active" ? "success" : "warning"}>
                    {primary.status === "active" ? "Ativo" : "Pendente"}
                  </StatusBadge>
                  {primary.is_primary_syndic ? (
                    <StatusBadge tone="success">Síndico principal</StatusBadge>
                  ) : null}
                </div>
                <p className="text-lg font-semibold">
                  {primaryProfile?.full_name ?? "Perfil em configuração"}
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  {primaryProfile?.email ? (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {primaryProfile.email}
                    </span>
                  ) : null}
                  {primaryProfile?.start_date ? (
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Início em {primaryProfile.start_date}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-warning">
                Este condomínio ainda não possui síndico definido.
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:min-w-64">
            <form action={becomeSyndicAction}>
              <input type="hidden" name="condoId" value={condoId} />
              <Button className="w-full" type="submit">
                Eu sou o síndico
              </Button>
            </form>
            {primary ? (
              <>
                <Button className="w-full" variant="outline" asChild>
                  <a href="#convidar-sindico">Trocar síndico</a>
                </Button>
                <form action={removeSyndicAction}>
                  <input type="hidden" name="condoId" value={condoId} />
                  <input type="hidden" name="membershipId" value={primary.id} />
                  <Button className="w-full" variant="outline" type="submit">
                    Remover síndico
                  </Button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <Card id="convidar-sindico" className="p-6">
        <h2 className="text-xl font-semibold">Convidar síndico</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O convite cria um cadastro simples de síndico e pode ser aprovado
          automaticamente conforme configuração do condomínio.
        </p>
        <form action={inviteSyndicAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="condoId" value={condoId} />
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="sindico@email.com" />
          </div>
          <Button type="submit" className="self-end">
            Convidar síndico
          </Button>
        </form>
        {invites?.length ? (
          <div className="mt-5 space-y-3">
            {invites.slice(0, 3).map((invite) => {
              const inviteUrl = `${appUrl}/convite/${invite.token}`;
              return (
                <div key={invite.token} className="rounded-lg border bg-muted p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{invite.email}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {inviteUrl}
                      </p>
                    </div>
                    <StatusBadge tone={invite.status === "active" ? "success" : "neutral"}>
                      {invite.status}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

      {primary ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Permissões do síndico</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O síndico não controla assinatura nem troca de plano por padrão.
          </p>
          <form action={updateSyndicPermissionsAction} className="mt-5 space-y-3">
            <input type="hidden" name="condoId" value={condoId} />
            <input type="hidden" name="membershipId" value={primary.id} />
            <div className="grid gap-3 lg:grid-cols-2">
              {Object.entries(defaultSyndicPermissions).map(([key, defaultValue]) => (
                <PermissionToggle
                  key={key}
                  name={key}
                  title={key}
                  description={defaultValue ? "Liberado por padrão" : "Bloqueado por padrão"}
                  checked={primary.permissions?.[key] ?? defaultValue}
                />
              ))}
            </div>
            <Button type="submit">Salvar permissões</Button>
          </form>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Histórico básico</h2>
        <div className="mt-5 space-y-3">
          {syndicProfiles.length ? (
            syndicProfiles.map((profile) => (
              <div
                key={profile.membership_id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.professional_note ?? "Sem observação profissional"}
                  </p>
                </div>
                <StatusBadge tone={profile.status === "active" ? "success" : "neutral"}>
                  {profile.status}
                </StatusBadge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum síndico registrado ainda.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
