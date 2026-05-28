"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useEffect, useRef } from "react";
import type { CalendarBooking } from "@/components/app/calendar-types";

const statusClass: Record<string, string> = {
  pending: "morai-event-pending",
  approved: "morai-event-approved",
  rejected: "morai-event-rejected",
  canceled: "morai-event-canceled",
  cancelled: "morai-event-canceled",
  blocked: "morai-event-blocked",
};

export function FullCalendarView({
  bookings,
  onDateClick,
  onEventClick,
  onRangeChange,
  jumpDate,
}: {
  bookings: CalendarBooking[];
  onDateClick: (date: Date) => void;
  onEventClick: (booking: CalendarBooking) => void;
  onRangeChange: (start: Date, end: Date) => void;
  jumpDate?: Date;
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const events: EventInput[] = bookings.map((booking) => ({
    id: booking.id,
    title: [
      booking.title || booking.common_areas?.name || "Reserva",
      booking.profiles?.full_name ? `por ${booking.profiles.full_name}` : null,
    ].filter(Boolean).join(" - "),
    start: booking.start_at,
    end: booking.end_at,
    classNames: [statusClass[booking.status] ?? "morai-event-pending"],
    extendedProps: { booking },
  }));

  useEffect(() => {
    if (jumpDate) calendarRef.current?.getApi().gotoDate(jumpDate);
  }, [jumpDate]);

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView="listWeek"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      }}
      buttonText={{
        today: "Hoje",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        list: "Lista",
      }}
      locale="pt-br"
      timeZone="America/Sao_Paulo"
      height="auto"
      events={events}
      nowIndicator
      selectable
      dayMaxEvents={3}
      datesSet={(arg: DatesSetArg) => onRangeChange(arg.start, arg.end)}
      dateClick={(arg: DateClickArg) => onDateClick(arg.date)}
      eventClick={(arg: EventClickArg) => {
        const booking = arg.event.extendedProps.booking as CalendarBooking;
        onEventClick(booking);
      }}
      windowResize={(view) => {
        if (window.innerWidth < 768 && view.view.type !== "listWeek") {
          view.view.calendar.changeView("listWeek");
        }
      }}
    />
  );
}
