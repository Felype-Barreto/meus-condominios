import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DoormanInviteForm } from "@/components/public/doorman-invite-form";
import { ResidentInviteForm } from "@/components/public/resident-invite-form";
import { SyndicInviteForm } from "@/components/public/syndic-invite-form";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePublic = {
  condominium_name?: string;
  condominium_code?: string | null;
  invite_type?: string;
  email?: string | null;
  status?: string;
  valid?: boolean;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_invite_public", {
    invite_token: token,
  });

  const invite = data as InvitePublic | null;

  if (error || !invite) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <h1 className="mt-5 text-2xl font-semibold">Convite não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique se o link foi copiado corretamente ou peça um novo convite ao administrador.
          </p>
        </Card>
      </section>
    );
  }

  if (!invite.valid) {
    const used = invite.status === "used";

    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-6">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <h1 className="mt-5 text-2xl font-semibold">
            {used ? "Convite já utilizado" : "Convite indisponível"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {used
              ? "Este link já concluiu um cadastro. Para cadastrar outra pessoa, peça um novo convite à administração."
              : "Este convite expirou, foi revogado ou não está mais disponível."}
          </p>
        </Card>
      </section>
    );
  }

  const invitedEmail = invite.email?.trim() || undefined;
  const condominiumName = invite.condominium_name ?? "este condomínio";
  const condominiumCode = invite.condominium_code?.trim() || undefined;

  if (invite.invite_type === "doorman") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <DoormanInviteForm
          token={token}
          condominiumName={condominiumName}
          condominiumCode={condominiumCode}
          invitedEmail={invitedEmail}
        />
      </section>
    );
  }

  if (invite.invite_type === "resident" || invite.invite_type === "owner") {
    const { data: apartments } = await supabase.rpc("get_invite_apartments", {
      invite_token: token,
    });

    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <ResidentInviteForm
          token={token}
          condominiumName={condominiumName}
          condominiumCode={condominiumCode}
          invitedEmail={invitedEmail}
          inviteType={invite.invite_type === "owner" ? "owner" : "resident"}
          apartments={(apartments ?? []) as never}
        />
      </section>
    );
  }

  if (invite.invite_type !== "syndic") {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-6">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <h1 className="mt-5 text-2xl font-semibold">Convite recebido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este tipo de convite será tratado no próximo módulo de cadastro.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <SyndicInviteForm
        token={token}
        condominiumName={condominiumName}
        condominiumCode={condominiumCode}
        invitedEmail={invitedEmail}
      />
    </section>
  );
}
