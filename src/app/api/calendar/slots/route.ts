import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableTimeSlots } from "@/lib/calendar";
import { safeActionErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  areaId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dia da agenda invalido." }, { status: 400 });
  }

  try {
    const slots = await getAvailableTimeSlots(parsed.data.areaId, parsed.data.date);
    return NextResponse.json(
      { slots },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: safeActionErrorMessage(error) }, { status: 422 });
  }
}
