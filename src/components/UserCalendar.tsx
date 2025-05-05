
import React, { useState } from "react";
import "@/components/you/calendar-styles.css";
import { useToast } from "@/hooks/use-toast";
import { CalendarEvent, EventFormData } from "./calendar/types";
import CalendarContainer from "./calendar/CalendarContainer";
import EventModal from "./calendar/EventModal";
import { getFormattedTime } from "./calendar/EventFormatter";
import {
  handleEventCreate,
  handleEventMove,
  handleEventResize,
  handleEventSelect,
  handleEventSubmit
} from "./calendar/EventHandlers";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip", time: "9:00 AM", startTime: "09:00", endTime: "11:00" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking", time: "All day", startTime: "00:00", endTime: "23:59" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder", time: "3:00 PM", startTime: "15:00", endTime: "15:30" },
    { date: new Date(2025, 4, 15), title: "Car service", type: "booking", time: "2:30 PM", startTime: "14:30", endTime: "16:00" },
    { date: new Date(2025, 4, 20), title: "Road trip planning", type: "trip", time: "7:00 PM", startTime: "19:00", endTime: "20:30" },
    { date: new Date(2025, 4, 22), title: "Camping gear check", type: "reminder", time: "10:00 AM", startTime: "10:00", endTime: "11:00" },
    { date: new Date(2025, 4, 5), title: "Fuel top-up", type: "reminder", time: "12:30 PM", startTime: "12:30", endTime: "13:00" }
  ]);

  const { toast } = useToast();
  
  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());
  const [newEventHour, setNewEventHour] = useState<number>(9);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Event creation/edit state
  const [eventStartTime, setEventStartTime] = useState<Date>(new Date());
  const [eventEndTime, setEventEndTime] = useState<Date>(new Date());

  return (
    <>
      <CalendarContainer
        currentDate={currentDate}
        viewMode={viewMode}
        events={events}
        setCurrentDate={setCurrentDate}
        setViewMode={setViewMode}
        onEventSelect={(eventId) => handleEventSelect(
          eventId, 
          events, 
          setNewEventDate, 
          setEventStartTime, 
          setEventEndTime, 
          setNewEventHour, 
          setEditingEventId, 
          setIsEventModalOpen
        )}
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

      {/* Event Creation/Edit Dialog */}
      <EventModal
        isOpen={isEventModalOpen}
        onOpenChange={setIsEventModalOpen}
        isEditing={!!editingEventId}
        defaultDate={newEventDate}
        defaultHour={newEventHour}
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
