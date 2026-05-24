import { LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { WhatsAppManualCard } from "@/components/app/whatsapp-manual-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsAppPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("name")
    .eq("id", condoId)
    .single();

  const lockedItems = [
    "Envio automático por API oficial",
    "Grupos e canais conectados",
    "Templates aprovados",
    "Logs automáticos",
    "Configurações de integração",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">WhatsApp</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Gere textos prontos e compartilhe manualmente. As automações ficam
            suspensas até liberarmos os planos Pro e Total com estabilidade.
          </p>
        </div>
        <StatusBadge>Manual</StatusBadge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <WhatsAppManualCard
          condoId={condoId}
          condominiumName={condo?.name ?? "Condomínio"}
        />
        <Card className="relative overflow-hidden p-5">
          <div className="absolute inset-0 bg-muted/45" />
          <div className="relative">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Automação Pro e Total</h2>
                  <StatusBadge tone="warning">Em breve</StatusBadge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Esta área ficará bloqueada no lançamento. Quando os planos Pro
                  e Total forem liberados, ela concentrará grupos, templates,
                  logs e configurações oficiais.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {lockedItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-lg border bg-card/80 p-3 text-sm font-medium text-muted-foreground"
                >
                  <LockKeyhole className="h-4 w-4 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Política segura</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Por enquanto, o Meus Condomínios não envia WhatsApp automaticamente. Isso
                evita spam, custos inesperados e exposição de telefone sem
                consentimento.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Como usar agora</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Escolha o tipo de mensagem, gere o texto, copie ou abra o
                WhatsApp. O envio fica sob controle da administração.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
