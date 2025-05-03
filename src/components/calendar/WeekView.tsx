
import React from "react";
import { format, isSameDay } from "date-fns";
import { CalendarViewProps } from "./types";
import { daysOfWeek, generateWeekDays, getEventsForHourSlot, timeSlots } from "./utils";

const WeekView: React.FC<CalendarViewProps> = ({ currentDate, events }) => {
  const weekDays = generateWeekDays(currentDate);
  const today = new Date();

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Days of week header */}
      <div className="grid grid-cols-8 border-b text-center font-semibold bg-muted">
        <div className="p-2 text-sm border-r"></div>
        {weekDays.map((day, i) => (
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
            {weekDays.map((day, dayIndex) => {
              const hourEvents = getEventsForHourSlot(day, hour, events);
              
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
};

export default WeekView;
