import { toast } from "sonner";
import { CalendarEvent } from "./types";
import { formatEventTime } from "./EventFormatter";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Helper function to convert database event to local CalendarEvent format
const convertDbEventToLocal = (dbEvent: any): CalendarEvent => {
  const eventDate = new Date(dbEvent.date);
  const startTime = dbEvent.start_time?.substring(0, 5) || "09:00";
  const endTime = dbEvent.end_time?.substring(0, 5) || "10:00";
  
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || undefined,
    date: eventDate,
    time: startTime,
    startTime: startTime,
    endTime: endTime,
    type: (dbEvent.type as "reminder" | "trip" | "booking" | "maintenance" | "inspection") || "reminder",
    location: dbEvent.location || undefined,
  };
};

export const handleEventMove = async (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
  // Find event by ID first, then fall back to index
  let event = events.find(e => e.id === eventId);
  let eventIndex = -1;
  
  if (!event) {
    const idParts = eventId.split("-");
    eventIndex = parseInt(idParts[idParts.length - 1], 10);
    if (!isNaN(eventIndex) && events[eventIndex]) {
      event = events[eventIndex];
    }
  } else {
    eventIndex = events.findIndex(e => e.id === eventId);
  }
  
  if (!event) return;
  
  // Update local state immediately for responsiveness
  const updatedEvents = [...events];
  const updatedEvent = { ...event };
  updatedEvent.date = new Date(newStart);
  updatedEvent.startTime = format(newStart, "HH:mm");
  updatedEvent.endTime = format(newEnd, "HH:mm");
  updatedEvent.time = formatEventTime(updatedEvent.startTime, updatedEvent.endTime);
  updatedEvents[eventIndex] = updatedEvent;
  setEvents(updatedEvents);
  
  toast(`Event moved: ${updatedEvent.title} has been moved to ${format(updatedEvent.date, "MMMM d")} at ${updatedEvent.time}.`);
  
  // Save to database if event has an ID
  if (event.id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("calendar_events")
      .update({
        date: updatedEvent.date.toISOString().split("T")[0],
        start_time: `${updatedEvent.startTime}:00`,
        end_time: `${updatedEvent.endTime}:00`,
        time: `${updatedEvent.startTime}:00`
      })
      .eq("id", event.id)
      .eq("user_id", user.id);
      
    if (error) {
      console.error("Failed to update event in database:", error);
      toast.error("Failed to save changes to database.");
    }
  }
};

