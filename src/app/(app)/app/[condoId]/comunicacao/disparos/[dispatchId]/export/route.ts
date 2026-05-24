import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ condoId: string; dispatchId: string }> },
) {
  const { condoId, dispatchId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: limits } = await supabase.rpc("get_communication_plan_limits", { condo_id: condoId });
  const plan = String((limits as { plan?: string } | null)?.plan ?? "free");

  if (plan !== "pro" && plan !== "total") {
    return new Response("Exportação disponível nos planos Pro e Total.", { status: 403 });
  }

  const { data, error } = await supabase
    .from("communication_recipients")
    .select("status,delivered_at,read_at,failed_at,error_message,profiles!communication_recipients_user_id_fkey(full_name,email),apartments!communication_recipients_apartment_id_fkey(number,blocks(name)),communication_channels!communication_recipients_channel_id_fkey(name,type,scope),communication_dispatches!inner(condominium_id,title)")
    .eq("dispatch_id", dispatchId)
    .eq("communication_dispatches.condominium_id", condoId)
    .order("created_at", { ascending: true });

  if (error) {
    return new Response("Não foi possível gerar o relatório.", { status: 500 });
  }

  const rows = data ?? [];
  const header = [
    "bloco",
    "apartamento",
    "morador",
    "canal",
    "tipo_canal",
    "status",
    "entregue_em",
    "lido_em",
    "falhou_em",
    "erro",
  ];
  const body = rows.map((row) => {
    const apartment = Array.isArray(row.apartments) ? row.apartments[0] : row.apartments;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const channel = Array.isArray(row.communication_channels) ? row.communication_channels[0] : row.communication_channels;
    const block = Array.isArray(apartment?.blocks) ? apartment?.blocks[0] : apartment?.blocks;

    return [
      block?.name,
      apartment?.number,
      profile?.full_name ?? profile?.email,
      channel?.name,
      channel?.type,
      row.status,
      row.delivered_at,
      row.read_at,
      row.failed_at,
      row.error_message,
    ].map(csvEscape).join(",");
  });
  const csv = [header.map(csvEscape).join(","), ...body].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="morai-disparo-${dispatchId}.csv"`,
    },
  });
}
