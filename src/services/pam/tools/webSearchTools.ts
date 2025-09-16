/**
 * PAM Web Search Tools using Backend Google API
 * Provides real-time web search capabilities through backend service
 */

import { logger } from '@/lib/logger';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  search_time: number;
  engines_used: string[];
}

/**
 * Perform web search using backend Google API
 */
export async function performWebSearch(
  query: string,
  numResults: number = 5,
  searchType?: 'news' | 'local' | 'how-to' | 'product' | 'travel',
  userId?: string
): Promise<{ success: boolean; data?: SearchResponse; error?: string; formattedResponse?: string }> {
  try {
    logger.debug('🔍 Performing web search via backend Google API', { query, numResults, searchType, userId });

    // Get backend URL from environment
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';
    
    // Build search URL
    const searchUrl = new URL('/api/v1/search', backendUrl);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num_results', numResults.toString());
    searchUrl.searchParams.set('engines', 'google'); // Use Google API
    
    if (searchType) {
      searchUrl.searchParams.set('search_type', searchType);
    }

    const startTime = Date.now();
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('❌ Backend web search API error', { 
        status: response.status, 
        error: errorData,
        query
      });
      
      return {
        success: false,
        error: `Web search failed: ${errorData.detail || response.statusText}`
      };
    }

    const searchData: SearchResponse = await response.json();
    
    // Format results for display
    const formattedResults = searchData.results.map((result, index) => 
      `**${index + 1}. ${result.title}**\n${result.snippet}\n*Source: ${result.source}* • [Link](${result.url})`
    ).join('\n\n');

    const formattedResponse = `🔍 **Web Search Results for "${query}"**\n\n${formattedResults}\n\n*Search completed in ${responseTime}ms using ${searchData.engines_used.join(', ')} • Found ${searchData.total_results} total results*`;

    logger.info('✅ Web search completed successfully', {
      query,
      resultCount: searchData.results.length,
      totalResults: searchData.total_results,
      responseTime,
      engines: searchData.engines_used
    });

    return {
      success: true,
      data: searchData,
      formattedResponse
    };

  } catch (error: any) {
    logger.error('❌ Web search error', { error: error.message, query });
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Network error: Cannot connect to search service. Please check your connection.',
        formattedResponse: 'I\'m having trouble connecting to the search service right now. Please try again in a moment or ask me about information from your Wheels & Wins data.'
      };
    }
    
    return {
      success: false,
      error: `Web search failed: ${error.message}`,
      formattedResponse: 'I encountered an error while searching the web. You can try asking me about your expenses, trips, or other topics from your data.'
    };
  }
}

/**
 * Search for current weather information
 */
export async function searchCurrentWeather(
  location?: string,
  userId?: string
): Promise<{ success: boolean; data?: SearchResponse; error?: string; formattedResponse?: string }> {
  const searchLocation = location || 'Sydney Australia';
  const query = `current weather ${searchLocation} today temperature conditions`;
  
  return await performWebSearch(query, 3, undefined, userId);
}

/**
 * Search for weather forecast
 */
export async function searchWeatherForecast(
  location?: string,
  days: number = 5,
  userId?: string
): Promise<{ success: boolean; data?: SearchResponse; error?: string; formattedResponse?: string }> {
  const searchLocation = location || 'Sydney Australia';
  const query = `${days} day weather forecast ${searchLocation}`;
  
  return await performWebSearch(query, 3, undefined, userId);
}

/**
 * Search for news and current events
 */
export async function searchNews(
  topic: string,
  userId?: string
): Promise<{ success: boolean; data?: SearchResponse; error?: string; formattedResponse?: string }> {
  return await performWebSearch(`${topic} news latest`, 5, 'news', userId);
}

/**
 * Web search tools for PAM
 */
const webSearchTools = {
  performWebSearch,
  searchCurrentWeather,
  searchWeatherForecast,
  searchNews
};

export default webSearchTools;