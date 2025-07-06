import { toast } from "sonner";
import { CalendarEvent } from "./types";
import { formatEventTime } from "./EventFormatter";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const handleEventMove = (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
  const idParts = eventId.split("-");
  const eventIndex = parseInt(idParts[idParts.length - 1], 10);
  if (!isNaN(eventIndex) && events[eventIndex]) {
    const updatedEvents = [...events];
    const event = { ...updatedEvents[eventIndex] };
    event.date = new Date(newStart);
    event.startTime = format(newStart, "HH:mm");
    event.endTime = format(newEnd, "HH:mm");
    event.time = formatEventTime(event.startTime, event.endTime);
    updatedEvents[eventIndex] = event;
    setEvents(updatedEvents);
    toast(`Event moved: ${event.title} has been moved to ${format(event.date, "MMMM d")} at ${event.time}.`);
  }
};

export const handleEventResize = (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  events: CalendarEvent[],
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
) => {
  const idParts = eventId.split("-");
  const eventIndex = parseInt(idParts[idParts.length - 1], 10);
  if (!isNaN(eventIndex) && events[eventIndex]) {
    const updatedEvents = [...events];
    const event = { ...updatedEvents[eventIndex] };
    event.startTime = format(newStart, "HH:mm");
    event.endTime = format(newEnd, "HH:mm");
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
  _end: Date,
  setEventStartTime: React.Dispatch<React.SetStateAction<Date>>,
  setEventEndTime: React.Dispatch<React.SetStateAction<Date>>,
  setNewEventDate: React.Dispatch<React.SetStateAction<Date>>,
  setNewEventHour: React.Dispatch<React.SetStateAction<number>>,
  setEditingEventId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const defaultEnd = new Date(start.getTime() + 15 * 60 * 1000);
  setEventStartTime(start);
  setEventEndTime(defaultEnd);
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
  setIsEventModalOpen: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
  if (editingEventId) {
    const idParts = editingEventId.split("-");
    const eventIndex = parseInt(idParts[idParts.length - 1], 10);
    if (!isNaN(eventIndex) && events[eventIndex]) {
      const updatedEvents = [...events];
      const updatedEvent: CalendarEvent = {
        ...updatedEvents[eventIndex],
        title: data.title,
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        time: formatEventTime(data.startTime, data.endTime),
      };
      updatedEvents[eventIndex] = updatedEvent;
      setEvents(updatedEvents);
      toast(`Event updated: ${data.title} has been updated.`);
    }
  } else {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Not signed in – cannot save event.");
      setIsEventModalOpen(false);
      return;
    }

    const newEvent: CalendarEvent = {
      date: data.date,
      title: data.title,
      type: data.type,
      time: formatEventTime(data.startTime, data.endTime),
      startTime: data.startTime,
      endTime: data.endTime,
    };

    setEvents((prev) => [...prev, newEvent]);
    toast(`Event created: ${data.title} has been added to your calendar.`);

    const payload = {
      title: newEvent.title,
      description: "",
      date: newEvent.date.toISOString().split("T")[0],
      time: `${newEvent.startTime}:00`, // time without time zone format
      start_time: `${newEvent.startTime}:00`, // time without time zone format
      end_time: `${newEvent.endTime}:00`, // time without time zone format
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      type: newEvent.type,
      user_id: user.id, // user_id is text type, so UUID will be auto-converted
      location: "",
    };

    const { error } = await supabase
      .from("calendar_events")
      .insert([payload]);

    if (error) {
      console.error("Database insert error:", error);
      toast.error("Failed to save event.");
    } else {
      toast.success("Event saved to database.");
    }
  }

  setIsEventModalOpen(false);
};
