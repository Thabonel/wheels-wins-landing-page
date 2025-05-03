import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarNavigation from "./calendar/CalendarNavigation";
import EventForm from "./calendar/EventForm";
import { CalendarEvent, EventFormData } from "./calendar/types";
import FullCalendarWrapper from "./calendar/FullCalendarWrapper";

// We don't need CSS imports as we've defined our own styles in calendar-styles.css

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

  // Handle creating a new event via selection
  const handleEventCreate = (start: Date, end: Date) => {
    setEventStartTime(start);
    setEventEndTime(end);
    setNewEventDate(start);
    setNewEventHour(start.getHours());
    setEditingEventId(null);
    setIsEventModalOpen(true);
  };

  // Handle clicking on an existing event
  const handleEventSelect = (eventId: string) => {
    const idParts = eventId.split('-');
    const eventIndex = parseInt(idParts[idParts.length - 1]);
    if (!isNaN(eventIndex) && events[eventIndex]) {
      // Populate form with existing event data
      const event = events[eventIndex];
      setNewEventDate(event.date);
      
      // Parse the hours and minutes
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const startDate = new Date(event.date);
      startDate.setHours(startHour, startMinute, 0);
      setEventStartTime(startDate);
      
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      const endDate = new Date(event.date);
      endDate.setHours(endHour, endMinute, 0);
      setEventEndTime(endDate);
      
      setNewEventHour(startHour);
      setEditingEventId(`${eventId}`);
      setIsEventModalOpen(true);
    }
  };

  // Handle moving an event via drag and drop
  const handleEventMove = (eventId: string, newStart: Date, newEnd: Date) => {
    const idParts = eventId.split('-');
    const eventIndex = parseInt(idParts[idParts.length - 1]);
    
    if (!isNaN(eventIndex) && events[eventIndex]) {
      const updatedEvents = [...events];
      const event = {...updatedEvents[eventIndex]};
      
      // Update the date
      event.date = new Date(newStart);
      
      // Update startTime and endTime in HH:MM format
      event.startTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
      event.endTime = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
      
      // Update display time
      event.time = formatEventTime(event.startTime, event.endTime);
      
      updatedEvents[eventIndex] = event;
      setEvents(updatedEvents);
      
      toast({
        title: "Event moved",
        description: `${event.title} has been moved to ${format(event.date, 'MMMM d')} at ${event.time}.`
      });
    }
  };

  // Handle resizing an event
  const handleEventResize = (eventId: string, newStart: Date, newEnd: Date) => {
    const idParts = eventId.split('-');
    const eventIndex = parseInt(idParts[idParts.length - 1]);
    
    if (!isNaN(eventIndex) && events[eventIndex]) {
      const updatedEvents = [...events];
      const event = {...updatedEvents[eventIndex]};
      
      // Update startTime and endTime (keeping the date the same)
      event.startTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
      event.endTime = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
      
      // Update display time
      event.time = formatEventTime(event.startTime, event.endTime);
      
      updatedEvents[eventIndex] = event;
      setEvents(updatedEvents);
      
      toast({
        title: "Event resized",
        description: `${event.title} duration updated to ${event.time}.`
      });
    }
  };

  const handleEventSubmit = (data: EventFormData) => {
    if (editingEventId) {
      // Edit existing event
      const idParts = editingEventId.split('-');
      const eventIndex = parseInt(idParts[idParts.length - 1]);
      
      if (!isNaN(eventIndex) && events[eventIndex]) {
        const updatedEvents = [...events];
        const updatedEvent: CalendarEvent = {
          ...updatedEvents[eventIndex],
          title: data.title,
          type: data.type,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          time: formatEventTime(data.startTime, data.endTime)
        };
        
        updatedEvents[eventIndex] = updatedEvent;
        setEvents(updatedEvents);
        
        toast({
          title: "Event updated",
          description: `${data.title} has been updated.`
        });
      }
    } else {
      // Create new event
      const newEvent: CalendarEvent = {
        date: data.date,
        title: data.title,
        type: data.type,
        time: formatEventTime(data.startTime, data.endTime),
        startTime: data.startTime,
        endTime: data.endTime
      };

      // Add event to the list
      setEvents(prev => [...prev, newEvent]);
      
      toast({
        title: "Event created",
        description: `${data.title} has been added to your calendar.`
      });
    }
    
    setIsEventModalOpen(false);
  };

  const formatEventTime = (start: string, end: string) => {
    const startHour = parseInt(start.split(':')[0]);
    const startDisplay = startHour === 0 && end === "23:59" ? "All day" :
                         startHour === 12 ? "12 PM" : 
                         startHour > 12 ? `${startHour - 12}:${start.split(':')[1]} PM` : 
                         `${startHour}:${start.split(':')[1]} AM`;
    return startDisplay;
  };

  // Convert dates to appropriate formats for the EventForm
  const getFormattedStartTime = () => {
    return `${String(eventStartTime.getHours()).padStart(2, '0')}:${String(eventStartTime.getMinutes()).padStart(2, '0')}`;
  };

  const getFormattedEndTime = () => {
    return `${String(eventEndTime.getHours()).padStart(2, '0')}:${String(eventEndTime.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CalendarNavigation 
          currentDate={currentDate}
          viewMode={viewMode}
          setCurrentDate={setCurrentDate}
          setViewMode={setViewMode}
        />
      </CardHeader>
      <CardContent>
        <div className="fullcalendar-container">
          <FullCalendarWrapper
            currentDate={currentDate}
            events={events}
            viewMode={viewMode}
            onEventSelect={handleEventSelect}
            onEventCreate={handleEventCreate}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
          />
        </div>
      </CardContent>

      {/* Event Creation/Edit Dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEventId ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          <EventForm 
            defaultDate={newEventDate}
            defaultHour={newEventHour}
            onSubmit={handleEventSubmit}
            onCancel={() => setIsEventModalOpen(false)}
            isEditing={!!editingEventId}
            defaultStartTime={getFormattedStartTime()}
            defaultEndTime={getFormattedEndTime()}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserCalendar;
