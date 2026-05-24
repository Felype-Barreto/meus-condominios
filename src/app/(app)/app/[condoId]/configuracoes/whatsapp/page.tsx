import { LockedWhatsAppFeature } from "@/components/app/locked-whatsapp-feature";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsAppSettingsPage({
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
      title="Configurações do WhatsApp"
      description="Configurações de integração oficial ficarão bloqueadas até os planos Pro e Total serem liberados."
    />
  );
}
