import { LockedWhatsAppFeature } from "@/components/app/locked-whatsapp-feature";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsAppGroupsPage({
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
      title="Grupos do WhatsApp"
      description="Grupos e canais conectados farão parte dos planos Pro e Total quando forem liberados."
    />
  );
}
