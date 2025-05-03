
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import MonthView from "./calendar/MonthView";
import WeekView from "./calendar/WeekView";
import CalendarNavigation from "./calendar/CalendarNavigation";
import { CalendarEvent } from "./calendar/types";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Mock events for visual layout
  const events: CalendarEvent[] = [
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip", time: "9:00 AM", startTime: "09:00", endTime: "11:00" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking", time: "All day", startTime: "00:00", endTime: "23:59" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder", time: "3:00 PM", startTime: "15:00", endTime: "15:30" },
    { date: new Date(2025, 4, 15), title: "Car service", type: "booking", time: "2:30 PM", startTime: "14:30", endTime: "16:00" },
    { date: new Date(2025, 4, 20), title: "Road trip planning", type: "trip", time: "7:00 PM", startTime: "19:00", endTime: "20:30" },
    { date: new Date(2025, 4, 22), title: "Camping gear check", type: "reminder", time: "10:00 AM", startTime: "10:00", endTime: "11:00" },
    { date: new Date(2025, 4, 5), title: "Fuel top-up", type: "reminder", time: "12:30 PM", startTime: "12:30", endTime: "13:00" }
  ];

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
        {viewMode === "month" ? (
          <MonthView currentDate={currentDate} events={events} />
        ) : (
          <WeekView currentDate={currentDate} events={events} />
        )}
      </CardContent>
    </Card>
  );
};

export default UserCalendar;
