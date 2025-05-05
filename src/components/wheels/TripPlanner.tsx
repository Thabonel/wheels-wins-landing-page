import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Card, CardContent } from "@/components/ui/card";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function TripPlanner() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [suggestions, setSuggestions] = useState([
    {
      id: 1,
      name: "Yellowstone National Park",
      description: "Famous for its wildlife and geothermal features",
      link: "https://www.nps.gov/yell/",
      type: "park",
      coords: [-110.5885, 44.4280]
    },
    {
      id: 2,
      name: "Grand Canyon National Park",
      description: "Natural wonder with breathtaking views",
      link: "https://www.nps.gov/grca/",
      type: "park",
      coords: [-112.1401, 36.0544]
    },
    {
      id: 3,
      name: "Yosemite National Park",
      description: "Known for its waterfalls and giant sequoias",
      link: "https://www.nps.gov/yose/",
      type: "park",
      coords: [-119.5383, 37.8651]
    }
  ]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 3.5
    });

    // Add markers
    suggestions.forEach((item) => {
      new mapboxgl.Marker()
        .setLngLat(item.coords)
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${item.name}</h3><p>${item.description}</p>`))
        .addTo(map.current!);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Map */}
      <div ref={mapContainer} className="rounded-lg border h-[400px]" />

      {/* Suggestions */}
      <div>
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
