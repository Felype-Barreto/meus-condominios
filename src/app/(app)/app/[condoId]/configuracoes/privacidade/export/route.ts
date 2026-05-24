import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ condoId: string }> },
) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [
    { data: profile },
    { data: memberships },
    { data: whatsappOptIn },
    { data: bookings },
    { data: tickets },
    { data: announcementReads },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, avatar_url, created_at, updated_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("id, condominium_id, apartment_id, role, status, privacy_settings, created_at, updated_at")
      .eq("condominium_id", condoId)
      .eq("user_id", user.id),
    supabase
      .from("whatsapp_opt_ins")
      .select("phone, opted_in, opted_in_at, opted_out_at, source, created_at, updated_at")
      .eq("condominium_id", condoId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, common_area_id, apartment_id, title, start_at, end_at, status, notes, created_at, updated_at")
      .eq("condominium_id", condoId)
      .eq("user_id", user.id),
    supabase
      .from("tickets")
      .select("id, apartment_id, category, title, description, visibility, priority, status, created_at, updated_at")
      .eq("condominium_id", condoId)
      .eq("created_by", user.id),
    supabase
      .from("announcement_reads")
      .select("announcement_id, read_at")
      .eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    condominium_id: condoId,
    user_id: user.id,
    profile,
    memberships,
    whatsapp_opt_in: whatsappOptIn,
    bookings,
    tickets,
    announcement_reads: announcementReads,
    note: "Este arquivo reúne dados principais associados à sua conta neste condomínio. Outros dados podem depender de análise do condomínio responsável ou de suporte.",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="morai-meus-dados-${condoId}.json"`,
      "cache-control": "no-store",
    },
  });
}
