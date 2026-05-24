import { NextResponse } from "next/server";
import { exportCondoData } from "@/lib/data-rights";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ condoId: string }> },
) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: canExport }, { data: isSubscriberAdmin }] =
    await Promise.all([
      supabase.from("condominiums").select("plan").eq("id", condoId).single(),
      supabase.rpc("has_permission", {
        condo_id: condoId,
        permission_key: "privacy.export_data",
      }),
      supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    ]);

  if (!["pro", "total"].includes(String(condo?.plan))) {
    return new Response("Exportacao do condominio disponivel nos planos Pro e Total.", {
      status: 403,
    });
  }

  if (!canExport && !isSubscriberAdmin) {
    return new Response("Sem permissao para exportar dados do condominio.", {
      status: 403,
    });
  }

  let adminSupabase;
  try {
    adminSupabase = createSupabaseServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Exportacao administrativa nao configurada no servidor." },
      { status: 503 },
    );
  }

  const payload = await exportCondoData(adminSupabase, condoId);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="morai-condominio-${condoId}.json"`,
      "cache-control": "no-store",
    },
  });
}
