import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QrCode, ShieldAlert } from "lucide-react";
import { PublicQrSettingsPanel } from "@/components/app/public-qr-settings-panel";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { getPublicAppUrl } from "@/lib/public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CondoSettings = {
  public_qr_enabled?: boolean;
  public_qr_message?: string;
  public_qr_default_privacy?: {
    allow_public_contact?: boolean;
    allow_name_search?: boolean;
    allow_apartment_search?: boolean;
    allow_whatsapp_redirect?: boolean;
  };
};

type CondoRow = {
  name: string;
  public_code: string;
  settings: CondoSettings;
};

type AttemptRow = {
  id: string;
  result_type: string;
  blocked: boolean;
  reason: string | null;
  created_at: string;
};

const outcomeLabels: Record<string, string> = {
  matched: "Compatível",
  no_authorized_match: "Genérico",
  rate_limited: "Bloqueado",
  disabled: "Desativado",
  invalid_code: "Código inválido",
};

export default async function PublicQrSettingsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: attempts }] = await Promise.all([
    supabase
      .from("condominiums")
      .select("name, public_code, settings")
      .eq("id", condoId)
      .single(),
    supabase
      .from("qr_public_access_logs")
      .select("id, result_type, blocked, reason, created_at")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const condoData = condo as CondoRow | null;
  const settings = condoData?.settings ?? {};
  const appUrl = getPublicAppUrl();
  const publicUrl = `${appUrl}/visitante/${condoData?.public_code ?? ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condoData?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            QR público seguro
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Configure o canal para visitantes pedirem contato sem expor dados de
            moradores.
          </p>
        </div>
        <StatusBadge tone={settings.public_qr_enabled ? "success" : "neutral"}>
          {settings.public_qr_enabled ? "Ativo" : "Desativado"}
        </StatusBadge>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Esta página registra tentativas, aplica bloqueio temporário e foi
            projetada para não listar moradores, telefones ou nomes completos ao
            visitante.
          </p>
        </div>
      </Card>

      {condoData ? (
        <PublicQrSettingsPanel
          condoId={condoId}
          publicUrl={publicUrl}
          publicCode={condoData.public_code}
          enabled={settings.public_qr_enabled === true}
          message={settings.public_qr_message ?? ""}
          defaultPrivacy={settings.public_qr_default_privacy ?? {}}
        />
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <QrCode className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Logs recentes</h2>
            <p className="text-sm text-muted-foreground">
              Tentativas registradas pelo QR público.
            </p>
          </div>
        </div>

        {(attempts as AttemptRow[] | null)?.length ? (
          <div className="space-y-3">
            {(attempts as AttemptRow[]).map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {outcomeLabels[attempt.result_type] ?? attempt.result_type}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {attempt.blocked ? "Tentativa bloqueada" : "Tentativa registrada"}
                    {attempt.reason ? ` · ${attempt.reason}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(attempt.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={QrCode}
            title="Nenhum uso registrado"
            description="As tentativas aparecerão aqui quando visitantes usarem o QR."
          />
        )}
      </Card>
    </div>
  );
}
