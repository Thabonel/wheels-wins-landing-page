import { toast } from "sonner";
import { CalendarEvent } from "./types";
import { formatEventTime } from "./EventFormatter";
import { format } from "date-fns";

export const handleEventMove = (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
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
    
    toast(`Event moved: ${event.title} has been moved to ${format(event.date, 'MMMM d')} at ${event.time}.`);
  }
};

export const handleEventResize = (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
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
    
    toast(`Event resized: ${event.title} duration updated to ${event.time}.`);
  }
};

export const handleEventSelect = (
  eventId: string,
  events: CalendarEvent[],
  setNewEventDate: React.Dispatch<React.SetStateAction<Date>>,
  setEventStartTime: React.Dispatch<React.SetStateAction<Date>>,
  setEventEndTime: React.Dispatch<React.SetStateAction<Date>>,
  setNewEventHour: React.Dispatch<React.SetStateAction<number>>,
  setEditingEventId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
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

export const handleEventCreate = (
  start: Date,
  end: Date,
  setEventStartTime: React.Dispatch<React.SetStateAction<Date>>,
  setEventEndTime: React.Dispatch<React.SetStateAction<Date>>,
  setNewEventDate: React.Dispatch<React.SetStateAction<Date>>,
  setNewEventHour: React.Dispatch<React.SetStateAction<number>>,
  setEditingEventId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setEventStartTime(start);
  setEventEndTime(end);
  setNewEventDate(start);
  setNewEventHour(start.getHours());
  setEditingEventId(null);
  setIsEventModalOpen(true);
};

export const handleEventSubmit = (
  data: any,
  editingEventId: string | null,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
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
      
      toast(`Event updated: ${data.title} has been updated.`);
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
    
    toast(`Event created: ${data.title} has been added to your calendar.`);
  }
  
  setIsEventModalOpen(false);
};
