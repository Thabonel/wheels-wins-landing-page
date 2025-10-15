/**
 * Manual Health Check Endpoint
 *
 * Call this anytime to test system health manually
 * Useful for debugging or on-demand checks
 *
 * Usage: GET /.netlify/functions/manual-health-check
 */

import { Handler } from '@netlify/functions';
import { handler as healthCheck } from './health-check';

export const handler: Handler = async (event, context) => {
  // Add CORS headers for browser access
  const response = await healthCheck(event, context);

  return {
    ...response,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  };
};
