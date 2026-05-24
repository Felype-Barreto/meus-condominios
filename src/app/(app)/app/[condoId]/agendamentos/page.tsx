import { CalendarDays } from "lucide-react";
import { BookingCalendar } from "@/components/app/booking-calendar";
import type {
  CalendarApartment,
  CalendarArea,
} from "@/components/app/calendar-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: areas }, { data: apartments }, { data: viewAll }, { data: subscriber }] = await Promise.all([
    supabase
      .from("common_areas")
      .select("id,name,capacity,rules,requires_approval,available_days,available_start_time,available_end_time,min_duration_minutes,max_duration_minutes,min_notice_hours,max_notice_days,max_bookings_per_apartment_month")
      .eq("condominium_id", condoId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("apartments")
      .select("id,number,blocks(name)")
      .eq("condominium_id", condoId)
      .order("number"),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "bookings.view_all" }),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-[#7C5C3E]/20">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Reservas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
            Agenda de áreas comuns
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Veja mês, semana, dia ou lista. Toque em um dia para reservar e em
            um evento para revisar detalhes.
          </p>
        </div>
      </div>

      <BookingCalendar
        condoId={condoId}
        areas={(areas ?? []) as unknown as CalendarArea[]}
        apartments={(apartments ?? []) as unknown as CalendarApartment[]}
        adminMode={Boolean(viewAll) || Boolean(subscriber)}
      />
    </div>
  );
}
