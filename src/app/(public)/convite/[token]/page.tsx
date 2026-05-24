import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DoormanInviteForm } from "@/components/public/doorman-invite-form";
import { ResidentInviteForm } from "@/components/public/resident-invite-form";
import { SyndicInviteForm } from "@/components/public/syndic-invite-form";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePublic = {
  condominium_name?: string;
  invite_type?: string;
  email?: string | null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invite = data as InvitePublic | null;

  if (error || !invite) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <h1 className="mt-5 text-2xl font-semibold">Convite não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique se o link foi copiado corretamente ou peça um novo convite
            ao administrador.
          </p>
        </Card>
      </section>
    );
  }

  if (!invite.valid) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-6">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <h1 className="mt-5 text-2xl font-semibold">Convite indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este convite expirou, foi revogado ou já foi utilizado.
          </p>
        </Card>
      </section>
    );
  }

  if (invite.invite_type === "doorman") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <DoormanInviteForm
          token={token}
          condominiumName={invite.condominium_name ?? "este condomínio"}
          invitedEmail={invite.email ?? undefined}
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
          condominiumName={invite.condominium_name ?? "este condomínio"}
          invitedEmail={invite.email ?? undefined}
          currentUserEmail={user?.email ?? undefined}
          currentUserName={
            typeof user?.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : undefined
          }
          emailVerified={Boolean(user?.email_confirmed_at)}
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
        condominiumName={invite.condominium_name ?? "este condomínio"}
        invitedEmail={invite.email ?? undefined}
      />
    </section>
  );
}
