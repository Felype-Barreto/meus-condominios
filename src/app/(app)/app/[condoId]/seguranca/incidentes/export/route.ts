import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ condoId: string }> },
) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("plan")
    .eq("id", condoId)
    .single();

  if (!["pro", "total"].includes(String(condo?.plan))) {
    return new Response("Exportacao disponivel nos planos Pro e Total.", {
      status: 403,
    });
  }

  const { data: allowed } = await supabase.rpc("has_permission", {
    condo_id: condoId,
    permission_key: "security.view_incidents",
  });
  const { data: isSubscriberAdmin } = await supabase.rpc("is_subscriber_admin", {
    condo_id: condoId,
  });

  if (!allowed && !isSubscriberAdmin) {
    return new Response("Sem permissao para exportar incidentes.", {
      status: 403,
    });
  }

  const { data: incidents, error } = await supabase
    .from("security_incidents")
    .select("id,incident_type,severity,title,status,created_at,resolved_at")
    .eq("condominium_id", condoId)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response("Nao foi possivel exportar.", { status: 500 });
  }

  const header = [
    "id",
    "tipo",
    "severidade",
    "titulo",
    "status",
    "criado_em",
    "resolvido_em",
  ];
  const rows = (incidents ?? []).map((incident) =>
    [
      incident.id,
      incident.incident_type,
      incident.severity,
      incident.title,
      incident.status,
      incident.created_at,
      incident.resolved_at,
    ]
      .map(csvCell)
      .join(","),
  );

  return new Response([header.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="incidentes-seguranca.csv"',
    },
  });
}
