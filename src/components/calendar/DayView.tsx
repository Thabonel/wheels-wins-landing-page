
import React from "react";
import { format, isSameDay } from "date-fns";
import { CalendarViewProps } from "./types";
import { timeSlots, getEventsForHourSlot, formatTimeDisplay } from "./utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarPlus } from "lucide-react";

const DayView: React.FC<CalendarViewProps> = ({ currentDate, events, onAddEvent }) => {
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Day header */}
      <div className="border-b text-center font-semibold bg-muted p-2">
        <div className="text-lg">{format(currentDate, "EEEE")}</div>
        <div className={`font-bold text-xl ${isToday ? "text-primary" : ""}`}>
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      </div>
      
      {/* Time slots */}
      <div className="grid grid-cols-1">
        {timeSlots.map((hour) => {
          const hourEvents = getEventsForHourSlot(currentDate, hour, events);
          
          return (
            <div 
              key={hour}
              className="border-b last:border-b-0 grid grid-cols-[80px_1fr]"
            >
              {/* Time label */}
              <div className="border-r p-1 text-right pr-2 text-sm font-medium py-2">
                {formatTimeDisplay(hour)}
              </div>
              
              {/* Hour slot */}
              <div 
                className="p-1 min-h-[60px] relative hover:bg-gray-50 cursor-pointer group"
                onClick={() => onAddEvent && onAddEvent(currentDate, hour)}
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                </div>
                
                {hourEvents.map((event, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div 
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs">{format(currentDate, "EEEE, MMMM d")} - {event.time}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
