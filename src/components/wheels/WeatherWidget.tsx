// src/components/wheels/WeatherWidget.tsx
import { useEffect, useState } from 'react';

const WeatherWidget = () => {
  const [temp, setTemp] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`
      );
      const data = await res.json();
      setTemp(data.current.temperature_2m);
      setWind(data.current.wind_speed_10m);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-xl shadow bg-white w-full max-w-sm">
        <p className="text-sm">Loading weather...</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl shadow bg-white w-full max-w-sm">
      <h2 className="text-lg font-bold mb-2">Current Weather</h2>
      <p className="text-xl mb-1">{temp}°C</p>
      <p className="text-sm text-gray-600">Wind: {wind} km/h</p>
    </div>
  );
};

export default WeatherWidget;
