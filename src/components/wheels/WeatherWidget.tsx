// src/components/wheels/WeatherWidget.tsx
import { useEffect, useState } from 'react';

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
}

interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ latitude, longitude }) => {
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
        );
        if (!res.ok) throw new Error('Failed to fetch weather data');
        const data = await res.json();

        setCurrentTemp(data.current_weather.temperature);

        const daily = data.daily;
        const dailyForecast: DailyForecast[] = daily.time.map((date: string, idx: number) => ({
          date,
          tempMax: daily.temperature_2m_max[idx],
          tempMin: daily.temperature_2m_min[idx],
          precipitationProbability: daily.precipitation_probability_max[idx],
        }));

        setForecast(dailyForecast);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl shadow bg-white w-full max-w-sm">
        <p className="text-sm">Loading weather...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl shadow bg-white w-full max-w-sm">
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  // Check if rain is expected on any of the next 7 days
  const willRain = forecast.slice(0, 7).some(day => day.precipitationProbability > 50);

  return (
    <div className="p-4 rounded-xl shadow bg-white w-full max-w-sm">
      <h2 className="text-lg font-bold mb-2">Current Temperature: {currentTemp}°C</h2>
      {willRain && (
        <p className="text-sm text-blue-600 mb-2">Rain is expected this week.</p>
      )}
      <h3 className="text-md font-semibold mb-2">7-Day Forecast</h3>
      <ul className="space-y-1">
        {forecast.slice(0, 7).map(day => (
          <li key={day.date} className="flex justify-between text-sm">
            <span>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>{day.tempMin}°/{day.tempMax}°</span>
            <span>{day.precipitationProbability}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WeatherWidget;
