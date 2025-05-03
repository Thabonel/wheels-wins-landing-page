
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventChangeArg, DateSelectArg, EventResizeDoneArg } from "@fullcalendar/core";
import { CalendarViewProps, CalendarEvent, EventFormData } from "./types";
import { format } from "date-fns";

interface FullCalendarWrapperProps extends Omit<CalendarViewProps, 'onAddEvent'> {
  viewMode: "month" | "week" | "day";
  onEventSelect: (eventId: string) => void;
  onEventCreate: (start: Date, end: Date) => void;
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
    type: "trip" | "booking" | "reminder";
    originalEvent: CalendarEvent;
  };
}

const FullCalendarWrapper: React.FC<FullCalendarWrapperProps> = ({
  currentDate,
  events,
  viewMode,
  onEventSelect,
  onEventCreate,
  onEventMove,
  onEventResize
}) => {
  const calendarRef = useRef<FullCalendar | null>(null);
  
  // Convert our calendar events to FullCalendar format
  const mapEventsToFullCalendar = (): FullCalendarEvent[] => {
    return events.map((event, index) => {
      // Parse start and end times
      const eventDate = new Date(event.date);
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      
      const start = new Date(eventDate);
      start.setHours(startHour, startMinute, 0);
      
      const end = new Date(eventDate);
      end.setHours(endHour, endMinute, 0);
      
      // Define colors based on event type
      let backgroundColor, borderColor, textColor;
      
      switch (event.type) {
        case 'trip':
          backgroundColor = 'rgba(59, 130, 246, 0.2)';
          borderColor = 'rgb(59, 130, 246)';
          textColor = 'rgb(30, 64, 175)';
          break;
        case 'booking':
          backgroundColor = 'rgba(34, 197, 94, 0.2)';
          borderColor = 'rgb(34, 197, 94)';
          textColor = 'rgb(21, 128, 61)';
          break;
        case 'reminder':
          backgroundColor = 'rgba(245, 158, 11, 0.2)';
          borderColor = 'rgb(245, 158, 11)';
          textColor = 'rgb(180, 83, 9)';
          break;
      }
      
      return {
        id: `${event.title}-${index}`,
        title: event.title,
        start,
        end,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          type: event.type,
          originalEvent: event
        }
      };
    });
  };

  // Handle when a user selects a time range (click and drag)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    onEventCreate(selectInfo.start, selectInfo.end);
  };

  // Handle when a user clicks on an event
  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventSelect(clickInfo.event.id);
  };

  // Handle when a user drags an event to a new time/date
  const handleEventChange = (changeInfo: EventChangeArg) => {
    onEventMove(
      changeInfo.event.id,
      changeInfo.event.start || new Date(),
      changeInfo.event.end || new Date()
    );
  };

  // Handle when a user resizes an event
  const handleEventResize = (resizeInfo: EventResizeDoneArg) => {
    onEventResize(
      resizeInfo.event.id,
      resizeInfo.event.start || new Date(),
      resizeInfo.event.end || new Date()
    );
  };

  // Update calendar view when viewMode changes
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      
      if (viewMode === "month") {
        calendarApi.changeView('dayGridMonth');
      } else if (viewMode === "week") {
        calendarApi.changeView('timeGridWeek');
      } else if (viewMode === "day") {
        calendarApi.changeView('timeGridDay');
      }
      
      calendarApi.gotoDate(currentDate);
    }
  }, [viewMode, currentDate]);

  return (
    <div className="full-calendar-wrapper">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={
          viewMode === "month" ? "dayGridMonth" : 
          viewMode === "week" ? "timeGridWeek" : 
          "timeGridDay"
        }
        headerToolbar={false}
        initialDate={currentDate}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={mapEventsToFullCalendar()}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventChange={handleEventChange}
        eventResize={handleEventResize}
        height="auto"
        allDaySlot={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        dayHeaderFormat={{
          weekday: 'short', 
          day: 'numeric'
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: 'short'
        }}
      />
    </div>
  );
};

export default FullCalendarWrapper;
