/**
 * PAM AI SDK Configuration - POC Version
 * Testing different AI models for the PAM migration
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export const aiModels = {
  // Primary model for cost efficiency  
  primary: openai('gpt-4-turbo-preview'),
  
  // Fallback model for complex queries
  fallback: anthropic('claude-3-sonnet-20240229'),
  
  // Emergency backup
  emergency: openai('gpt-3.5-turbo'),
} as const;

export const aiConfig = {
  quotas: {
    maxTokensPerRequest: 4096,
    maxRequestsPerMinute: 100,
    maxCostPerDay: 50.00,
  },
  
  monitoring: {
    trackTokenUsage: true,
    alertOnQuotaExceed: true,
    enableSentryTracking: true,
  },
  
  streaming: {
    enabled: true,
    chunkSize: 50, // Start TTS on 50+ characters
  },
} as const;

export type AiModelType = keyof typeof aiModels;