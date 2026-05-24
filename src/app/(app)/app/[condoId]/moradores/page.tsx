import { Check, X } from "lucide-react";
import Link from "next/link";
import { RoleBadge } from "@/components/common/role-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewResidentMembershipAction } from "./actions";

type MembershipRow = {
  id: string;
  user_id: string | null;
  role: "resident" | "owner";
  status: string;
  profiles?: { id?: string | null; full_name?: string | null; email?: string | null; phone?: string | null } | null;
  apartments?: {
    number?: string | null;
    blocks?: { name?: string | null } | null;
  } | null;
};

type OptInRow = {
  user_id: string;
  phone: string | null;
  opted_in: boolean | null;
};

function getWhatsAppStatus(membership: MembershipRow, optIn?: OptInRow) {
  const phone = optIn?.phone ?? membership.profiles?.phone;
  if (!phone) return "telefone ausente";
  return optIn?.opted_in ? "opt-in ativo" : "opt-out";
}

function ResidentCard({
  condoId,
  membership,
  phoneVisible,
  whatsappStatus,
  pending,
}: {
  condoId: string;
  membership: MembershipRow;
  phoneVisible: boolean;
  whatsappStatus: string;
  pending?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <RoleBadge role={membership.role} />
            <StatusBadge tone={pending ? "warning" : "success"}>
              {pending ? "Pendente" : "Ativo"}
            </StatusBadge>
          </div>
          <p className="mt-3 font-semibold">
            {membership.profiles?.full_name ?? "Sem nome"}
          </p>
          <p className="text-sm text-muted-foreground">
            {membership.profiles?.email ?? "E-mail não informado"}
            {" · "}
            {phoneVisible ? membership.profiles?.phone ?? "Telefone não informado" : "Telefone oculto"}
          </p>
          <p className="text-sm text-muted-foreground">
            {membership.apartments?.blocks?.name ?? "Bloco"} - {membership.apartments?.number ?? "Apartamento"}
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            WhatsApp: {whatsappStatus}
          </p>
        </div>
        {pending ? (
          <div className="flex gap-2">
            <form action={reviewResidentMembershipAction}>
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="membership_id" value={membership.id} />
              <input type="hidden" name="decision" value="approve" />
              <Button type="submit" size="sm">
                <Check className="h-4 w-4" />
                Aprovar este cadastro
              </Button>
            </form>
            <form action={reviewResidentMembershipAction}>
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="membership_id" value={membership.id} />
              <input type="hidden" name="decision" value="reject" />
              <Button type="submit" size="sm" variant="outline">
                <X className="h-4 w-4" />
                Rejeitar
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function ResidentsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: condo },
    { data: isSubscriberAdmin },
    { data: canViewResidents },
    { data: canApproveResidents },
    { data: canViewPhone },
  ] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.view",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.approve",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "residents.view_phone",
    }),
  ]);

  const canOpenResidents = Boolean(
    user && (isSubscriberAdmin || canViewResidents || canApproveResidents),
  );

  if (!canOpenResidents) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Acesso limitado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu perfil nao tem permissao para ver cadastros de moradores neste
          condominio.
        </p>
      </Card>
    );
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      `
      id,
      user_id,
      role,
      status,
      created_at,
      profiles!memberships_user_id_fkey(id,full_name,email,phone),
      apartments(number,blocks(name))
    `,
    )
    .eq("condominium_id", condoId)
    .in("role", ["resident", "owner"])
    .order("created_at", { ascending: false });

  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const userIds = rows.map((row) => row.user_id).filter(Boolean) as string[];
  const { data: optIns } = userIds.length
      ? await supabase
        .from("whatsapp_opt_ins")
        .select("user_id, phone, opted_in")
        .eq("condominium_id", condoId)
        .in("user_id", userIds)
    : { data: [] };

  const optInByUser = new Map(
    ((optIns ?? []) as OptInRow[]).map((item) => [item.user_id, item]),
  );
  const phoneVisible = Boolean(isSubscriberAdmin || canViewPhone);
  const pending = rows.filter((membership) => membership.status === "pending");
  const active = rows.filter((membership) => membership.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Moradores</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Aprove cadastros pendentes olhando quem solicitou, o apartamento e o
            status geral de WhatsApp. Telefones completos só aparecem para quem
            tem permissão.
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/${condoId}/convites`}>Convidar morador</Link>
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Moradores pendentes</h2>
        <div className="mt-5 space-y-3">
          {pending.length ? (
            pending.map((membership) => (
              <ResidentCard
                key={membership.id}
                condoId={condoId}
                membership={membership}
                phoneVisible={phoneVisible}
                whatsappStatus={getWhatsAppStatus(membership, optInByUser.get(membership.user_id ?? ""))}
                pending
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum cadastro pendente.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Moradores ativos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {active.length ? (
            active.map((membership) => (
              <ResidentCard
                key={membership.id}
                condoId={condoId}
                membership={membership}
                phoneVisible={phoneVisible}
                whatsappStatus={getWhatsAppStatus(membership, optInByUser.get(membership.user_id ?? ""))}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum morador ativo ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
