import { NextResponse } from "next/server";
import { logPlatformAction } from "@/lib/admin/audit";
import { requirePlatformSession } from "@/lib/admin/auth";
import { createAdminSupabase } from "@/lib/admin/data";
import { exportCondoData, exportUserData } from "@/lib/data-rights";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await requirePlatformSession(["platform_owner", "platform_admin", "platform_security"]);
  const { requestId } = await params;
  const supabase = createAdminSupabase();
  const { data: dataRequest } = await supabase
    .from("data_requests")
    .select("id,condominium_id,user_id,request_type,status")
    .eq("id", requestId)
    .single();

  if (!dataRequest) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (!["export", "portability"].includes(dataRequest.request_type)) {
    return NextResponse.json(
      { error: "Exportacao disponivel apenas para pedidos de exportacao ou portabilidade." },
      { status: 400 },
    );
  }

  const payload = dataRequest.condominium_id
    ? await exportCondoData(supabase, dataRequest.condominium_id)
    : dataRequest.user_id
      ? await exportUserData(supabase, dataRequest.user_id)
      : { exported_at: new Date().toISOString(), request_id: dataRequest.id, data: null };

  await logPlatformAction({
    session,
    action: "data_request_export_generated",
    entityType: "data_requests",
    entityId: dataRequest.id,
    reason: "Exportacao LGPD gerada por rota administrativa controlada.",
    metadata: {
      request_type: dataRequest.request_type,
      condominium_id: dataRequest.condominium_id,
      scope: dataRequest.condominium_id ? "condominium" : "user",
    },
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="morai-lgpd-${dataRequest.id}.json"`,
      "cache-control": "no-store",
    },
  });
}
