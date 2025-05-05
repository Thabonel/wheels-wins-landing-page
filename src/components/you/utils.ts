
import { 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  addDays,
  startOfDay, 
  addHours,
  format
} from "date-fns";
import { CalendarEvent } from "./types";

// Generate calendar days for month view
export const generateCalendarDays = (currentDate: Date) => {
  // Get the start of the current month
  const monthStart = startOfMonth(currentDate);
  
  // Get the end of the current month
  const monthEnd = endOfMonth(currentDate);
  
  // Get the start of the first week (might be in the previous month)
  const startDate = startOfWeek(monthStart);
  
  // Get the end of the last week (might be in the next month)
  const endDate = endOfWeek(monthEnd);
  
  // Generate all days in the interval
  return eachDayOfInterval({ start: startDate, end: endDate });
};

// Generate week days
export const generateWeekDays = (currentDate: Date) => {
  const weekStart = startOfWeek(currentDate);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

// Get events for a specific day
export const getEventsForDay = (day: Date, events: CalendarEvent[]) => {
  return events.filter(event => 
    isSameDay(event.date, day)
  );
};

// Get events for a specific hour on a specific day
export const getEventsForHourSlot = (day: Date, hour: number, events: CalendarEvent[]) => {
  return events.filter(event => {
    const eventStartHour = parseInt(event.startTime.split(':')[0]);
    return isSameDay(event.date, day) && eventStartHour === hour;
  });
};

// Format time for display
export const formatTimeDisplay = (hour: number) => {
  return hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};

// Format time from hour/minute to HH:MM format
export const formatTimeToString = (hour: number, minute: number = 0) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm

