import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarEvent } from "@/components/you/types";
import { useToast } from "@/hooks/use-toast";

export interface DatabaseCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  type: string | null;
  location: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Convert database event to CalendarEvent format
  const convertToCalendarEvent = (dbEvent: DatabaseCalendarEvent): CalendarEvent => {
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
      type: dbEvent.type || "reminder",
      location: dbEvent.location || undefined,
    };
  };

  // Load events from database
  const loadEvents = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error loading calendar events:", error);
        toast({
          title: "Error",
          description: "Failed to load calendar events",
          variant: "destructive",
        });
      } else if (data) {
        const calendarEvents = data.map(convertToCalendarEvent);
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error("Unexpected error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    loadEvents();

    // Subscribe to changes
    const channel = supabase
      .channel("calendar_events_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
        },
        (payload) => {
          console.log("Calendar event change:", payload);
          // Reload events when changes occur
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, setEvents, loading, reloadEvents: loadEvents };
};