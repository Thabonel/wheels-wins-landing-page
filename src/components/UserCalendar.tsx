
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, getMonth, getYear, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay } from "date-fns";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const today = new Date();
  
  // Mock events for visual layout
  const events = [
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip", time: "9:00 AM" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking", time: "All day" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder", time: "3:00 PM" },
    { date: new Date(2025, 4, 15), title: "Car service", type: "booking", time: "2:30 PM" },
    { date: new Date(2025, 4, 20), title: "Road trip planning", type: "trip", time: "7:00 PM" },
    { date: new Date(2025, 4, 22), title: "Camping gear check", type: "reminder", time: "10:00 AM" },
    { date: new Date(2025, 4, 5), title: "Fuel top-up", type: "reminder", time: "12:30 PM" }
  ];

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
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

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarDays = generateCalendarDays();
  
  // Find events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(event.date, day)
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="font-medium"
            >
              Today
            </Button>
            
            <div className="flex items-center">
              <Select
                value={format(currentDate, "MMMM")}
                onValueChange={(value) => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(value));
                  setCurrentDate(newDate);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={getYear(currentDate).toString()}
                onValueChange={(value) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(value));
                  setCurrentDate(newDate);
                }}
              >
                <SelectTrigger className="w-[100px] ml-2">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => getYear(today) - 5 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-2xl text-center mt-2">
          {format(currentDate, "MMMM yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="border rounded-md overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b text-center font-semibold bg-muted">
            {daysOfWeek.map((day, i) => (
              <div 
                key={i} 
                className="p-2 text-sm border-r last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              
              return (
                <div 
                  key={i} 
                  className={`min-h-[120px] border-r border-b last:border-r-0 p-1 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {/* Day number */}
                  <div className={`
                    text-right p-1 font-medium text-lg
                    ${isToday ? "rounded-full bg-primary w-8 h-8 flex items-center justify-center text-white ml-auto" : ""}
                  `}>
                    {format(day, "d")}
                  </div>
                  
                  {/* Events */}
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((event, idx) => (
                      <div 
                        key={idx} 
                        className={`
                          text-xs p-1 rounded truncate cursor-pointer
                          ${event.type === 'trip' ? 'bg-blue-100 text-blue-800' : 
                          event.type === 'booking' ? 'bg-green-100 text-green-800' : 
                          'bg-yellow-100 text-yellow-800'}
                        `}
                        title={`${event.title} - ${event.time}`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-[10px] opacity-80">{event.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCalendar;
