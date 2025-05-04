
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function TripPlanner() {
  const [suggestions, setSuggestions] = useState([
    {
      id: 1,
      name: "Yellowstone National Park",
      description: "Famous for its wildlife and geothermal features",
      link: "https://www.nps.gov/yell/",
      type: "park"
    },
    {
      id: 2,
      name: "Grand Canyon National Park",
      description: "Natural wonder with breathtaking views",
      link: "https://www.nps.gov/grca/",
      type: "park"
    },
    {
      id: 3,
      name: "Yosemite National Park",
      description: "Known for its waterfalls and giant sequoias",
      link: "https://www.nps.gov/yose/",
      type: "park"
    }
  ]);
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Trip Planner</h2>
      
      {/* Placeholder for MapBox map - will be implemented later */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 h-[400px] flex items-center justify-center">
        <p className="text-blue-500 font-medium">Map will be displayed here using Mapbox</p>
      </div>
      
      {/* Pam's suggestions */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Pam suggests:</h3>
        <p className="text-gray-600 mb-4">Which of these parks would you like to visit?</p>
        
        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-4">
            {suggestions.map((item) => (
              <Card key={item.id} className="min-w-[280px] cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <h4 className="font-bold">{item.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm mt-3 block hover:underline"
                  >
                    Visit Website
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
