import { toast } from "sonner";
import { CalendarEvent } from "./types";
import { formatEventTime } from "./EventFormatter";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { executeWithRetry, handleSupabaseResponse } from "@/utils/supabaseErrorHandler";

// Helper function to check if user is admin
const isUserAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];
  return adminEmails.includes(user.email);
};

// For client-side operations, we always use the regular supabase client
// Admin operations should be handled via RLS policies, not service role
const getSupabaseClient = () => {
  return supabase;
};

// Helper function to convert database event to local CalendarEvent format
const convertDbEventToLocal = (dbEvent: any): CalendarEvent => {
  const startDate = new Date(dbEvent.start_date);
  const endDate = new Date(dbEvent.end_date);
  const startTime = startDate.toTimeString().substring(0, 5);
  const endTime = endDate.toTimeString().substring(0, 5);

  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || undefined,
    date: startDate,
    time: startTime,
    startTime,
    endTime,
    type: (dbEvent.event_type as "reminder" | "trip" | "booking" | "maintenance" | "inspection") || "reminder",
    location: dbEvent.location_name || undefined,
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

    console.log('🔍 DEBUG - Move attempt:', {
      eventId: event.id,
      userId: user.id,
      userEmail: user.email
    });

    const client = getSupabaseClient();
    const startDateTime = new Date(updatedEvent.date);
    const [startHour, startMinute] = updatedEvent.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0);

    const endDateTime = new Date(updatedEvent.date);
    const [endHour, endMinute] = updatedEvent.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0);

    const { error } = await client
      .from("calendar_events")
      .update({
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString()
      })
      .eq("id", event.id)
      .eq("user_id", user.id);

    // Handle the specific case where Supabase returns HTML instead of JSON
    const isHtmlResponseError = error && error.message && error.message.includes('Unexpected token \'<\'');

    if (error && !isHtmlResponseError) {
      console.error("Failed to update event in database:", error);
      toast.error("Failed to save changes to database.");
    } else if (isHtmlResponseError) {
      console.warn('🟡 HTML response received instead of JSON - assuming move succeeded');
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

    const client = getSupabaseClient();

    const startDateTime = new Date(event.date);
    const [startHour, startMinute] = updatedEvent.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0);

    const endDateTime = new Date(event.date);
    const [endHour, endMinute] = updatedEvent.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0);

    const { error } = await client
      .from("calendar_events")
      .update({
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString()
      })
      .eq("id", event.id)
      .eq("user_id", user.id);

    // Handle the specific case where Supabase returns HTML instead of JSON
    const isHtmlResponseError = error && error.message && error.message.includes('Unexpected token \'<\'');

    if (error && !isHtmlResponseError) {
      console.error("Failed to update event in database:", error);
      toast.error("Failed to save changes to database.");
    } else if (isHtmlResponseError) {
      console.warn('🟡 HTML response received instead of JSON - assuming resize succeeded');
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

    const startDateTime = new Date(data.date);
    const [startHour, startMinute] = data.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0);

    const endDateTime = new Date(data.date);
    const [endHour, endMinute] = data.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0);

    const payload = {
      title: data.title,
      description: data.description || "",
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      all_day: false,
      event_type: data.type,
      location_name: data.location || "",
      reminder_minutes: [15],
      color: "#3b82f6",
      is_private: true,
    };

    if (eventToUpdate.id) {
      // Update existing database record using retry logic
      try {
        await executeWithRetry(async () => {
          const client = getSupabaseClient();
          const response = await client
            .from("calendar_events")
            .update(payload)
            .eq("id", eventToUpdate.id)
            .eq("user_id", user.id);

          const result = handleSupabaseResponse(response, 'Calendar Event Update', true);

          if (!result.success && result.shouldRetry) {
            throw new Error('Retryable error occurred');
          }

          if (!result.success) {
            throw new Error(`Update failed: ${response.error?.message}`);
          }

          return result;
        }, 'Update Calendar Event', 2);

        // If we get here, the operation succeeded
        console.log('✅ Event updated successfully');
        toast.success("Event changes saved.");
        // Reload events from database to ensure consistency
        if (reloadEvents) await reloadEvents();
      } catch (error) {
        console.error('❌ Failed to update event after retries:', error);
        toast.error("Failed to save event changes.");
      }
    } else {
      // This is a local-only event, create it in the database using retry logic
      try {
        await executeWithRetry(async () => {
          const client = getSupabaseClient();
          const response = await client
            .from("calendar_events")
            .insert([{ ...payload, user_id: user.id }])
            .select()
            .single();

          const result = handleSupabaseResponse(response, 'Calendar Event Insert', true);

          if (!result.success && result.shouldRetry) {
            throw new Error('Retryable error occurred');
          }

          if (!result.success) {
            throw new Error(`Insert failed: ${response.error?.message}`);
          }

          return result;
        }, 'Insert Calendar Event', 2);

        // If we get here, the operation succeeded
        console.log('✅ Local event saved to database successfully');
        toast.success("Event saved.");
        if (reloadEvents) await reloadEvents();
      } catch (error) {
        console.error('❌ Failed to save local event to database after retries:', error);
        toast.error("Failed to save event.");
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
    const startDateTime = new Date(data.date);
    const [startHour, startMinute] = data.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute, 0);

    const endDateTime = new Date(data.date);
    const [endHour, endMinute] = data.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMinute, 0);

    const payload = {
      title: data.title,
      description: data.description || "",
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      all_day: false,
      event_type: data.type,
      location_name: data.location || "",
      reminder_minutes: [15],
      color: "#3b82f6",
      is_private: true,
      user_id: user.id,
    };

    // Use retry logic for the insert operation
    try {
      const result = await executeWithRetry(async () => {
        const client = getSupabaseClient();
        const response = await client
          .from("calendar_events")
          .insert([payload])
          .select()
          .single();

        const handledResult = handleSupabaseResponse(response, 'Calendar Event Create', true);

        if (!handledResult.success && handledResult.shouldRetry) {
          throw new Error('Retryable error occurred');
        }

        if (!handledResult.success) {
          throw new Error(`Create failed: ${response.error?.message}`);
        }

        return response.data;
      }, 'Create Calendar Event', 2);

      // If we get here, the operation succeeded
      console.log('✅ Event created successfully');
      toast.success("Event saved successfully!");

      // Handle HTML response case (result is null but operation likely succeeded)
      if (result === null) {
        console.log('🟡 HTML response - reloading events from database to get created event');
        // Remove temporary event and reload from database
        setEvents((prev) => prev.filter(e => e.id !== tempId));
        if (reloadEvents) await reloadEvents();
      } else {
        // Normal JSON response - process the returned event data
        const savedEvent = convertDbEventToLocal(result);
        setEvents((prev) => {
          const filteredEvents = prev.filter(e => e.id !== tempId);
          return [...filteredEvents, savedEvent];
        });
        if (reloadEvents) await reloadEvents();
      }
    } catch (error) {
      console.error('❌ Failed to create event after retries:', error);
      toast.error(`Failed to save event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Remove the temporary event on failure
      setEvents((prev) => prev.filter(e => e.id !== tempId));
    }
  }

  setIsEventModalOpen(false);
};

// Handle event deletion
export const handleEventDelete = async (
  eventId: string,
  supabase: any,
  setEvents: (updateFn: (prevEvents: CalendarEvent[]) => CalendarEvent[]) => void,
  setIsEventModalOpen: (open: boolean) => void,
  setEditingEventId: (id: string | null) => void
) => {
  try {
    // Get authenticated user (required for RLS)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      toast.error("Not signed in – cannot delete event.");
      return;
    }

    console.log('🔍 Delete attempt:', {
      eventId,
      userId: user.id,
      userEmail: user.email
    });

    // Use retry logic for the delete operation
    await executeWithRetry(async () => {
      const response = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      const result = handleSupabaseResponse(response, 'Calendar Event Delete', true);

      if (!result.success && result.shouldRetry) {
        throw new Error('Retryable error occurred');
      }

      if (!result.success) {
        throw new Error(`Delete failed: ${response.error?.message}`);
      }

      return result;
    }, 'Delete Calendar Event', 2);

    // If we get here, the operation succeeded
    console.log('✅ Event deleted successfully');
    toast.success("Event deleted successfully!");

    // Remove the event from local state
    setEvents((prevEvents: CalendarEvent[]) =>
      prevEvents.filter(event => event.id !== eventId)
    );

    // Close the modal and clear editing state
    setIsEventModalOpen(false);
    setEditingEventId(null);
  } catch (error) {
    console.error('❌ Failed to delete event after retries:', error);
    toast.error("Failed to delete event. Please try again.");
  }
};
