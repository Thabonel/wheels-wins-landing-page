
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CalendarNavigation from "./CalendarNavigation";
import FullCalendarWrapper from "./FullCalendarWrapper";

interface CalendarContainerProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  events: any[];
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: "month" | "week" | "day") => void;
  onEventSelect: (eventId: string) => void;
  onEventCreate: (start: Date, end: Date) => void;
  onEventMove: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize: (eventId: string, newStart: Date, newEnd: Date) => void;
}

const CalendarContainer: React.FC<CalendarContainerProps> = ({
  currentDate,
  viewMode,
  events,
  setCurrentDate,
  setViewMode,
  onEventSelect,
  onEventCreate,
  onEventMove,
  onEventResize
}) => {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CalendarNavigation 
          currentDate={currentDate}
          viewMode={viewMode}
          setCurrentDate={setCurrentDate}
          setViewMode={setViewMode}
        />
      </CardHeader>
      <CardContent>
        <div className="fullcalendar-container">
          <FullCalendarWrapper
            currentDate={currentDate}
            events={events}
            viewMode={viewMode}
            onEventSelect={onEventSelect}
            onEventCreate={onEventCreate}
            onEventMove={onEventMove}
            onEventResize={onEventResize}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarContainer;
