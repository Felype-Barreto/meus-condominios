import { Building2, Home, Plus, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { deleteCondominiumAction } from "@/app/(app)/app/condominios/actions";
import { DeleteConfirmation } from "@/components/common/delete-confirmation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AccountResidentMembership = {
  id: string;
  role: string;
  status: string;
};

export type AccountCondominiumMembership = {
  id: string;
  role: string;
  status: string;
  condominiums: {
    id: string;
    name: string;
    blocks?: { id: string }[] | null;
    apartments?: { id: string }[] | null;
    memberships?: AccountResidentMembership[] | null;
  } | null;
};

function countResidents(memberships?: AccountResidentMembership[] | null) {
  return (memberships ?? []).filter(
    (membership) =>
      membership.status === "active" &&
      ["resident", "owner"].includes(membership.role),
  ).length;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function CondominiumAccountList({
  memberships,
}: {
  memberships: AccountCondominiumMembership[];
}) {
  const active = memberships.filter((membership) => membership.status === "active");
  const pending = memberships.filter((membership) => membership.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Minha conta</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Condomínios administrados
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acesse os condomínios ligados à sua conta, confira a estrutura e
            remova ambientes que não usa mais.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/novo-condominio">
            <Plus className="h-4 w-4" />
            Novo condomínio
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {active.map((membership) => {
          const condo = membership.condominiums;
          if (!condo) return null;
          const canDelete = membership.role === "subscriber_admin";
          const blocks = condo.blocks?.length ?? 0;
          const apartments = condo.apartments?.length ?? 0;
          const residents = countResidents(condo.memberships);

          return (
            <Card
              key={membership.id}
              className="group p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/55 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-6 w-6" />
                </div>
                {canDelete ? (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/${condo.id}/configuracoes/dados/export`}>
                        Backup
                      </Link>
                    </Button>
                    <DeleteConfirmation
                      action={deleteCondominiumAction}
                      fields={{ condominium_id: condo.id }}
                      title={`Excluir ${condo.name}?`}
                      description={`Antes de confirmar, baixe um backup em Configurações > Dados. Isso exclui o condomínio ${condo.name}, blocos, apartamentos, convites, configurações e dados operacionais vinculados.`}
                      triggerLabel="Excluir"
                    />
                  </div>
                ) : null}
              </div>
              <h2 className="mt-5 text-xl font-semibold">{condo.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre no painel para ver avisos, reservas, moradores, portaria e
                configurações.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Metric icon={Building2} label="Blocos" value={blocks} />
                <Metric icon={Home} label="Apartamentos" value={apartments} />
                <Metric icon={Users} label="Moradores" value={residents} />
              </div>
              <Button asChild className="mt-6">
                <Link href={`/app/${condo.id}/dashboard`}>Abrir painel</Link>
              </Button>
            </Card>
          );
        })}

        <Card className="group flex flex-col items-start justify-center border-dashed p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/55 hover:shadow-xl hover:shadow-primary/10">
          <div className="rounded-lg bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Criar condomínio</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie a base primeiro; blocos, andares e apartamentos ficam para
            montar depois.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/app/novo-condominio">Começar agora</Link>
          </Button>
        </Card>
      </div>

      {pending.length ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Aguardando aprovação</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pending.map((membership) => (
              <div
                key={membership.id}
                className="rounded-lg border bg-background p-4"
              >
                <p className="font-semibold">{membership.condominiums?.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Seu cadastro foi enviado. Aguarde a administração aprovar.
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
