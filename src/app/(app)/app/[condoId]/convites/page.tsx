import { QRCodeCard } from "@/components/app/qr-code-card";
import { ResidentInvitePanel } from "@/components/app/resident-invite-panel";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { getPublicAppUrl } from "@/lib/public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const [{ data: condo }, { data: apartments }, { data: invites }] =
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
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const appUrl = getPublicAppUrl();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Convites</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Gere links por apartamento. Se informar e-mail, o convite também fica pronto para envio; se não, copie o link.
        </p>
      </div>

      <ResidentInvitePanel
        condoId={condoId}
        apartments={(apartments ?? []) as never}
        selectedApartmentId={selectedApartmentId}
      />

      <Card className="p-5">
        <p className="text-sm font-semibold">Código do condomínio para login</p>
        <p className="mt-2 break-all text-2xl font-semibold">{condo?.slug ?? "codigo-indisponivel"}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Moradores, síndicos e guarita usam este código na opção “Condomínio”
          da tela Entrar, junto com o e-mail e a senha criados pelo convite.
        </p>
      </Card>

      <QRCodeCard
        title="QR Code público da portaria"
        value={`${appUrl}/visitante/${condo?.public_code ?? condoId}`}
      />

      <Card id="convites-recentes" className="p-6">
        <h2 className="text-xl font-semibold">Convites recentes</h2>
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
            <p className="text-sm text-muted-foreground">Nenhum convite criado ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
