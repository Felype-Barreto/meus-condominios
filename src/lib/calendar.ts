import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CalendarArea, CalendarBooking } from "@/components/app/calendar-types";

export type CalendarEventFilters = {
  areaId?: string | null;
  status?: string | null;
  apartmentId?: string | null;
};

export type AvailableTimeSlot = {
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  reason?: string;
};

function timeParts(value = "08:00") {
  const [hours = "8", minutes = "0"] = value.split(":");
  return { hours: Number(hours), minutes: Number(minutes), seconds: 0, milliseconds: 0 };
}

function timeToMinutes(value = "08:00") {
  const { hours, minutes } = timeParts(value);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function zonedDateTimeIso(date: string, minutes: number) {
  return parseISO(`${date}T${minutesToTime(minutes)}:00-03:00`).toISOString();
}

async function getViewer(condoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Entre na sua conta.");

  const [{ data: membership }, { data: subscriber }, { data: viewAll }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id,apartment_id,role,status")
      .eq("condominium_id", condoId)
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase.rpc("is_subscriber_admin", { condo_id: condoId }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "bookings.view_all" }),
  ]);

  if (!membership) throw new Error("Sem acesso à agenda deste condomínio.");
  return {
    supabase,
    userId: auth.user.id,
    apartmentId: membership.apartment_id as string | null,
    canViewAll: Boolean(subscriber) || Boolean(viewAll),
  };
}

export async function validateBookingAdvanceLimit(condoId: string, startAt: string | Date) {
  const supabase = await createSupabaseServerClient();
  const date = typeof startAt === "string" ? parseISO(startAt) : startAt;
  if (Number.isNaN(date.getTime())) throw new Error("Data da reserva inválida.");

  const { data, error } = await supabase
    .from("condominiums")
    .select("plan,plan_limits(calendar_advance_days)")
    .eq("id", condoId)
    .single();
  if (error) throw error;
  const joined = data.plan_limits as { calendar_advance_days?: number } | Array<{ calendar_advance_days?: number }> | null;
  const limits = Array.isArray(joined) ? joined[0] : joined;
  const maxDays = Number(limits?.calendar_advance_days ?? 60);

  if (differenceInCalendarDays(date, new Date()) > maxDays) {
    throw new Error(`Seu plano permite reservas até ${maxDays} dias à frente.`);
  }

  return { allowed: true, maxDays, plan: data.plan };
}

export async function checkBookingConflict(commonAreaId: string, startAt: string, endAt: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("common_area_id", commonAreaId)
    .in("status", ["pending", "approved"])
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .limit(1);
  if (error) throw error;
  return { conflict: Boolean(data?.length) };
}

