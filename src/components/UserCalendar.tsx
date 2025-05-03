
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MonthView from "./calendar/MonthView";
import WeekView from "./calendar/WeekView";
import DayView from "./calendar/DayView";
import CalendarNavigation from "./calendar/CalendarNavigation";
import EventForm from "./calendar/EventForm";
import { CalendarEvent, EventFormData } from "./calendar/types";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip", time: "9:00 AM", startTime: "09:00", endTime: "11:00" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking", time: "All day", startTime: "00:00", endTime: "23:59" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder", time: "3:00 PM", startTime: "15:00", endTime: "15:30" },
    { date: new Date(2025, 4, 15), title: "Car service", type: "booking", time: "2:30 PM", startTime: "14:30", endTime: "16:00" },
    { date: new Date(2025, 4, 20), title: "Road trip planning", type: "trip", time: "7:00 PM", startTime: "19:00", endTime: "20:30" },
    { date: new Date(2025, 4, 22), title: "Camping gear check", type: "reminder", time: "10:00 AM", startTime: "10:00", endTime: "11:00" },
    { date: new Date(2025, 4, 5), title: "Fuel top-up", type: "reminder", time: "12:30 PM", startTime: "12:30", endTime: "13:00" }
  ]);

  const { toast } = useToast();
  
  // Event creation modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());
  const [newEventHour, setNewEventHour] = useState<number>(9);

  const handleAddEvent = (date: Date, hour: number) => {
    setNewEventDate(date);
    setNewEventHour(hour);
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = (data: EventFormData) => {
    // Create new event with form data
    const newEvent: CalendarEvent = {
      date: data.date,
      title: data.title,
      type: data.type,
      time: formatEventTime(data.startTime, data.endTime),
      startTime: data.startTime,
      endTime: data.endTime
    };

    // Add event to the list
    setEvents(prev => [...prev, newEvent]);
    setIsEventModalOpen(false);
    
    // Show success toast
    toast({
      title: "Event created",
      description: `${data.title} has been added to your calendar.`
    });
  };

  const formatEventTime = (start: string, end: string) => {
    const startHour = parseInt(start.split(':')[0]);
    const startDisplay = startHour === 0 && end === "23:59" ? "All day" :
                         startHour === 12 ? "12 PM" : 
                         startHour > 12 ? `${startHour - 12}:${start.split(':')[1]} PM` : 
                         `${startHour}:${start.split(':')[1]} AM`;
    return startDisplay;
  };

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
          <MonthView currentDate={currentDate} events={events} onAddEvent={handleAddEvent} />
        ) : viewMode === "week" ? (
          <WeekView currentDate={currentDate} events={events} onAddEvent={handleAddEvent} />
        ) : (
          <DayView currentDate={currentDate} events={events} onAddEvent={handleAddEvent} />
        )}
      </CardContent>

      {/* Event Creation Dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <EventForm 
            defaultDate={newEventDate}
            defaultHour={newEventHour}
            onSubmit={handleEventSubmit}
            onCancel={() => setIsEventModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserCalendar;
