import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapboxViewer = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [133.7751, -25.2744], // Default to Australia
      zoom: 3,
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[500px] rounded-lg border"
    />
  );
};

export default MapboxViewer;
