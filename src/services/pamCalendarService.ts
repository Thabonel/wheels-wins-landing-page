/**
 * PAM Calendar Integration Service
 * Allows PAM to directly create calendar events in the user's calendar
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parse, format, addDays } from "date-fns";

export interface PamCalendarEvent {
  title: string;
  description?: string;
  date: string; // "tomorrow", "next Monday", "2025-01-15", etc.
  time?: string; // "12:00 PM", "2:30 PM", "noon", etc.
  duration?: string; // "1 hour", "30 minutes", etc.
  location?: string;
  reminderMinutes?: number; // 5, 15, 30, etc.
  type?: "reminder" | "trip" | "booking" | "maintenance" | "inspection";
}

export interface ParsedCalendarEvent {
  title: string;
  description?: string;
  date: Date;
  startTime: string; // "12:00"
  endTime: string; // "13:00"
  location?: string;
  type: "reminder" | "trip" | "booking" | "maintenance" | "inspection";
}

class PamCalendarService {
  /**
   * Parse natural language date into a Date object
   */
  private parseDate(dateStr: string): Date {
    const today = new Date();
    const lowerDate = dateStr.toLowerCase().trim();

    // Handle relative dates
    if (lowerDate === "today") {
      return today;
    }
    
    if (lowerDate === "tomorrow") {
      return addDays(today, 1);
    }

    // Handle "next Monday", "next week", etc.
    if (lowerDate.startsWith("next ")) {
      const dayName = lowerDate.replace("next ", "");
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDay = days.indexOf(dayName);
      
      if (targetDay !== -1) {
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // Next occurrence
        return addDays(today, daysUntilTarget);
      }
    }

    // Handle day names (assume next occurrence)
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayIndex = days.indexOf(lowerDate);
    if (dayIndex !== -1) {
      const currentDay = today.getDay();
      const daysUntil = dayIndex === currentDay ? 7 : (dayIndex - currentDay + 7) % 7;
      return addDays(today, daysUntil || 7);
    }

    // Try to parse as ISO date or other standard formats
    try {
      return new Date(dateStr);
    } catch {
      // Default to tomorrow if parsing fails
      return addDays(today, 1);
    }
  }

  /**
   * Parse natural language time into 24-hour format
   */
  private parseTime(timeStr: string): { startTime: string; endTime: string } {
    const lowerTime = timeStr.toLowerCase().trim();
    
    // Handle special cases
    if (lowerTime === "noon" || lowerTime === "12 noon") {
      return { startTime: "12:00", endTime: "13:00" };
    }
    
    if (lowerTime === "midnight") {
      return { startTime: "00:00", endTime: "01:00" };
    }

    // Handle AM/PM format
    if (lowerTime.includes("am") || lowerTime.includes("pm")) {
      try {
        // Try different parsing formats
        let parsed: Date | null = null;
        
        // Try "12:00 PM" format
        if (lowerTime.includes(":")) {
          parsed = parse(lowerTime, "h:mm a", new Date());
        } else {
          // Try "12 PM" format
          parsed = parse(lowerTime, "h a", new Date());
        }
        
        if (parsed && !isNaN(parsed.getTime())) {
          const startTime = format(parsed, "HH:mm");
          const endHour = parsed.getHours() + 1;
          const endDate = new Date(parsed);
          endDate.setHours(endHour > 23 ? 0 : endHour);
          const endTime = format(endDate, "HH:mm");
          return { startTime, endTime };
        }
      } catch (error) {
        console.warn('Time parsing error:', error);
      }
    }

    // Handle 24-hour format
    if (lowerTime.includes(":")) {
      const [hours, minutes] = lowerTime.split(":").map(s => parseInt(s.replace(/\D/g, "")));
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const startTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        const endHour = hours + 1 > 23 ? 0 : hours + 1;
        const endTime = `${endHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        return { startTime, endTime };
      }
    }

    // Default to morning appointment
    return { startTime: "09:00", endTime: "10:00" };
  }

  /**
   * Parse duration and adjust end time
   */
  private adjustEndTime(startTime: string, duration: string): string {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const lowerDuration = duration.toLowerCase();
    let durationMinutes = 60; // Default 1 hour

    if (lowerDuration.includes("hour")) {
      const hourMatch = lowerDuration.match(/(\d+)\s*hour/);
      if (hourMatch) {
        durationMinutes = parseInt(hourMatch[1]) * 60;
      }
    } else if (lowerDuration.includes("minute")) {
      const minuteMatch = lowerDuration.match(/(\d+)\s*minute/);
      if (minuteMatch) {
        durationMinutes = parseInt(minuteMatch[1]);
      }
    }

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return format(endDate, "HH:mm");
  }

  /**
   * Parse PAM calendar event into structured format
   */
  public parseCalendarEvent(pamEvent: PamCalendarEvent): ParsedCalendarEvent {
    const date = this.parseDate(pamEvent.date);
    const { startTime, endTime: defaultEndTime } = this.parseTime(pamEvent.time || "12:00 PM");
    
    // Adjust end time based on duration if provided
    const endTime = pamEvent.duration 
      ? this.adjustEndTime(startTime, pamEvent.duration)
      : defaultEndTime;

    return {
      title: pamEvent.title,
      description: pamEvent.description,
      date,
      startTime,
      endTime,
      location: pamEvent.location,
      type: pamEvent.type || "reminder"
    };
  }

  /**
   * Create a calendar event in the database
   */
  public async createCalendarEvent(pamEvent: PamCalendarEvent): Promise<{ success: boolean; message: string; eventId?: string }> {
    console.log('🔧 PAM Calendar Service: Creating event:', pamEvent);
    
    try {
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔧 Auth check:', { user: !!user, error: userError });
      
      if (userError || !user) {
        return { success: false, message: "User not authenticated" };
      }

      // Parse the event
      const parsedEvent = this.parseCalendarEvent(pamEvent);
      console.log('🔧 Parsed event:', parsedEvent);

      // Prepare database payload
      const payload = {
        title: parsedEvent.title,
        description: parsedEvent.description || "",
        date: parsedEvent.date.toISOString().split("T")[0],
        time: `${parsedEvent.startTime}:00`,
        start_time: `${parsedEvent.startTime}:00`,
        end_time: `${parsedEvent.endTime}:00`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        type: parsedEvent.type,
        user_id: user.id,
        location: parsedEvent.location || "",
      };
      
      console.log('🔧 Database payload:', payload);

      // Insert into database
      const { data: insertedEvent, error } = await supabase
        .from("calendar_events")
        .insert([payload])
        .select()
        .single();

      console.log('🔧 Database insert result:', { data: insertedEvent, error });

      if (error) {
        console.error("❌ Database insert error:", error);
        return { success: false, message: `Failed to create calendar event: ${error.message}` };
      }

      // Show success notification
      const eventDate = format(parsedEvent.date, "MMMM d");
      const eventTime = `${parsedEvent.startTime} - ${parsedEvent.endTime}`;
      toast.success(`📅 Calendar event created: "${parsedEvent.title}" on ${eventDate} at ${eventTime}`);

      // Set reminder if specified
      if (pamEvent.reminderMinutes) {
        this.scheduleReminder(parsedEvent, pamEvent.reminderMinutes);
      }

      console.log('✅ Calendar event created successfully:', insertedEvent);
      return { 
        success: true, 
        message: `Successfully created calendar event "${parsedEvent.title}" for ${eventDate} at ${eventTime}`,
        eventId: insertedEvent.id
      };

    } catch (error) {
      console.error("❌ Error creating calendar event:", error);
      return { success: false, message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Schedule a browser notification reminder (if permissions allow)
   */
  private scheduleReminder(event: ParsedCalendarEvent, minutesBefore: number) {
    if ("Notification" in window) {
      const reminderTime = new Date(event.date);
      const [hours, minutes] = event.startTime.split(":").map(Number);
      reminderTime.setHours(hours, minutes - minutesBefore, 0, 0);

      const now = new Date();
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      if (timeUntilReminder > 0) {
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification(`Upcoming: ${event.title}`, {
              body: `Starting in ${minutesBefore} minutes`,
              icon: "/favicon.ico"
            });
          }
        }, timeUntilReminder);
      }
    }
  }

  /**
   * Extract calendar event from PAM conversation text
   */
  public extractEventFromText(text: string): PamCalendarEvent | null {
    const lowerText = text.toLowerCase();

    // Look for calendar-related keywords
    const calendarKeywords = ["add", "create", "schedule", "appointment", "meeting", "remind", "calendar"];
    const hasCalendarKeyword = calendarKeywords.some(keyword => lowerText.includes(keyword));
    
    if (!hasCalendarKeyword) {
      return null;
    }

    // Extract title (everything before time/date indicators)
    let title = text.trim();
    
    // Common patterns for extracting event details
    const timePattern = /\b(at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?|\d{1,2}(?::\d{2})?|noon|midnight)\b/i;
    const datePattern = /\b(today|tomorrow|next\s+\w+|\w+day|in\s+\d+\s+days?|\d{4}-\d{2}-\d{2})\b/i;

    const timeMatch = text.match(timePattern);
    const dateMatch = text.match(datePattern);

    // Extract title by removing time and date parts
    if (timeMatch) {
      title = title.replace(timeMatch[0], "").trim();
    }
    if (dateMatch) {
      title = title.replace(dateMatch[0], "").trim();
    }

    // Clean up title
    title = title.replace(/^(add|create|schedule|appointment with?|meeting with?|remind me|calendar)/i, "").trim();
    title = title.replace(/\b(for|on|at)\s*$/i, "").trim();

    return {
      title: title || "New Appointment",
      date: dateMatch?.[1] || "tomorrow",
      time: timeMatch?.[2] || "12:00 PM",
      type: "reminder"
    };
  }
}

// Export singleton instance
export const pamCalendarService = new PamCalendarService();

// Global function to make it accessible from PAM
(window as any).createPamCalendarEvent = async (eventData: PamCalendarEvent) => {
  return await pamCalendarService.createCalendarEvent(eventData);
};