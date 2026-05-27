import { QRCodeCard } from "@/components/app/qr-code-card";
import { ResidentInvitePanel } from "@/components/app/resident-invite-panel";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getPublicAppUrl } from "@/lib/public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { reviewResidentMembershipAction } from "../moradores/actions";

type PendingMembership = {
  id: string;
  role: "resident" | "owner";
  status: string;
  created_at: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  apartments?: {
    number?: string | null;
    blocks?: { name?: string | null } | null;
  } | null;
};

function inviteLabel(type: string) {
  const labels: Record<string, string> = {
    resident: "Morador",
    owner: "Proprietário",
    syndic: "Síndico",
    doorman: "Guarita",
    admin: "Administração",
  };
  return labels[type] ?? type;
}

export default async function InvitesPage({
  params,
  searchParams,
}: {
  params: Promise<{ condoId: string }>;
  searchParams?: Promise<{ apartamento?: string }>;
}) {
  const { condoId } = await params;
  const selectedApartmentId = (await searchParams)?.apartamento ?? "";
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  if (access.isResident || access.isDoorman) redirect(`/app/${condoId}/dashboard`);
  const [{ data: condo }, { data: apartments }, { data: invites }, { data: pendingMemberships }] =
    await Promise.all([
      supabase
        .from("condominiums")
        .select("name, slug, public_code")
        .eq("id", condoId)
        .single(),
      supabase
        .from("apartments")
        .select("id,number,blocks(name)")
        .eq("condominium_id", condoId)
        .order("number", { ascending: true }),
      supabase
        .from("invites")
        .select("token,invite_type,role,email,status,created_at,expires_at")
        .eq("condominium_id", condoId)
        .eq("status", "active")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("memberships")
        .select(
          `
          id,
          role,
          status,
          created_at,
          profiles!memberships_user_id_fkey(full_name,email),
          apartments(number,blocks(name))
        `,
        )
        .eq("condominium_id", condoId)
        .in("role", ["resident", "owner"])
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  const appUrl = getPublicAppUrl();
  const pendingRows = (pendingMemberships ?? []) as unknown as PendingMembership[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Convites</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Gere links por apartamento. Convites de morador expiram em 10 minutos, podem ser usados
          uma vez e somem desta lista depois de usados ou expirados.
        </p>
      </div>

      <ResidentInvitePanel
        condoId={condoId}
        apartments={(apartments ?? []) as never}
        selectedApartmentId={selectedApartmentId}
      />

      <Card className="p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Cadastros pendentes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Revise cadastros enviados por link. O responsável do apartamento é definido na tela
              Pessoas e serve apenas como contato principal para portaria e QR.
            </p>
          </div>
          <StatusBadge tone={pendingRows.length ? "warning" : "success"}>
            {pendingRows.length} pendente(s)
          </StatusBadge>
        </div>

        <div className="mt-5 space-y-3">
          {pendingRows.length ? (
            pendingRows.map((membership) => (
              <div
                key={membership.id}
                className="flex flex-col gap-4 rounded-lg border bg-muted p-4 transition hover:border-primary/60 hover:shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="warning">Pendente</StatusBadge>
                    <StatusBadge tone="neutral">{inviteLabel(membership.role)}</StatusBadge>
                  </div>
                  <p className="mt-3 font-semibold">
                    {membership.profiles?.full_name ?? membership.profiles?.email ?? "Cadastro sem nome"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {membership.apartments?.blocks?.name ?? "Bloco não informado"} -{" "}
                    {membership.apartments?.number ?? "Apartamento não informado"}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {membership.profiles?.email ?? "E-mail não informado"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={reviewResidentMembershipAction}>
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="membership_id" value={membership.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit" size="sm">
                      Aprovar
                    </Button>
                  </form>
                  <form action={reviewResidentMembershipAction}>
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="membership_id" value={membership.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button type="submit" size="sm" variant="outline">
                      Rejeitar
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum cadastro pendente ocupando vagas de responsável agora.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold">Código do condomínio para login</p>
        <p className="mt-2 break-all text-2xl font-semibold">{condo?.slug ?? "codigo-indisponivel"}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Moradores, síndicos e guarita usam este código na opção "Condomínio" da tela Entrar,
          junto com o e-mail e a senha criados pelo convite.
        </p>
      </Card>

      <QRCodeCard
        title="QR Code público da portaria"
        value={`${appUrl}/visitante/${condo?.public_code ?? condoId}`}
      />

      <Card id="convites-recentes" className="p-6">
        <h2 className="text-xl font-semibold">Convites ativos</h2>
        <div className="mt-5 space-y-3">
          {invites?.length ? (
            invites.map((invite) => (
              <div
                key={invite.token}
                className="flex flex-col gap-2 rounded-lg border bg-muted p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{invite.email ?? "Link copiável"}</p>
                  <p className="break-all text-sm text-muted-foreground">
                    {appUrl}/convite/{invite.token}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inviteLabel(invite.invite_type)} / {inviteLabel(invite.role)}
                  </p>
                </div>
                <StatusBadge tone={invite.status === "active" ? "success" : "neutral"}>
                  {invite.status === "active" ? "Ativo" : invite.status}
                </StatusBadge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum convite ativo no momento.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
