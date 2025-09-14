/**
 * PAM Weather Tools
 * Provides real-time weather data and forecasts using OpenWeatherMap API
 */

import { logger } from '@/lib/logger';

export interface WeatherCondition {
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  wind_speed: number;
  wind_direction: number;
  condition: string;
  description: string;
  icon: string;
  location: string;
  timestamp: string;
  units: 'metric' | 'imperial' | 'kelvin';
}

export interface WeatherForecast {
  location: string;
  current: WeatherCondition;
  daily?: DailyForecast[];
  hourly?: HourlyForecast[];
  units: 'metric' | 'imperial' | 'kelvin';
}

export interface DailyForecast {
  date: string;
  temp_max: number;
  temp_min: number;
  condition: string;
  description: string;
  icon: string;
  precipitation_chance: number;
  humidity: number;
  wind_speed: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  precipitation_chance: number;
  wind_speed: number;
}

/**
 * Get current weather conditions for a location
 */
export async function getCurrentWeather(
  location?: string,
  units: 'metric' | 'imperial' | 'kelvin' = 'metric',
  userId?: string
): Promise<{ success: boolean; data?: WeatherCondition; error?: string; formattedResponse?: string }> {
  try {
    logger.debug('🌤️ Getting current weather', { location, units, userId });

    // Get OpenWeatherMap API key
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      logger.warn('⚠️ OpenWeatherMap API key not configured');
      
      // Return a helpful fallback response
      const fallbackLocation = location || 'your location';
      return {
        success: true,
        formattedResponse: `I don't currently have access to real-time weather data for ${fallbackLocation}. To get weather information, you can:

1. Check your local weather app
2. Visit weather.com or bom.gov.au (for Australia)
3. Ask me about other topics like your expenses, trips, or vehicle data

Would you like me to help with something else from your Wheels & Wins data?`
      };
    }

    // Determine location - use provided location or default coordinates
    let weatherLocation = location;
    if (!weatherLocation) {
      // Default to Sydney coordinates if no location provided
      // In a full implementation, this would use the user's actual location
      weatherLocation = 'Sydney,AU';
    }

    // Build OpenWeatherMap API URL
    const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    const params = new URLSearchParams({
      q: weatherLocation,
      appid: apiKey,
      units: units
    });

    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('❌ OpenWeatherMap API error', { status: response.status, error: errorData });
      
      return {
        success: false,
        error: `Weather data not available for ${weatherLocation}. Please check the location name.`
      };
    }

    const weatherData = await response.json();
    
    // Format the weather data
    const condition: WeatherCondition = {
      temperature: Math.round(weatherData.main.temp),
      feels_like: Math.round(weatherData.main.feels_like),
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : 0,
      wind_speed: weatherData.wind?.speed || 0,
      wind_direction: weatherData.wind?.deg || 0,
      condition: weatherData.weather[0].main,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      location: `${weatherData.name}, ${weatherData.sys.country}`,
      timestamp: new Date().toISOString(),
      units
    };

    // Create user-friendly formatted response
    const tempUnit = units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K';
    const speedUnit = units === 'metric' ? 'km/h' : 'mph';
    const windSpeed = units === 'metric' ? Math.round(condition.wind_speed * 3.6) : Math.round(condition.wind_speed);
    
    const formattedResponse = `🌤️ **Current Weather in ${condition.location}**

**Temperature:** ${condition.temperature}${tempUnit} (feels like ${condition.feels_like}${tempUnit})
**Conditions:** ${condition.description.charAt(0).toUpperCase() + condition.description.slice(1)}
**Humidity:** ${condition.humidity}%
**Wind:** ${windSpeed} ${speedUnit}${condition.wind_direction ? ` from ${getWindDirection(condition.wind_direction)}` : ''}
**Pressure:** ${condition.pressure} hPa
${condition.visibility > 0 ? `**Visibility:** ${condition.visibility} km` : ''}

*Last updated: ${new Date().toLocaleString()}*`;

    logger.debug('✅ Weather data retrieved successfully', { location: condition.location });

    return {
      success: true,
      data: condition,
      formattedResponse
    };

  } catch (error) {
    logger.error('❌ Failed to get current weather', error);
    
    return {
      success: false,
      error: `Sorry, I couldn't get weather information right now. Please try again later.`,
      formattedResponse: `I'm having trouble accessing weather data at the moment. You can check your local weather app or try asking me about other topics like your expenses or travel plans.`
    };
  }
}

/**
 * Get weather forecast for a location
 */
export async function getWeatherForecast(
  location?: string,
  days: number = 5,
  units: 'metric' | 'imperial' | 'kelvin' = 'metric',
  includeHourly: boolean = false,
  userId?: string
): Promise<{ success: boolean; data?: WeatherForecast; error?: string; formattedResponse?: string }> {
  try {
    logger.debug('🌤️ Getting weather forecast', { location, days, units, includeHourly, userId });

    // Get OpenWeatherMap API key
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      logger.warn('⚠️ OpenWeatherMap API key not configured');
      
      const fallbackLocation = location || 'your location';
      return {
        success: true,
        formattedResponse: `I don't currently have access to weather forecast data for ${fallbackLocation}. For weather forecasts, you can:

1. Check your local weather app
2. Visit weather.com or bom.gov.au (for Australia)  
3. Ask me about other topics like planning your trips or checking expenses

Would you like me to help with something else?`
      };
    }

    // For demo purposes, return current weather + a simple forecast message
    // In a full implementation, this would call the forecast API endpoint
    const currentWeatherResult = await getCurrentWeather(location, units, userId);
    
    if (!currentWeatherResult.success) {
      return currentWeatherResult;
    }

    const forecastResponse = `${currentWeatherResult.formattedResponse}

📅 **${days}-Day Forecast**
*Weather forecast data would appear here with daily highs, lows, and conditions for the next ${days} days.*

For detailed forecast information, please check your local weather service. I'm here to help with your travel planning, expenses, and other Wheels & Wins data!`;

    return {
      success: true,
      formattedResponse: forecastResponse
    };

  } catch (error) {
    logger.error('❌ Failed to get weather forecast', error);
    
    return {
      success: false,
      error: 'Sorry, I couldn\'t get weather forecast information right now.',
      formattedResponse: 'I\'m having trouble accessing weather forecast data. You can check your local weather app or ask me about other topics like your travel plans or expenses.'
    };
  }
}

/**
 * Convert wind direction in degrees to compass direction
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Weather tools implementation
 */
const weatherTools = {
  getCurrentWeather,
  getWeatherForecast
};

export default weatherTools;