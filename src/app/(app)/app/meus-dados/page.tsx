import Link from "next/link";
import { Download, EyeOff, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { officialContact } from "@/lib/app-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createMyDataRequestAction,
  hideMyPhoneEverywhereAction,
  revokeAllWhatsAppConsentAction,
} from "./actions";

type MembershipOption = {
  condominium_id: string;
  condominiums?: { name?: string | null } | { name?: string | null }[] | null;
};

function getCondoName(membership: MembershipOption) {
  const condo = Array.isArray(membership.condominiums)
    ? membership.condominiums[0]
    : membership.condominiums;
  return condo?.name ?? membership.condominium_id;
}

export default async function MyDataPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: memberships }, { data: optIns }, { data: requests }] =
    await Promise.all([
      user
        ? supabase
            .from("profiles")
            .select("full_name,email,phone,created_at")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("memberships")
            .select("condominium_id,role,status,privacy_settings,condominiums(name)")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("whatsapp_opt_ins")
            .select("condominium_id,opted_in,categories,opted_in_at,opted_out_at")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("data_requests")
            .select("id,condominium_id,request_type,status,description,response_note,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Privacidade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Meus dados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Exporte seus dados, solicite correcao ou exclusao, revise consentimentos e
          controle a exposicao do seu telefone. Prazo e possibilidade de atendimento
          dependem do tipo de dado, seguranca, cobranca, logs e obrigacoes legais.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Resumo da conta</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">Nome</span>
              <strong>{profile?.full_name ?? "Nao informado"}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">E-mail</span>
              <strong className="break-all">{profile?.email ?? user?.email ?? "Nao informado"}</strong>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <span className="block text-muted-foreground">Vinculos</span>
              <strong>{memberships?.length ?? 0}</strong>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/app/meus-dados/export">
                <Download className="h-4 w-4" />
                Exportar agora
              </Link>
            </Button>
            <form action={hideMyPhoneEverywhereAction}>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                <EyeOff className="h-4 w-4" />
                Ocultar telefone
              </Button>
            </form>
          </div>
        </Card>

        <Card className="p-5">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">WhatsApp</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {optIns?.filter((item) => item.opted_in).length ?? 0} consentimento(s)
            ativo(s). Voce pode revogar a qualquer momento.
          </p>
          <form action={revokeAllWhatsAppConsentAction} className="mt-5">
            <Button type="submit" variant="outline" className="w-full">
              Revogar WhatsApp
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Solicitar atendimento de dados</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use este formulario para correcao, exclusao, portabilidade ou analise
            adicional. Voce tambem pode escrever para {officialContact}.
          </p>
          <form action={createMyDataRequestAction} className="mt-5 space-y-3">
            <select name="request_type" className="h-11 w-full rounded-lg border bg-card px-3 text-sm">
              <option value="export">Exportacao</option>
              <option value="portability">Portabilidade</option>
              <option value="correction">Correcao</option>
              <option value="deletion">Exclusao</option>
            </select>
            <select name="condominium_id" className="h-11 w-full rounded-lg border bg-card px-3 text-sm">
              <option value="">Minha conta geral</option>
              {((memberships ?? []) as MembershipOption[]).map((membership) => (
                <option key={membership.condominium_id} value={membership.condominium_id}>
                  {getCondoName(membership)}
                </option>
              ))}
            </select>
            <textarea
              name="description"
              className="min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm"
              placeholder="Explique o pedido. Evite incluir dados desnecessarios."
            />
            <Button type="submit">Registrar solicitacao</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Solicitacoes recentes</h2>
          <div className="mt-4 space-y-3">
            {(requests ?? []).length ? (
              requests?.map((request) => (
                <div key={request.id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{request.request_type}</strong>
                    <StatusBadge tone={request.status === "processed" ? "success" : "warning"}>
                      {request.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString("pt-BR")}
                  </p>
                  {request.response_note ? (
                    <p className="mt-2 text-muted-foreground">{request.response_note}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma solicitacao registrada.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
