import Link from "next/link";
import { Archive, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCondoDataRequestAction,
  updateDataRequestStatusAction,
} from "./actions";

type CondoSettings = {
  deletion_requested_at?: string;
  deletion_scheduled_for?: string;
  deletion_requested_by?: string;
};

export default async function CondoDataSettingsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [
    { data: condo },
    { data: isSubscriberAdmin },
    { data: canExport },
    { data: canManageDeletion },
    { data: requests },
  ] = await Promise.all([
    supabase.from("condominiums").select("name,plan,subscription_status,settings").eq("id", condoId).single(),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "privacy.export_data",
    }),
    supabase.rpc("has_permission", {
      condo_id: condoId,
      permission_key: "privacy.delete_data_request",
    }),
    supabase
      .from("data_requests")
      .select("id,request_type,status,description,requested_by_email,response_note,created_at,processed_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const settings = (condo?.settings ?? {}) as CondoSettings;
  const exportAllowed = Boolean(
    (isSubscriberAdmin || canExport) && ["pro", "total"].includes(String(condo?.plan)),
  );
  const manageAllowed = Boolean(isSubscriberAdmin || canManageDeletion);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Dados, exportacao e retencao
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Centralize pedidos de dados, exportacao, correcao, exclusao e retencao
          apos cancelamento. Exclusoes definitivas exigem revisao para preservar
          seguranca, cobranca, auditoria e obrigacoes legais.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <Archive className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Retencao apos cancelamento</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Prazo operacional sugerido: ate 30 dias para exportacao e revisao,
            com backups e logs criticos podendo seguir politica propria.
          </p>
          <div className="mt-4">
            <StatusBadge tone={settings.deletion_scheduled_for ? "warning" : "neutral"}>
              {settings.deletion_scheduled_for ? "Exclusao solicitada" : "Sem exclusao agendada"}
            </StatusBadge>
          </div>
          {settings.deletion_scheduled_for ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Agendada para {new Date(settings.deletion_scheduled_for).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <Download className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Exportar dados do condominio</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Exportacao completa fica disponivel nos planos Pro e Total para
            assinante principal ou quem tiver permissao de exportar dados.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {exportAllowed ? (
              <Button asChild>
                <Link href={`/app/${condoId}/configuracoes/dados/export`}>
                  <Download className="h-4 w-4" />
                  Baixar JSON
                </Link>
              </Button>
            ) : (
              <Button disabled>Exportacao exige Pro/Total e permissao</Button>
            )}
            <form action={createCondoDataRequestAction}>
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="request_type" value="export" />
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Registrar pedido de exportacao
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <Trash2 className="h-6 w-6 text-amber-700" />
        <h2 className="mt-4 text-lg font-semibold text-amber-950">
          Solicitar exclusao do condominio
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Somente o assinante principal pode solicitar. Dados podem ser
          anonimizados ou retidos quando forem necessarios para seguranca,
          cobranca, logs, defesa de direitos ou obrigacoes legais.
        </p>
        <form action={createCondoDataRequestAction} className="mt-5 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="condominium_id" value={condoId} />
          <input type="hidden" name="request_type" value="deletion" />
          <textarea
            name="description"
            className="min-h-24 rounded-lg border bg-card px-3 py-2 text-sm md:col-span-2"
            placeholder="Motivo opcional e observacoes para revisao."
            disabled={!isSubscriberAdmin}
          />
          <div className="space-y-3">
            <Input name="confirmation" placeholder="Digite EXCLUIR" disabled={!isSubscriberAdmin} />
            <Button type="submit" variant="outline" disabled={!isSubscriberAdmin} className="w-full">
              Solicitar exclusao
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Solicitacoes do condominio</h2>
        <div className="mt-4 space-y-3">
          {(requests ?? []).length ? (
            requests?.map((request) => (
              <div key={request.id} className="rounded-lg border bg-background p-4 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <strong>{request.request_type}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString("pt-BR")}
                    </p>
                    {request.description ? (
                      <p className="mt-2 text-muted-foreground">{request.description}</p>
                    ) : null}
                  </div>
                  <StatusBadge tone={request.status === "processed" ? "success" : "warning"}>
                    {request.status}
                  </StatusBadge>
                </div>
                {manageAllowed ? (
                  <form action={updateDataRequestStatusAction} className="mt-4 grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="request_id" value={request.id} />
                    <select name="status" defaultValue={request.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
                      <option value="pending">Pendente</option>
                      <option value="reviewing">Em analise</option>
                      <option value="waiting_customer">Aguardando cliente</option>
                      <option value="processed">Processada</option>
                      <option value="rejected">Rejeitada</option>
                      <option value="canceled">Cancelada</option>
                    </select>
                    <Input name="response_note" placeholder="Resposta/observacao" />
                    <Button type="submit">Atualizar</Button>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma solicitacao registrada.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
