
import React from "react";
import { format, getMonth, getYear, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarNavigationProps } from "./types";

const CalendarNavigation: React.FC<CalendarNavigationProps> = ({ 
  currentDate, 
  viewMode, 
  setCurrentDate, 
  setViewMode 
}) => {
  const today = new Date();

  // Navigation functions
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
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

  return (
    <>
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
      
      <h3 className="text-2xl text-center mt-2">
        {viewMode === "month" 
          ? format(currentDate, "MMMM yyyy") 
          : `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
      </h3>
    </>
  );
};

export default CalendarNavigation;
