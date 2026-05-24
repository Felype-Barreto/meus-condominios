import { LockedWhatsAppFeature } from "@/components/app/locked-whatsapp-feature";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsAppTemplatesPage({
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
      title="Templates WhatsApp"
      description="Templates oficiais da Meta ficarão disponíveis apenas quando os planos Pro e Total entrarem em operação."
    />
  );
}
