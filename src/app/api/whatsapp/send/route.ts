import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  queueAndSendWhatsAppMessage,
  whatsappSendSchema,
} from "@/lib/whatsapp/queue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const parsed = whatsappSendSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload invalido." },
      { status: 400 },
    );
  }

  try {
    const result = await queueAndSendWhatsAppMessage({
      input: parsed.data,
      userSupabase,
      adminSupabase: createSupabaseServiceClient(),
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel processar o envio com seguranca." },
      { status: 500 },
    );
  }
}
