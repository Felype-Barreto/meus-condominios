import { LockedWhatsAppFeature } from "@/components/app/locked-whatsapp-feature";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsAppLogsPage({
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

  return (
    <LockedWhatsAppFeature
      condoId={condoId}
      condominiumName={condo?.name}
      title="Logs automáticos"
      description="Logs de envios automáticos ficarão bloqueados até liberarmos a automação dos planos Pro e Total."
    />
  );
}
