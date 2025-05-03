
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  addMonths, 
  format, 
  getMonth, 
  getYear, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay,
  addWeeks,
  subWeeks,
  startOfDay,
  addHours,
  isBefore,
  isAfter,
  isSameHour,
  parseISO,
  addDays
} from "date-fns";

const UserCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const today = new Date();
  
  // Mock events for visual layout
  const events = [
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip", time: "9:00 AM", startTime: "09:00", endTime: "11:00" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking", time: "All day", startTime: "00:00", endTime: "23:59" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder", time: "3:00 PM", startTime: "15:00", endTime: "15:30" },
    { date: new Date(2025, 4, 15), title: "Car service", type: "booking", time: "2:30 PM", startTime: "14:30", endTime: "16:00" },
    { date: new Date(2025, 4, 20), title: "Road trip planning", type: "trip", time: "7:00 PM", startTime: "19:00", endTime: "20:30" },
    { date: new Date(2025, 4, 22), title: "Camping gear check", type: "reminder", time: "10:00 AM", startTime: "10:00", endTime: "11:00" },
    { date: new Date(2025, 4, 5), title: "Fuel top-up", type: "reminder", time: "12:30 PM", startTime: "12:30", endTime: "13:00" }
  ];

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToPrevious = () => {
    if (viewMode === "month") {
      goToPreviousMonth();
    } else {
      goToPreviousWeek();
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      goToNextMonth();
    } else {
      goToNextWeek();
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days for month view
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

  // Generate week days
  const generateWeekDays = () => {
    const weekStart = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarDays = viewMode === "month" ? generateCalendarDays() : generateWeekDays();
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
  
  // Find events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(event.date, day)
    );
  };

  // Find events for a specific hour on a specific day
  const getEventsForHourSlot = (day: Date, hour: number) => {
    const startHour = addHours(startOfDay(day), hour);
    const endHour = addHours(startHour, 1);
    
    return events.filter(event => {
      const eventStartHour = parseInt(event.startTime.split(':')[0]);
      return isSameDay(event.date, day) && eventStartHour === hour;
    });
  };

  const renderMonthView = () => (
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
  );

  const renderWeekView = () => (
    <div className="border rounded-md overflow-hidden">
      {/* Days of week header */}
      <div className="grid grid-cols-8 border-b text-center font-semibold bg-muted">
        <div className="p-2 text-sm border-r"></div>
        {generateWeekDays().map((day, i) => (
          <div 
            key={i} 
            className="p-2 text-sm border-r last:border-r-0"
          >
            <div>{daysOfWeek[i]}</div>
            <div className={`font-bold text-lg ${isSameDay(day, today) ? "text-primary" : ""}`}>{format(day, "d")}</div>
          </div>
        ))}
      </div>
      
      {/* Time slots */}
      <div className="grid grid-cols-8">
        {timeSlots.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="border-r border-b p-1 text-right pr-2 text-sm font-medium">
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            
            {/* Day columns */}
            {generateWeekDays().map((day, dayIndex) => {
              const hourEvents = getEventsForHourSlot(day, hour);
              
              return (
                <div 
                  key={`${day}-${hour}`}
                  className="border-r border-b last:border-r-0 p-1 min-h-[60px]"
                >
                  {hourEvents.map((event, idx) => (
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
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
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
              
              {/* View toggle */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as "month" | "week")}
                className="ml-4"
              >
                <ToggleGroupItem value="month" aria-label="Month view">Month View</ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="Week view">Week View</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-2xl text-center mt-2">
          {viewMode === "month" 
            ? format(currentDate, "MMMM yyyy") 
            : `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {viewMode === "month" ? renderMonthView() : renderWeekView()}
      </CardContent>
    </Card>
  );
};

export default UserCalendar;
