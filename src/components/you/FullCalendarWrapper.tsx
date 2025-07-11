import React, { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventChangeArg, DateSelectArg } from "@fullcalendar/core";
import { CalendarViewProps, CalendarEvent } from "./types";

interface FullCalendarWrapperProps extends Omit<CalendarViewProps, "onAddEvent"> {
  viewMode: "month" | "week" | "day";
  onEventEdit: (eventId: string) => void;         // clicks on existing events
  onEventCreate: (start: Date, end: Date) => void; // clicks/drag on empty dates
  onEventMove: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize: (eventId: string, newStart: Date, newEnd: Date) => void;
}

interface FullCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: "trip" | "booking" | "reminder" | "maintenance" | "inspection";
    originalEvent: CalendarEvent;
  };
}

const FullCalendarWrapper: React.FC<FullCalendarWrapperProps> = ({
  currentDate,
  events,
  viewMode,
  onEventEdit,
  onEventCreate,
  onEventMove,
  onEventResize
}) => {
  const calendarRef = useRef<FullCalendar | null>(null);

  // map our events → FullCalendar format
  const mapEventsToFullCalendar = (): FullCalendarEvent[] =>
    events.map((event, idx) => {
      const eventDate = new Date(event.date);
      const [sh, sm] = event.startTime.split(":").map(Number);
      const [eh, em] = event.endTime.split(":").map(Number);
      const start = new Date(eventDate);
      start.setHours(sh, sm, 0);
      const end = new Date(eventDate);
      end.setHours(eh, em, 0);

      let bg, border, text;
      switch (event.type) {
        case "trip":
          bg = "rgba(59,130,246,0.2)";
          border = "rgb(59,130,246)";
          text = "rgb(30,64,175)";
          break;
        case "booking":
          bg = "rgba(34,197,94,0.2)";
          border = "rgb(34,197,94)";
          text = "rgb(21,128,61)";
          break;
        case "reminder":
          bg = "rgba(245,158,11,0.2)";
          border = "rgb(245,158,11)";
          text = "rgb(180,83,9)";
          break;
 case "maintenance":
          bg = "rgba(139,92,246,0.2)"; // Purple
          border = "rgb(139,92,246)";
          text = "rgb(109,40,217)";
          break;
        case "inspection":
          bg = "rgba(236,72,153,0.2)"; // Pink
          border = "rgb(236,72,153)";
          text = "rgb(192,38,126)";
          break;
      }

      return {
        id: event.id || `${event.title}-${idx}`,
        title: event.title,
        start,
        end,
        backgroundColor: bg!,
        borderColor: border!,
        textColor: text!,
        extendedProps: { type: event.type, originalEvent: event }
      };
    });

  // when user drags a range → create new
  const handleDateSelect = (info: DateSelectArg) => {
    onEventCreate(info.start, info.end);
  };

  // **this** handles clicks on existing events → edit
  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.stopPropagation();  // prevent falling through to dateClick
    onEventEdit(info.event.id);
  };

  // handle date click (for double click to go to day view)
  const handleDateClick = (info: any) => {
    // Check if it was a double click
    if (info.jsEvent.detail === 2) {
      calendarRef.current?.getApi().changeView('timeGridDay');
      calendarRef.current?.getApi().gotoDate(info.date);
    }
  };

  // drag/drop move
  const handleEventChange = (info: EventChangeArg) => {
    onEventMove(
      info.event.id,
      info.event.start || new Date(),
      info.event.end || new Date()
    );
  };

  // resize
  const handleEventResize = (info: any) => {
    onEventResize(
      info.event.id,
      info.event.start || new Date(),
      info.event.end || new Date()
    );
  };

  // sync view & date
  useEffect(() => {
    const cal = calendarRef.current?.getApi();
    if (!cal) return;
    if (viewMode === "month") cal.changeView("dayGridMonth");
    else if (viewMode === "week") cal.changeView("timeGridWeek");
    else cal.changeView("timeGridDay");
    cal.gotoDate(currentDate);
  }, [viewMode, currentDate]);

  return (
    <div className="full-calendar-wrapper">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={
          viewMode === "month"
            ? "dayGridMonth"
            : viewMode === "week"
            ? "timeGridWeek"
            : "timeGridDay"
        }
        headerToolbar={false}
        initialDate={currentDate}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={mapEventsToFullCalendar()}
        select={handleDateSelect}
        dateClick={handleDateClick} // Add dateClick handler
        eventClick={handleEventClick}
        eventChange={handleEventChange}
        eventResize={handleEventResize}
        height="auto"
        allDaySlot={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        dayHeaderFormat={{ weekday: "short", day: "numeric" }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
      />
    </div>
  );
};

export default FullCalendarWrapper;
