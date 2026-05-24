import { NextResponse } from "next/server";
import { z } from "zod";
import { getCalendarEvents } from "@/lib/calendar";
import { safeActionErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  condoId: z.string().uuid(),
  start: z.string().min(1),
  end: z.string().min(1),
  areaId: z.string().uuid().optional(),
  apartmentId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Intervalo da agenda invalido." }, { status: 400 });
  }

  try {
    const events = await getCalendarEvents(parsed.data.condoId, parsed.data.start, parsed.data.end, {
      areaId: parsed.data.areaId,
      apartmentId: parsed.data.apartmentId,
      status: parsed.data.status,
    });
    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: safeActionErrorMessage(error) }, { status: 422 });
  }
}