export async function getCalendarEvents(
  condoId: string,
  start: string,
  end: string,
  filters: CalendarEventFilters = {},
): Promise<CalendarBooking[]> {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw new Error("Intervalo da agenda inválido.");
  }
  if (differenceInCalendarDays(endDate, startDate) > 93) {
    throw new Error("Consulte no máximo três meses por vez.");
  }

  const viewer = await getViewer(condoId);
  let query = viewer.supabase
    .from("bookings")
    .select("id,condominium_id,common_area_id,apartment_id,user_id,title,start_at,end_at,status,notes,common_areas(name),apartments(number,blocks(name))")
    .eq("condominium_id", condoId)
    .lt("start_at", endDate.toISOString())
    .gt("end_at", startDate.toISOString())
    .order("start_at", { ascending: true })
    .limit(300);

  if (filters.areaId) query = query.eq("common_area_id", filters.areaId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (viewer.canViewAll && filters.apartmentId && filters.apartmentId !== "all") {
    query = query.eq("apartment_id", filters.apartmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let blockQuery = viewer.supabase
    .from("common_area_blocked_dates")
    .select("id,common_area_id,blocked_date,full_day,start_time,end_time,common_areas(name)")
    .eq("condominium_id", condoId)
    .gte("blocked_date", format(startDate, "yyyy-MM-dd"))
    .lt("blocked_date", format(endDate, "yyyy-MM-dd"))
    .order("blocked_date", { ascending: true })
    .limit(120);
  if (filters.areaId) {
    blockQuery = blockQuery.or(`common_area_id.eq.${filters.areaId},common_area_id.is.null`);
  }
  const { data: blockedDates, error: blockedError } = await blockQuery;
  if (blockedError) throw blockedError;

  const visibleBookings = ((data ?? []) as unknown as CalendarBooking[]).map((booking) => {
    const ownBooking = booking.user_id === viewer.userId || booking.apartment_id === viewer.apartmentId;
    if (viewer.canViewAll || ownBooking) return booking;
    return {
      ...booking,
      apartment_id: null,
      user_id: null,
      title: booking.common_areas?.name ?? "Reserva",
      notes: null,
      apartments: null,
      private_details: false,
    };
  });
  const blocks = filters.status && !["all", "blocked"].includes(filters.status)
    ? []
    : (blockedDates ?? []).map((block) => {
        const area = Array.isArray(block.common_areas) ? block.common_areas[0] : block.common_areas;
        return {
          id: `block-${block.id}`,
          condominium_id: condoId,
          common_area_id: block.common_area_id,
          apartment_id: null,
          title: area?.name ? `Bloqueio - ${area.name}` : "Bloqueio da agenda",
          start_at: block.full_day ? `${block.blocked_date}T00:00:00` : `${block.blocked_date}T${block.start_time ?? "00:00:00"}`,
          end_at: block.full_day
            ? addDays(parseISO(`${block.blocked_date}T00:00:00`), 1).toISOString()
            : `${block.blocked_date}T${block.end_time ?? "23:59:59"}`,
          status: "blocked",
          notes: null,
          apartments: null,
          common_areas: area ?? null,
          private_details: false,
        } satisfies CalendarBooking;
      });

  return [...visibleBookings, ...blocks].sort((left, right) => left.start_at.localeCompare(right.start_at));
}

export async function getAvailableTimeSlots(commonAreaId: string, date: string): Promise<AvailableTimeSlot[]> {
  const supabase = await createSupabaseServerClient();
  const day = parseISO(`${date}T12:00:00-03:00`);
  if (Number.isNaN(day.getTime())) throw new Error("Dia inválido.");

  const { data: area, error } = await supabase
    .from("common_areas")
    .select("id,condominium_id,available_days,available_start_time,available_end_time,min_duration_minutes,max_duration_minutes")
    .eq("id", commonAreaId)
    .eq("active", true)
    .single();
  if (error || !area) throw new Error("Área comum indisponível.");

  await getViewer(area.condominium_id);
  await validateBookingAdvanceLimit(area.condominium_id, day);
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id,start_at,end_at,status")
      .eq("common_area_id", commonAreaId)
      .in("status", ["pending", "approved"])
      .gte("start_at", zonedDateTimeIso(date, 0))
      .lt("start_at", addDays(parseISO(`${date}T00:00:00-03:00`), 1).toISOString())
      .limit(80),
    supabase
      .from("common_area_blocked_dates")
      .select("id,full_day,start_time,end_time")
      .eq("condominium_id", area.condominium_id)
      .or(`common_area_id.eq.${commonAreaId},common_area_id.is.null`)
      .eq("blocked_date", date)
      .limit(20),
  ]);

  if (area.available_days?.length && !area.available_days.includes(day.getDay())) return [];
  const duration = Number(area.min_duration_minutes ?? 60);
  const openMinutes = timeToMinutes(area.available_start_time ?? "08:00");
  const closeMinutes = timeToMinutes(area.available_end_time ?? "22:00");
  const fullDayBlocked = Boolean(blocks?.some((block) => block.full_day));
  const slots: AvailableTimeSlot[] = [];

  for (let cursor = openMinutes; cursor + duration <= closeMinutes; cursor += duration) {
    const slotEndMinutes = cursor + duration;
    const startAt = zonedDateTimeIso(date, cursor);
    const endAt = zonedDateTimeIso(date, slotEndMinutes);
    const slotStart = parseISO(startAt);
    const slotEnd = parseISO(endAt);
    const startTime = `${minutesToTime(cursor)}:00`;
    const endTime = `${minutesToTime(slotEndMinutes)}:00`;
    const conflict = Boolean(bookings?.some((booking) => slotStart < parseISO(booking.end_at) && slotEnd > parseISO(booking.start_at)));
    const blocked = Boolean(blocks?.some((block) =>
      !block.full_day &&
      block.start_time &&
      block.end_time &&
      startTime < block.end_time &&
      endTime > block.start_time,
    ));
    slots.push({
      label: `${minutesToTime(cursor)} - ${minutesToTime(slotEndMinutes)}`,
      startAt,
      endAt,
      available: !fullDayBlocked && !blocked && !conflict,
      reason: fullDayBlocked ? "Data bloqueada" : blocked ? "Horário bloqueado" : conflict ? "Já reservado" : undefined,
    });
  }

  return slots;
}

export type CreateBookingInput = {
  condominiumId: string;
  commonAreaId: string;
  apartmentId: string;
  title: string;
  startAt: string;
  endAt: string;
  notes?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Entre na sua conta.");
  if (parseISO(input.endAt) <= parseISO(input.startAt)) {
    throw new Error("O horario final precisa ser depois do inicio.");
  }

  const [{ data: subscriber }, { data: canCreate }, { data: ownMembership }] = await Promise.all([
    supabase.rpc("is_subscriber_admin", { condo_id: input.condominiumId }),
    supabase.rpc("has_permission", { condo_id: input.condominiumId, permission_key: "bookings.create" }),
    supabase
      .from("memberships")
      .select("id")
      .eq("condominium_id", input.condominiumId)
      .eq("user_id", auth.user.id)
      .eq("apartment_id", input.apartmentId)
      .eq("status", "active")
      .in("role", ["resident", "owner"])
      .limit(1)
      .maybeSingle(),
  ]);
  if (!subscriber && !canCreate && !ownMembership) throw new Error("Sem permissão para criar reserva.");

  await validateBookingAdvanceLimit(input.condominiumId, input.startAt);
  const { conflict } = await checkBookingConflict(input.commonAreaId, input.startAt, input.endAt);
  if (conflict) throw new Error("Já existe reserva neste horário.");

  const { data: area, error: areaError } = await supabase
    .from("common_areas")
    .select("requires_approval")
    .eq("id", input.commonAreaId)
    .eq("condominium_id", input.condominiumId)
    .single();
  if (areaError) throw areaError;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      condominium_id: input.condominiumId,
      common_area_id: input.commonAreaId,
      apartment_id: input.apartmentId,
      title: input.title,
      start_at: input.startAt,
      end_at: input.endAt,
      notes: input.notes,
      user_id: auth.user.id,
      status: area?.requires_approval ? "pending" : "approved",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export type { CalendarArea };