export const handleEventResize = async (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
  // Find event by ID first, then fall back to index
  let event = events.find(e => e.id === eventId);
  let eventIndex = -1;
  
  if (!event) {
    const idParts = eventId.split("-");
    eventIndex = parseInt(idParts[idParts.length - 1], 10);
    if (!isNaN(eventIndex) && events[eventIndex]) {
      event = events[eventIndex];
    }
  } else {
    eventIndex = events.findIndex(e => e.id === eventId);
  }
  
  if (!event) return;
  
  // Update local state immediately for responsiveness
  const updatedEvents = [...events];
  const updatedEvent = { ...event };
  updatedEvent.startTime = format(newStart, "HH:mm");
  updatedEvent.endTime = format(newEnd, "HH:mm");
  updatedEvent.time = formatEventTime(updatedEvent.startTime, updatedEvent.endTime);
  updatedEvents[eventIndex] = updatedEvent;
  setEvents(updatedEvents);
  
  toast(`Event resized: ${updatedEvent.title} duration updated to ${updatedEvent.time}.`);
  
  // Save to database if event has an ID
  if (event.id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("calendar_events")
      .update({
        start_time: `${updatedEvent.startTime}:00`,
        end_time: `${updatedEvent.endTime}:00`,
        time: `${updatedEvent.startTime}:00`
      })
      .eq("id", event.id)
      .eq("user_id", user.id);
      
    if (error) {
      console.error("Failed to update event in database:", error);
      toast.error("Failed to save changes to database.");
    }
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
  const idParts = eventId.split("-");
  const eventIndex = parseInt(idParts[idParts.length - 1], 10);
  if (!isNaN(eventIndex) && events[eventIndex]) {
    const event = events[eventIndex];
    setNewEventDate(event.date);
    const [startHour, startMinute] = event.startTime.split(":").map(Number);
    const startDate = new Date(event.date);
    startDate.setHours(startHour, startMinute, 0);
    setEventStartTime(startDate);
    const [endHour, endMinute] = event.endTime.split(":").map(Number);
    const endDate = new Date(event.date);
    endDate.setHours(endHour, endMinute, 0);
    setEventEndTime(endDate);
    setNewEventHour(startHour);
    setEditingEventId(eventId);
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
  // Use the actual end time from calendar selection, fall back to 15min if no duration
  const actualEnd = end.getTime() > start.getTime() ? end : new Date(start.getTime() + 15 * 60 * 1000);
  setEventStartTime(start);
  setEventEndTime(actualEnd);
  setNewEventDate(start);
  setNewEventHour(start.getHours());
  setEditingEventId(null);
  setIsEventModalOpen(true);
};

export const handleEventSubmit = async (
  data: CalendarEvent,
  editingEventId: string | null,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  reloadEvents?: () => Promise<void>
): Promise<void> => {
  if (editingEventId) {
    // Find the event being edited
    let eventToUpdate = events.find(e => e.id === editingEventId);
    let eventIndex = -1;
    
    if (!eventToUpdate) {
      // Fall back to index-based ID for backwards compatibility
      const idParts = editingEventId.split("-");
      eventIndex = parseInt(idParts[idParts.length - 1], 10);
      if (!isNaN(eventIndex) && events[eventIndex]) {
        eventToUpdate = events[eventIndex];
      }
    } else {
      eventIndex = events.findIndex(e => e.id === editingEventId);
    }
    
    if (!eventToUpdate) {
      toast.error("Event not found.");
      setIsEventModalOpen(false);
      return;
    }

    // Save update to database
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Not signed in – cannot save event.");
      setIsEventModalOpen(false);
      return;
    }

    const payload = {
      title: data.title,
      description: data.description || "",
      date: data.date.toISOString().split("T")[0],
      time: `${data.startTime}:00`,
      start_time: `${data.startTime}:00`,
      end_time: `${data.endTime}:00`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      type: data.type,
      location: data.location || "",
    };

    if (eventToUpdate.id) {
      // Update existing database record
      const { error } = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", eventToUpdate.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Database update error:", error);
        toast.error("Failed to save event changes.");
      } else {
        toast.success("Event changes saved.");
        // Reload events from database to ensure consistency
        if (reloadEvents) await reloadEvents();
      }
    } else {
      // This is a local-only event, create it in the database
      const { data: dbNewEvent, error } = await supabase
        .from("calendar_events")
        .insert([{ ...payload, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error("Database insert error:", error);
        toast.error("Failed to save event.");
      } else {
        toast.success("Event saved.");
        if (reloadEvents) await reloadEvents();
      }
    }
  } else {
    // Creating a new event
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Not signed in – cannot save event.");
      setIsEventModalOpen(false);
      return;
    }

    // Create a temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}`;
    const tempEvent: CalendarEvent = {
      id: tempId,
      date: data.date,
      title: data.title,
      type: data.type,
      time: formatEventTime(data.startTime, data.endTime),
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description,
      location: data.location,
    };

    // Add to local state immediately for better UX
    setEvents((prev) => [...prev, tempEvent]);

    // Prepare payload for database
    const payload = {
      title: data.title,
      description: data.description || "",
      date: data.date.toISOString().split("T")[0],
      time: `${data.startTime}:00`,
      start_time: `${data.startTime}:00`,
      end_time: `${data.endTime}:00`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      type: data.type,
      user_id: user.id,
      location: data.location || "",
    };

    const { data: insertedEvent, error } = await supabase
      .from("calendar_events")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      toast.error(`Failed to save event: ${error.message}`);
      // Remove the temporary event on failure
      setEvents((prev) => prev.filter(e => e.id !== tempId));
    } else {
      toast.success("Event saved successfully!");
      // Replace temporary event with the saved one from database
      const savedEvent = convertDbEventToLocal(insertedEvent);
      setEvents((prev) => {
        const filteredEvents = prev.filter(e => e.id !== tempId);
        return [...filteredEvents, savedEvent];
      });
      if (reloadEvents) await reloadEvents();
    }
  }

  setIsEventModalOpen(false);
};
