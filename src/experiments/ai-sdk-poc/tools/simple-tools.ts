/**
 * Simple tools for AI SDK POC testing
 * Starting with basic tools to validate the concept
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as Sentry from '@sentry/react';

// Simple weather tool (mock implementation for POC)
export const getWeatherTool = tool({
  description: 'Get current weather information for a location',
  parameters: z.object({
    location: z.string().describe('The city or location to get weather for'),
  }),
  execute: async ({ location }) => {
    const startTime = Date.now();
    
    try {
      // Mock weather data for POC
      const mockWeather = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10,
        conditions: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 50) + 30,
        windSpeed: Math.floor(Math.random() * 20) + 5,
      };

      const executionTime = Date.now() - startTime;
      
      // Track tool usage
      Sentry.addBreadcrumb({
        message: 'Weather tool executed',
        data: { location, executionTime },
        level: 'info',
      });

      return {
        success: true,
        data: mockWeather,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      Sentry.captureException(error);
      
      return {
        success: false,
        error: 'Failed to fetch weather data',
        executionTime,
      };
    }
  },
});

// Simple web search tool (mock implementation for POC)
export const searchWebTool = tool({
  description: 'Search the web for information',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().default(5),
  }),
  execute: async ({ query, maxResults }) => {
    const startTime = Date.now();
    
    try {
      // Mock search results for POC
      const mockResults = Array.from({ length: Math.min(maxResults, 3) }, (_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://example.com/result-${i + 1}`,
        snippet: `This is a mock search result snippet for "${query}". It contains relevant information.`,
      }));

      const executionTime = Date.now() - startTime;
      
      // Track tool usage
      Sentry.addBreadcrumb({
        message: 'Web search tool executed',
        data: { query, maxResults, executionTime },
        level: 'info',
      });

      return {
        success: true,
        data: {
          query,
          results: mockResults,
          totalResults: mockResults.length,
        },
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      Sentry.captureException(error);
      
      return {
        success: false,
        error: 'Failed to perform web search',
        executionTime,
      };
    }
  },
});

// Export tools for use in the POC
export const simpleTools = {
  getWeather: getWeatherTool,
  searchWeb: searchWebTool,
};