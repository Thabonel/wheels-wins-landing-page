
import { ReactNode } from "react";

export interface CalendarEvent {
  date: Date;
  title: string;
  type: "trip" | "booking" | "reminder";
  time: string;
  startTime: string;
  endTime: string;
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
  type: "trip" | "booking" | "reminder";
  date: Date;
  startTime: string;
  endTime: string;
}

