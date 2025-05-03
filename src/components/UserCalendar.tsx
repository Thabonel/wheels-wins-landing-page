
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

const UserCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Mock events for visual layout
  const events = [
    { date: new Date(2025, 4, 5), title: "Trip to Uluru", type: "trip" },
    { date: new Date(2025, 4, 8), title: "Hotel Booking: Alice Springs", type: "booking" },
    { date: new Date(2025, 4, 10), title: "Remember to check tire pressure", type: "reminder" }
  ];
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">Your Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-2 bg-white">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="mx-auto p-3"
            modifiersClassNames={{
              selected: "bg-accent text-accent-foreground",
            }}
            modifiers={{
              trip: events.filter(event => event.type === "trip").map(e => e.date),
              booking: events.filter(event => event.type === "booking").map(e => e.date),
              reminder: events.filter(event => event.type === "reminder").map(e => e.date),
            }}
          />
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <div className="space-y-2">
            {events.map((event, i) => (
              <div 
                key={i} 
                className={`p-2 rounded-md ${
                  event.type === 'trip' ? 'bg-blue-100' : 
                  event.type === 'booking' ? 'bg-green-100' : 'bg-yellow-100'
                }`}
              >
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-gray-600">
                  {event.date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCalendar;
