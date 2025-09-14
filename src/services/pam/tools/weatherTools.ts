/**
 * PAM Weather Tools with Hybrid Approach
 * 1. Try OpenWeatherMap API first (fast, reliable)
 * 2. Fall back to backend Google API search (if OpenWeatherMap fails)
 * 3. Provide helpful guidance (final fallback)
 */

import { logger } from '@/lib/logger';
import { searchCurrentWeather, searchWeatherForecast } from './webSearchTools';

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
 * Get current weather conditions using hybrid approach:
 * 1. Try Claude web search first (if available)
 * 2. Fall back to OpenWeatherMap API (if configured)
 * 3. Provide helpful guidance (final fallback)
 */
export async function getCurrentWeather(
  location?: string,
  units: 'metric' | 'imperial' | 'kelvin' = 'metric',
  userId?: string
): Promise<{ success: boolean; data?: WeatherCondition; error?: string; formattedResponse?: string }> {
  try {
    logger.debug('🌤️ Getting current weather with hybrid approach', { location, units, userId });

    const targetLocation = location || 'Sydney, Australia';

    // Strategy 1: Try OpenWeatherMap API first (fast and reliable)
    // Strategy 2: Try OpenWeatherMap API
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (apiKey && apiKey !== 'your-openweathermap-api-key-here') {
      logger.debug('🌐 Using OpenWeatherMap API fallback');
      return await getWeatherFromOpenWeatherMap(targetLocation, units, apiKey);
    }

    // Strategy 2: Try backend Google API search as fallback
    try {
      logger.debug('🔍 Trying backend Google API search as fallback');
      
      const webSearchResult = await searchCurrentWeather(targetLocation, userId);
      
      if (webSearchResult.success && webSearchResult.formattedResponse) {
        logger.info('✅ Backend Google search weather successful');
        return {
          success: true,
          formattedResponse: webSearchResult.formattedResponse
        };
      }
    } catch (webSearchError) {
      logger.debug('⚠️ Backend Google search also failed', { error: webSearchError });
    }

    // Strategy 3: Final fallback - helpful guidance
    logger.warn('⚠️ No weather APIs configured - providing guidance');
    return {
      success: true,
      formattedResponse: `I don't currently have access to real-time weather data for ${targetLocation}. To get weather information, you can:

1. **Enable Claude Web Search**: Contact your administrator to enable web search in the Anthropic Console
2. **Configure OpenWeatherMap API**: Sign up at https://openweathermap.org/api for a free API key
3. **Check external sources**: Visit weather.com, bom.gov.au (Australia), or your local weather app
4. **Ask me about other topics**: I can help with your expenses, trips, or vehicle data

Would you like me to help with something else from your Wheels & Wins data?`
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
 * Get weather from OpenWeatherMap API (fallback method)
 */
async function getWeatherFromOpenWeatherMap(
  location: string,
  units: 'metric' | 'imperial' | 'kelvin' = 'metric',
  apiKey: string
): Promise<{ success: boolean; data?: WeatherCondition; error?: string; formattedResponse?: string }> {
  try {
    // Build OpenWeatherMap API URL
    const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    const params = new URLSearchParams({
      q: location,
      appid: apiKey,
      units: units
    });

    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('❌ OpenWeatherMap API error', { status: response.status, error: errorData });
      
      return {
        success: false,
        error: `Weather data not available for ${location}. Please check the location name.`
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

*Weather data from OpenWeatherMap • Last updated: ${new Date().toLocaleString()}*`;

    logger.debug('✅ Weather data retrieved successfully', { location: condition.location });

    return {
      success: true,
      data: condition,
      formattedResponse
    };

  } catch (error) {
    logger.error('❌ OpenWeatherMap API failed', error);
    
    return {
      success: false,
      error: `OpenWeatherMap API error: ${error.message || 'Unknown error'}`,
      formattedResponse: `I'm having trouble accessing OpenWeatherMap data. You can check your local weather app or try asking me about other topics.`
    };
  }
}

/**
 * Get weather forecast using hybrid approach
 */
export async function getWeatherForecast(
  location?: string,
  days: number = 5,
  units: 'metric' | 'imperial' | 'kelvin' = 'metric',
  includeHourly: boolean = false,
  userId?: string
): Promise<{ success: boolean; data?: WeatherForecast; error?: string; formattedResponse?: string }> {
  try {
    logger.debug('🌤️ Getting weather forecast with hybrid approach', { location, days, units, includeHourly, userId });

    const targetLocation = location || 'Sydney, Australia';

    // Strategy 1: Try backend Google API search first
    try {
      logger.debug('🔍 Attempting backend Google API search for weather forecast');
      
      const webSearchResult = await searchWeatherForecast(targetLocation, days, userId);
      
      if (webSearchResult.success && webSearchResult.formattedResponse) {
        logger.info('✅ Backend Google search forecast successful');
        return {
          success: true,
          formattedResponse: webSearchResult.formattedResponse
        };
      }
    } catch (webSearchError) {
      logger.debug('⚠️ Backend Google search not available for forecast, trying fallback', { error: webSearchError });
    }

    // Strategy 2: Fall back to current weather + forecast guidance
    const currentWeatherResult = await getCurrentWeather(location, units, userId);
    
    if (currentWeatherResult.success) {
      const forecastResponse = `${currentWeatherResult.formattedResponse}\n\n📅 **${days}-Day Forecast**\n\n*For detailed ${days}-day forecast information, I recommend:*\n\n1. **Enable Claude Web Search** for real-time forecast data\n2. **Check weather.com, bom.gov.au (Australia), or your local weather service**\n3. **Use your phone's weather app** for the most up-to-date forecasts\n\nI'm here to help with your travel planning, expenses, and other Wheels & Wins data!`;

      return {
        success: true,
        formattedResponse: forecastResponse
      };
    }

    // Strategy 3: Final fallback
    return {
      success: true,
      formattedResponse: `I don't currently have access to weather forecast data for ${targetLocation}. For ${days}-day forecasts, you can:\n\n1. **Enable Claude Web Search**: Contact your administrator to enable web search\n2. **Check external sources**: Visit weather.com, bom.gov.au, or your local weather app\n3. **Ask me about other topics**: I can help with travel planning, expenses, or vehicle data\n\nWould you like me to help with something else?`
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