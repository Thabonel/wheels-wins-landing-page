
import type { CalendarEvent } from "@/components/you/types";
import type { EventFormData } from "@/components/you/types";
import React, { useState } from "react";
import "@/components/you/calendar-styles.css";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { Card, CardContent } from "@/components/ui/card";
import CalendarContainer from "@/components/you/CalendarContainer";
import EventModal from "@/components/you/EventModal";
import { getFormattedTime } from "@/components/you/EventFormatter";
import { supabase } from "@/integrations/supabase/client";
import {
  handleEventCreate,
  handleEventMove,
  handleEventResize,
  handleEventSubmit,
  handleEventDelete
} from "@/components/you/EventHandlers";

const UserCalendar = () => {
  console.log("🎯 UserCalendar component mounting");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const { events, setEvents, loading, accessStatus, reloadEvents } = useCalendarEvents();

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
    // Try to find by ID first, then fall back to index-based ID
    let ev = events.find(e => e.id === eventId);
    if (!ev) {
      const idParts = eventId.split("-");
      const eventIndex = parseInt(idParts[idParts.length - 1], 10);
      if (!isNaN(eventIndex) && events[eventIndex]) {
        ev = events[eventIndex];
      }
    }
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

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading calendar events...</div>
        </CardContent>
      </Card>
    );
  }

  // Show gentle message if no events available (regardless of reason)
  const showEmptyState = !loading && events.length === 0;

  return (
    <>
      {showEmptyState && (
        <Card className="mb-4">
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-sm text-muted-foreground">
              {accessStatus === 'forbidden'
                ? "No calendar events found yet"
                : "No calendar events found yet"}
            </div>
          </CardContent>
        </Card>
      )}
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
        onSubmit={(data: EventFormData) => {
          // Convert EventFormData to CalendarEvent format
          const calendarEvent: CalendarEvent = {
            title: data.title,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            type: data.type,
            description: data.description,
            location: data.location,
            time: data.startTime // Add the required time property
          };
          
          handleEventSubmit(
            calendarEvent,
            editingEventId,
            events,
            setEvents,
            setIsEventModalOpen,
            reloadEvents
          );
        }}
        onCancel={() => setIsEventModalOpen(false)}
        onDelete={editingEventId ? () => handleEventDelete(
          editingEventId,
          supabase,
          setEvents,
          setIsEventModalOpen,
          setEditingEventId
        ) : undefined}
      />
    </>
  );
};

export default UserCalendar;
