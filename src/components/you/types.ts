
import { ReactNode } from "react";

export interface CalendarEvent {
  id?: string;
  date: Date;
  title: string;
  type: "trip" | "booking" | "reminder" | "maintenance" | "inspection";
  time: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}

export interface CalendarNavigationProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: "month" | "week" | "day") => void;
}

export interface CalendarViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onAddEvent?: (date: Date, hour: number) => void;
}

export interface EventFormData {
  title: string;
  type: "trip" | "booking" | "reminder" | "maintenance" | "inspection";
  date: Date;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}
