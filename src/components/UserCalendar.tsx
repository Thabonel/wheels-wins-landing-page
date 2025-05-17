import type { CalendarEvent } from "@/components/you/types";
import type { EventFormData } from "@/components/you/types";
import React, { useState } from "react";
import "@/components/you/calendar-styles.css";
import { useToast } from "@/hooks/use-toast";
import CalendarContainer from "@/components/you/CalendarContainer";
import EventModal from "@/components/you/EventModal";
import { getFormattedTime } from "@/components/you/EventFormatter";
import {
  handleEventCreate,
  handleEventMove,
  handleEventResize,
  handleEventSubmit
} from "@/components/you/EventHandlers";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([/* initial events */]);

  const { toast } = useToast();
  
  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());
  const [newEventHour, setNewEventHour] = useState<number>(9);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventTitle, setEditingEventTitle] = useState<string>("");
  const [editingEventType, setEditingEventType] = useState<string>("reminder");
  
  // Event creation/edit state
  const [eventStartTime, setEventStartTime] = useState<Date>(new Date());
  const [eventEndTime, setEventEndTime] = useState<Date>(new Date());

  const handleEventSelect = (eventId: string) => {
    const ev = events.find((e, idx) => `${e.title}-${idx}` === eventId);
    if (!ev) return;

    // Copy the date so we don't mutate state
    const baseDate = new Date(ev.date);
    const [sh, sm] = ev.startTime.split(':').map(Number);
    const startDate = new Date(baseDate);
    startDate.setHours(sh, sm, 0);

    const [eh, em] = ev.endTime.split(':').map(Number);
    const endDate = new Date(baseDate);
    endDate.setHours(eh, em, 0);

    setEditingEventId(eventId);
    setEditingEventTitle(ev.title);
    setEditingEventType(ev.type);
    setNewEventDate(baseDate);
    setEventStartTime(startDate);
    setEventEndTime(endDate);
    setNewEventHour(baseDate.getHours());
    setIsEventModalOpen(true);
  };

  return (
    <>
      <CalendarContainer
        currentDate={currentDate}
        viewMode={viewMode}
        events={events}
        setCurrentDate={setCurrentDate}
        setViewMode={setViewMode}
        onEventEdit={handleEventSelect}
        onEventCreate={(start, end) => handleEventCreate(
          start,
          end,
          setEventStartTime,
          setEventEndTime,
          setNewEventDate,
          setNewEventHour,
          setEditingEventId,
          setIsEventModalOpen
        )}
        onEventMove={(eventId, newStart, newEnd) => handleEventMove(
          eventId,
          newStart,
          newEnd,
          events,
          setEvents
        )}
        onEventResize={(eventId, newStart, newEnd) => handleEventResize(
          eventId,
          newStart,
          newEnd,
          events,
          setEvents
        )}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onOpenChange={setIsEventModalOpen}
        isEditing={!!editingEventId}
        defaultDate={newEventDate}
        defaultHour={newEventHour}
        defaultTitle={editingEventTitle}
        defaultType={editingEventType}
        defaultStartTime={getFormattedTime(eventStartTime)}
        defaultEndTime={getFormattedTime(eventEndTime)}
        onSubmit={(data: EventFormData) => handleEventSubmit(
          data,
          editingEventId,
          events,
          setEvents,
          setIsEventModalOpen
        )}
        onCancel={() => setIsEventModalOpen(false)}
      />
    </>
  );
};

export default UserCalendar;
