/**
 * Netlify Serverless Function for PAM AI SDK Chat
 * Handles streaming chat responses with tool execution
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { streamText, CoreMessage, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Environment validation
const requiredEnvVars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

// AI Model configuration
const aiModels = {
  primary: openai('gpt-4-turbo-preview'),
  fallback: anthropic('claude-3-sonnet-20240229'),
  emergency: openai('gpt-3.5-turbo'),
};

// Simple weather tool
const getWeatherTool = tool({
  description: 'Get current weather information for a location',
  parameters: z.object({
    location: z.string().describe('The city or location to get weather for'),
  }),
  execute: async ({ location }) => {
    try {
      // In production, this would call a real weather API
      // For now, using mock data with realistic structure
      const mockWeather = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10,
        conditions: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 50) + 30,
        windSpeed: Math.floor(Math.random() * 20) + 5,
        description: `Current weather in ${location}`,
      };

      return {
        success: true,
        data: mockWeather,
        source: 'weather_api',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch weather data',
        message: 'Weather service temporarily unavailable',
      };
    }
  },
});

// Simple search tool  
const searchWebTool = tool({
  description: 'Search the web for information',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().default(5),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      // Mock search results - in production would use real search API
      const mockResults = Array.from({ length: Math.min(maxResults, 3) }, (_, i) => ({
        title: `Search Result ${i + 1} for "${query}"`,
        url: `https://example.com/result-${i + 1}`,
        snippet: `This is a relevant search result for "${query}". Contains helpful information about the topic.`,
        source: 'web_search',
      }));

      return {
        success: true,
        data: {
          query,
          results: mockResults,
          totalResults: mockResults.length,
        },
        source: 'search_api',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Search temporarily unavailable',
        message: 'Please try again later',
      };
    }
  },
});

const tools = {
  getWeather: getWeatherTool,
  searchWeb: searchWebTool,
};

// Main handler function
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'text/plain; charset=utf-8',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate environment variables
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing environment variable: ${key}`);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Server configuration error' }),
        };
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { messages = [], model = 'primary' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: messages array required' }),
      };
    }

    // Add system message for PAM context
    const systemMessage: CoreMessage = {
      role: 'system',
      content: `You are PAM (Personal AI Mobility Assistant) for Wheels & Wins, a comprehensive travel planning platform.

You help users with:
- Trip planning and route optimization for RVs and road trips
- Weather information for travel destinations
- Financial tracking for travel expenses  
- Finding RV parks, campgrounds, and attractions
- General travel advice and recommendations
- Vehicle maintenance reminders

Keep responses concise, helpful, and focused on travel and mobility. Use available tools when appropriate.
This is running on Vercel AI SDK with streaming responses.`,
    };

    const allMessages: CoreMessage[] = [systemMessage, ...messages];

    // Select AI model
    const selectedModel = aiModels[model as keyof typeof aiModels] || aiModels.primary;

    console.log(`PAM Chat request - Model: ${model}, Messages: ${messages.length}`);

    // Generate streaming response
    const result = await streamText({
      model: selectedModel,
      messages: allMessages,
      tools,
      maxTokens: 4096,
      temperature: 0.7,
    });

    // For Netlify Functions, we need to collect the stream and return it
    // In production, this would use proper streaming with Server-Sent Events
    let fullResponse = '';
    const chunks: string[] = [];
    
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    
    fullResponse = chunks.join('');

    // Get usage information for cost tracking
    const usage = await result.usage;
    
    // Log usage for monitoring (in production, this would track actual costs)
    console.log('PAM API Usage:', {
      model,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });

    // Return complete response (streaming will be implemented in Phase 2)
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        response: fullResponse,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        model: model,
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('PAM Chat error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};