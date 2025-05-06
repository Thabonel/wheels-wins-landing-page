import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { Card, CardContent } from "@/components/ui/card";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TripPlanner() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [suggestions] = useState([
    {
      id: 1,
      name: "Yellowstone National Park",
      description: "Famous for its wildlife and geothermal features",
      link: "https://www.nps.gov/yell/",
      coords: [-110.5885, 44.428],
    },
    {
      id: 2,
      name: "Grand Canyon National Park",
      description: "Natural wonder with breathtaking views",
      link: "https://www.nps.gov/grca/",
      coords: [-112.1401, 36.0544],
    },
    {
      id: 3,
      name: "Yosemite National Park",
      description: "Known for its waterfalls and giant sequoias",
      link: "https://www.nps.gov/yose/",
      coords: [-119.5383, 37.8651],
    },
  ]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-98.5795, 39.8283],
      zoom: 3.5,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("load", () => {
      map.current?.resize();

      // Off-road tracks source & layers
      map.current.addSource("offroad-tracks", {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8",
      });
      const levels = [
        { id: "offroad-easy", filterValue: "easy", width: 2 },
        { id: "offroad-medium", filterValue: "medium", width: 2 },
        { id: "offroad-difficult", filterValue: "difficult", width: 2 },
        { id: "offroad-extreme", filterValue: "extreme", width: 2 },
      ];
      levels.forEach(({ id, filterValue, width }) => {
        map.current!.addLayer({
          id,
          type: "line",
          source: "offroad-tracks",
          "source-layer": "road",
          filter: ["all", ["==", "class", "road"], ["==", "type", filterValue]],
          paint: {
            "line-color": [
              "match",
              ["get", "type"],
              "easy",
              "#2ecc71",
              "medium",
              "#f1c40f",
              "difficult",
              "#e67e22",
              "extreme",
              "#e74c3c",
              "#000000",
            ],
            "line-width": width,
          },
        });
      });

      // Add park markers & fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      suggestions.forEach((item) => {
        new mapboxgl.Marker({ anchor: "bottom" })
          .setLngLat(item.coords)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3>${item.name}</h3><p>${item.description}</p>`
            )
          )
          .addTo(map.current!);
        bounds.extend(item.coords as [number, number]);
      });
      map.current!.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
      });

      // Dynamic route planning via Mapbox Directions
      const directions = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "metric",
        profile: "mapbox/driving",
        interactive: true,
        controls: { instructions: true },
      });
      map.current!.addControl(directions, "top-left");
    });
  }, [suggestions]);

  return (
    <div className="space-y-6 w-full">
      {/* Map */}
      <div
        ref={mapContainer}
        className="relative rounded-lg border h-[400px] w-full"
      />

      {/* Suggestions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Pam suggests:</h3>
        <p className="text-gray-600 mb-4">
          Which of these parks would you like to visit?
        </p>
        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-4">
            {suggestions.map((item) => (
              <Card
                key={item.id}
                className="min-w-[280px] cursor-pointer hover:border-primary transition-colors"
              >
                <CardContent className="p-4">
                  <h4 className="font-bold">{item.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {item.description}
                  </p>
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
