
import React from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { CalendarViewProps } from "./types";
import { daysOfWeek, generateCalendarDays, getEventsForDay } from "./utils";

const MonthView: React.FC<CalendarViewProps> = ({ currentDate, events, onAddEvent }) => {
  const calendarDays = generateCalendarDays(currentDate);
  const today = new Date();

  return (
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
          const dayEvents = getEventsForDay(day, events);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          
          return (
            <div 
              key={i} 
              className={`min-h-[120px] border-r border-b last:border-r-0 p-1 ${
                isCurrentMonth ? "bg-white hover:bg-gray-50 cursor-pointer" : "bg-gray-50 text-gray-400"
              }`}
              onClick={() => isCurrentMonth && onAddEvent && onAddEvent(day, 9)} // Default to 9 AM for month view clicks
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
                    onClick={(e) => e.stopPropagation()}
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
};

export default MonthView;
