import { CommunicationDispatchWizard } from "@/components/app/communication-dispatch-wizard";
import { CommunicationNav } from "@/components/app/communication-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canSendWhatsAppMessage } from "@/lib/whatsapp";
import { getCommunicationPlanLimits } from "@/lib/communication";
import type { DispatchChannelInput } from "@/lib/communication-dispatch";

type ChannelRow = DispatchChannelInput;

export default async function NewCommunicationDispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ condoId: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { condoId } = await params;
  const { template } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: channels }, { data: templates }, limits, whatsappUsage] =
    await Promise.all([
      supabase.from("condominiums").select("name").eq("id", condoId).single(),
      supabase
        .from("communication_channels")
        .select("id, name, type, scope, status, plan_required, block_id, role, allowed_message_types")
        .eq("condominium_id", condoId)
        .neq("status", "inactive")
        .order("created_at", { ascending: false }),
      supabase
        .from("communication_templates")
        .select("id, name, title_template, body_template, message_type")
        .or(`condominium_id.is.null,condominium_id.eq.${condoId}`)
        .order("created_at", { ascending: false })
        .limit(50),
      getCommunicationPlanLimits(condoId),
      canSendWhatsAppMessage(condoId),
    ]);

  const appChannel: ChannelRow = {
    id: "app-interno",
    name: "App Meus Condomínios",
    type: "app",
    scope: "all",
    status: "active",
    plan_required: "free",
    block_id: null,
    role: null,
    allowed_message_types: [
      "announcement",
      "maintenance",
      "booking",
      "package",
      "security",
      "meeting",
      "summary",
      "other",
    ],
  };
  const channelRows = [
    appChannel,
    ...((channels ?? []) as ChannelRow[]).filter((channel) => channel.type !== "app"),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Novo disparo</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Escreva uma mensagem uma vez. O Meus Condomínios sugere canais, estima custo e bloqueia risco de vazamento.
        </p>
      </div>

      <CommunicationNav condoId={condoId} />

      <CommunicationDispatchWizard
        condoId={condoId}
        condominiumName={condo?.name ?? "Condomínio"}
        channels={channelRows}
        templates={templates ?? []}
        initialTemplateId={template}
        plan={limits.plan}
        whatsappRemaining={whatsappUsage.remaining}
        automaticOneToOne={limits.automatic_1_1}
        officialGroups={limits.official_groups}
        manualGroups={limits.manual_groups}
      />
    </div>
  );
}
