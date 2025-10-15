import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarEvent } from "@/components/you/types";
import { useToast } from "@/hooks/use-toast";

export interface DatabaseCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;  // ⚠️ Changed from 'date' to match actual DB schema
  end_date: string;    // ⚠️ Changed from 'time' to match actual DB schema
  all_day: boolean;
  event_type: string | null;
  location_name: string | null;
  reminder_minutes: number[] | null;
  color: string | null;
  is_private: boolean;
  timezone: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export const useCalendarEvents = () => {
  console.log("🔵 useCalendarEvents hook called");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Convert database event to CalendarEvent format
  const convertToCalendarEvent = (dbEvent: DatabaseCalendarEvent): CalendarEvent => {
    const eventDate = new Date(dbEvent.start_date);
    const endDate = new Date(dbEvent.end_date);

    // Extract time in HH:MM format (using local timezone display)
    const formatTime = (date: Date): string => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const startTime = formatTime(eventDate);
    const endTime = formatTime(endDate);

    // Map event_type to valid CalendarEvent types
    // Database allows 'personal' as default, but UI only supports specific types
    const validTypes = ["reminder", "trip", "booking", "maintenance", "inspection"] as const;
    let eventType: typeof validTypes[number] = "reminder"; // default

    if (dbEvent.event_type && validTypes.includes(dbEvent.event_type as any)) {
      eventType = dbEvent.event_type as typeof validTypes[number];
    }
    // If event_type is 'personal' or any other value, it maps to 'reminder'

    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description || undefined,
      date: eventDate,
      time: startTime,
      startTime,
      endTime,
      type: eventType,
      location: dbEvent.location_name || undefined,
    };
  };

  // Load events from database
  const loadEvents = async () => {
    console.log("🟡 loadEvents() called - checking auth");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("🟡 Auth result:", { hasUser: !!user, hasError: !!userError, userId: user?.id });

      if (userError) {
        console.error("❌ Auth error:", userError);
        setLoading(false);
        return;
      }

      if (!user) {
        console.log("⚠️ User not authenticated");
        setLoading(false);
        return;
      }

      console.log("✅ Loading events for user:", user.id);

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Error loading calendar events:", error);
        toast({
          title: "Error Loading Events",
          description: `Failed to load calendar events: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Loaded events from database:", data?.length || 0);
        const calendarEvents = data ? data.map(convertToCalendarEvent) : [];
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error("Unexpected error loading events:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while loading events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    console.log("🟢 useEffect running - about to load events");
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