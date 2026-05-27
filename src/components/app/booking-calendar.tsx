"use client";

import dynamic from "next/dynamic";
import { differenceInMinutes, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import type {
  CalendarApartment,
  CalendarArea,
  CalendarBooking,
} from "@/components/app/calendar-types";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  approveBookingAction,
  cancelBookingAction,
  createBookingAction,
  rejectBookingAction,
  type ModuleActionState,
} from "@/lib/actions/core-modules";
import type { AvailableTimeSlot } from "@/lib/calendar";

const FullCalendarView = dynamic(
  () => import("@/components/app/full-calendar-view").then((mod) => mod.FullCalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    ),
  },
);

const initialState: ModuleActionState = { status: "idle" };

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  canceled: "Cancelado",
  blocked: "Bloqueado",
};

const statusTone: Record<string, "success" | "warning" | "error" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  canceled: "neutral",
  blocked: "neutral",
};

function slotStartLabel(slot: AvailableTimeSlot) {
  return slot.label.split(" - ")[0] ?? slot.label;
}

function slotEndLabel(slot: AvailableTimeSlot) {
  return slot.label.split(" - ")[1] ?? slot.label;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Nao foi possivel carregar a agenda.");
  return body;
}

export function BookingCalendar({
  condoId,
  areas,
  apartments,
  adminMode = true,
  focusAreaId,
}: {
  condoId: string;
  areas: CalendarArea[];
  apartments: CalendarApartment[];
  adminMode?: boolean;
  focusAreaId?: string;
}) {
  const [selectedAreaId, setSelectedAreaId] = useState(focusAreaId ?? areas[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [apartmentFilter, setApartmentFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStartAt, setSelectedStartAt] = useState("");
  const [selectedEndAt, setSelectedEndAt] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
  const [jumpDate, setJumpDate] = useState<Date>();
  const [statusPending, startStatusTransition] = useTransition();
  const [state, action, pending] = useActionState(createBookingAction, initialState);
  const queryClient = useQueryClient();

  const selectedArea = areas.find((area) => area.id === selectedAreaId);
  const eventsKey = useMemo(
    () => [
      "calendar-events",
      condoId,
      visibleRange?.start.toISOString(),
      visibleRange?.end.toISOString(),
      selectedAreaId,
      statusFilter,
      adminMode ? apartmentFilter : "own",
    ],
    [adminMode, apartmentFilter, condoId, selectedAreaId, statusFilter, visibleRange],
  );
  const eventsQuery = useQuery({
    queryKey: eventsKey,
    enabled: Boolean(visibleRange),
    staleTime: 30_000,
    queryFn: async () => {
      const params = new URLSearchParams({
        condoId,
        start: visibleRange!.start.toISOString(),
        end: visibleRange!.end.toISOString(),
      });
      if (selectedAreaId) params.set("areaId", selectedAreaId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (adminMode && apartmentFilter !== "all") params.set("apartmentId", apartmentFilter);
      return readJson<{ events: CalendarBooking[] }>(`/api/calendar/events?${params}`);
    },
  });
  const slotsQuery = useQuery({
    queryKey: ["calendar-slots", selectedAreaId, selectedDate ? format(selectedDate, "yyyy-MM-dd") : null],
    enabled: Boolean(selectedAreaId && selectedDate),
    staleTime: 20_000,
    queryFn: async () => {
      const params = new URLSearchParams({
        areaId: selectedAreaId,
        date: format(selectedDate!, "yyyy-MM-dd"),
      });
      return readJson<{ slots: AvailableTimeSlot[] }>(`/api/calendar/slots?${params}`);
    },
  });
  const bookings = eventsQuery.data?.events ?? [];
  const slots = slotsQuery.data?.slots ?? [];
  const selectedStartSlot = slots.find((slot) => slot.startAt === selectedStartAt);
  const minDuration = Number(selectedArea?.min_duration_minutes ?? 60);
  const availableEndOptions = useMemo(() => {
    if (!selectedStartAt) return [];
    const startIndex = slots.findIndex((slot) => slot.startAt === selectedStartAt);
    if (startIndex < 0) return [];

    const options: AvailableTimeSlot[] = [];
    for (let index = startIndex; index < slots.length; index += 1) {
      const slot = slots[index];
      const range = slots.slice(startIndex, index + 1);
      if (range.some((item) => !item.available)) break;

      const minutes = differenceInMinutes(parseISO(slot.endAt), parseISO(selectedStartAt));
      if (minutes >= minDuration) {
        options.push(slot);
      }
    }

    return options;
  }, [minDuration, selectedStartAt, slots]);

  const selectedEndSlot = availableEndOptions.find((slot) => slot.endAt === selectedEndAt);
  const unavailableSlots = slots.filter((slot) => !slot.available);

  useEffect(() => {
    if (state.status !== "success") return;
    queryClient.invalidateQueries({ queryKey: ["calendar-events", condoId] });
    queryClient.invalidateQueries({ queryKey: ["calendar-slots", selectedAreaId] });
  }, [condoId, queryClient, selectedAreaId, state.status]);

  const disabledDays = [
    ...(selectedArea?.available_days?.length
      ? [
          {
            dayOfWeek: [0, 1, 2, 3, 4, 5, 6].filter(
              (day) => !selectedArea.available_days?.includes(day),
            ),
          },
        ]
      : []),
  ];

  function mutateBooking(actionToRun: (formData: FormData) => Promise<void>) {
    if (!selectedBooking) return;
    const formData = new FormData();
    formData.set("condominium_id", condoId);
    formData.set("booking_id", selectedBooking.id);
    startStatusTransition(async () => {
      await actionToRun(formData);
      await queryClient.invalidateQueries({ queryKey: ["calendar-events", condoId] });
      await queryClient.invalidateQueries({ queryKey: ["calendar-slots", selectedAreaId] });
      setSelectedBooking(null);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={selectedAreaId}
            onChange={(event) => {
              setSelectedAreaId(event.target.value);
              setSelectedStartAt("");
              setSelectedEndAt("");
            }}
            className="h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Recusados</option>
            <option value="canceled">Cancelados</option>
            <option value="blocked">Bloqueios</option>
          </select>
          {adminMode ? (
            <select
              value={apartmentFilter}
              onChange={(event) => setApartmentFilter(event.target.value)}
              className="h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
            >
              <option value="all">Todos os apartamentos</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.blocks?.name ?? "Bloco"} - {apartment.number}
                </option>
              ))}
            </select>
          ) : null}
          <label className="grid h-12 items-center rounded-lg border bg-card px-3 text-xs font-semibold text-muted-foreground">
            Ir para mes
            <input
              type="month"
              value={jumpDate ? format(jumpDate, "yyyy-MM") : ""}
              onChange={(event) => {
                if (event.target.value) setJumpDate(parseISO(`${event.target.value}-01`));
              }}
              className="bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </label>
        </div>
      </Card>

      {areas.length ? (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden p-3 md:p-5">
            <FullCalendarView
              bookings={bookings}
              jumpDate={jumpDate}
              onRangeChange={(start, end) => setVisibleRange({ start, end })}
              onDateClick={(date) => {
                setSelectedDate(date);
                setSelectedBooking(null);
              }}
              onEventClick={(booking) => setSelectedBooking(booking)}
            />
            {eventsQuery.isFetching ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando apenas as reservas deste periodo...
              </div>
            ) : null}
            {eventsQuery.error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {eventsQuery.error.message}
              </p>
            ) : null}
          </Card>

          <div className="space-y-5">
            <Card className="p-4 md:p-5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">Criar reserva</h2>
                  <p className="text-sm text-muted-foreground">Escolha dia e horário disponível.</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border bg-background p-2">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedStartAt("");
                    setSelectedEndAt("");
                  }}
                  locale={ptBR}
                  disabled={disabledDays}
                  className="morai-daypicker"
                />
              </div>
              <div className="mt-4 grid gap-3">
                {slotsQuery.isFetching ? (
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-background px-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando horarios livres...
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold">
                    Das
                    <select
                      value={selectedStartAt}
                      onChange={(event) => {
                        setSelectedStartAt(event.target.value);
                        setSelectedEndAt("");
                      }}
                      className="h-12 w-full rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
                    >
                      <option value="">Horario inicial</option>
                      {slots.filter((slot) => slot.available).map((slot) => (
                        <option key={slot.startAt} value={slot.startAt}>
                          {slotStartLabel(slot)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Ate as
                    <select
                      value={selectedEndAt}
                      onChange={(event) => setSelectedEndAt(event.target.value)}
                      disabled={!selectedStartAt}
                      className="h-12 w-full rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-60 md:text-sm"
                    >
                      <option value="">Horario final</option>
                      {availableEndOptions.map((slot) => (
                        <option key={slot.endAt} value={slot.endAt}>
                          {slotEndLabel(slot)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedStartSlot && selectedEndSlot ? (
                  <p className="rounded-lg border bg-background p-3 text-sm font-medium">
                    Reserva selecionada: {slotStartLabel(selectedStartSlot)} ate {slotEndLabel(selectedEndSlot)}
                  </p>
                ) : null}
                {unavailableSlots.length ? (
                  <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Horarios ocupados ou bloqueados neste dia</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {unavailableSlots.map((slot) => (
                        <span key={slot.label} className="rounded-full border bg-background px-3 py-1 text-xs">
                          {slot.label} {slot.reason ? `- ${slot.reason}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!slotsQuery.isFetching && !slots.length ? (
                  <p className="rounded-lg bg-background p-3 text-sm text-muted-foreground">
                    Nao ha horarios disponiveis para este dia.
                  </p>
                ) : null}
              </div>
            </Card>

            <Card className="p-4 md:p-5">
              <h2 className="font-semibold">{selectedArea?.name ?? "Área comum"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selectedArea?.rules || "Leia as regras do condomínio antes de confirmar a reserva."}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-background p-3">
                  Capacidade: {selectedArea?.capacity ?? "não informada"}
                </div>
                <div className="rounded-lg border bg-background p-3">
                  Horário: {selectedArea?.available_start_time ?? "08:00"} até {selectedArea?.available_end_time ?? "22:00"}
                </div>
                <div className="rounded-lg border bg-background p-3">
                  Aprovação: {selectedArea?.requires_approval ? "necessária" : "automática"}
                </div>
              </div>
              <form action={action} className="mt-4 grid gap-3">
                <input type="hidden" name="condominium_id" value={condoId} />
                <input type="hidden" name="common_area_id" value={selectedAreaId} />
                <input type="hidden" name="start_at" value={selectedStartAt} />
                <input type="hidden" name="end_at" value={selectedEndAt} />
                <Input name="title" defaultValue={selectedArea?.name ? `Reserva - ${selectedArea.name}` : "Reserva"} />
                <select
                  name="apartment_id"
                  defaultValue={!adminMode && apartments.length === 1 ? apartments[0].id : ""}
                  className="h-12 rounded-lg border bg-card px-3 text-base md:text-sm"
                >
                  <option value="">Apartamento</option>
                  {apartments.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {apartment.blocks?.name ?? "Bloco"} - {apartment.number}
                    </option>
                  ))}
                </select>
                <Input name="notes" placeholder="Observações" />
                <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm leading-5">
                  <input required type="checkbox" className="mt-1 accent-[#7C5C3E]" />
                  Li as regras e aceito as condições de uso da área comum.
                </label>
                <Button disabled={pending || !selectedStartAt || !selectedEndAt}>
                  <CheckCircle2 className="h-4 w-4" />
                  {pending ? "Enviando..." : selectedArea?.requires_approval ? "Enviar para aprovação" : "Confirmar reserva"}
                </Button>
              </form>
              {state.status !== "idle" ? (
                <div className={`mt-4 rounded-lg border p-3 text-sm ${
                  state.status === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}>
                  {state.message}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState icon={Calendar} title="Nenhuma área reservável" description="Cadastre uma área comum antes de abrir a agenda." />
      )}

      {selectedBooking ? (
        <Card className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border bg-card p-5 shadow-2xl md:left-auto md:right-6 md:bottom-6 md:w-96 md:rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <StatusBadge tone={statusTone[selectedBooking.status] ?? "neutral"}>
                {statusLabels[selectedBooking.status] ?? selectedBooking.status}
              </StatusBadge>
              <h2 className="mt-3 text-lg font-semibold">{selectedBooking.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(parseISO(selectedBooking.start_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {format(parseISO(selectedBooking.end_at), "HH:mm", { locale: ptBR })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedBooking.apartments?.blocks?.name ?? "Bloco"} - {selectedBooking.apartments?.number ?? "Apartamento"}
              </p>
            </div>
            <button type="button" onClick={() => setSelectedBooking(null)} className="rounded-lg p-2 hover:bg-muted">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          {selectedBooking.notes ? (
            <p className="mt-3 rounded-lg bg-background p-3 text-sm text-muted-foreground">
              {selectedBooking.notes}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {selectedBooking.status === "pending" ? (
              <>
                <Button disabled={statusPending} size="sm" className="w-full" onClick={() => mutateBooking(approveBookingAction)}>
                  Aprovar
                </Button>
                <Button disabled={statusPending} size="sm" variant="outline" className="w-full" onClick={() => mutateBooking(rejectBookingAction)}>
                  Rejeitar
                </Button>
              </>
            ) : null}
            <Button disabled={statusPending} size="sm" variant="outline" className="w-full" onClick={() => mutateBooking(cancelBookingAction)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            Conflitos de horário, horários permitidos, antecedência e limite mensal
            são validados também no backend. A interface ajuda, mas a regra segura
            fica no Supabase.
          </p>
        </div>
      </Card>
    </div>
  );
}
