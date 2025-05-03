
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
  viewMode: "month" | "week";
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: "month" | "week") => void;
}

export interface CalendarViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}
