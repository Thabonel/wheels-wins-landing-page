/**
 * PAM Tool Registry - Tool Management Module
 *
 * Version: 1.0
 * Purpose: Centralize all tool fetching and formatting logic
 *
 * Design Principles:
 * - Single source of truth for tool definitions
 * - Modular: Fetch tools from backend, cache efficiently
 * - Fail-safe: Returns empty array on error, never crashes
 * - Format conversion: Backend format → OpenAI format
 *
 * Version History:
 * 1.0 (2025-10-19) - Initial extraction from index.ts
 */

import { cache, cacheKey, CACHE_TTL } from './cache.ts'

/**
 * OpenAI Tool Definition Format
 */
export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

/**
 * Backend Tool Definition Format
 */
export interface BackendTool {
  name: string
  description: string
  parameters: Record<string, any>
}

/**
 * Fetch tools from backend API
 * FAIL-SAFE: Returns empty array on error
 *
 * @param authHeader - Authorization header with user token
 * @param backendUrl - Backend API URL
 * @returns Array of backend tool definitions
 */
async function fetchToolsFromBackend(
  authHeader: string,
  backendUrl: string
): Promise<BackendTool[]> {
  try {
    const toolsResponse = await fetch(`${backendUrl}/api/v1/pam/tools/list`, {
      headers: { 'Authorization': authHeader }
    })

    if (!toolsResponse.ok) {
      console.error('Tools fetch failed:', await toolsResponse.text())
      return [] // Continue with no tools
    }

    const toolsData = await toolsResponse.json()

    // Validate response structure
    if (!Array.isArray(toolsData.tools)) {
      console.error('Invalid tools response format:', toolsData)
      return []
    }

    return toolsData.tools
  } catch (error) {
    console.error('Tools fetch error:', error)
    return [] // Continue with no tools
  }
}

/**
 * Convert backend tool format to OpenAI tool format
 *
 * @param backendTools - Array of backend tool definitions
 * @returns Array of OpenAI tool definitions
 */
export function formatToolsForOpenAI(backendTools: BackendTool[]): OpenAITool[] {
  if (!Array.isArray(backendTools) || backendTools.length === 0) {
    return []
  }

  return backendTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

/**
 * Get tools with caching
 * Fetches from backend and caches for 1 hour
 *
 * @param authHeader - Authorization header with user token
 * @param backendUrl - Backend API URL (defaults to staging)
 * @returns Array of OpenAI-formatted tools
 */
export async function getTools(
  authHeader: string,
  backendUrl?: string
): Promise<OpenAITool[]> {
  const apiUrl = backendUrl ?? 'https://wheels-wins-backend-staging.onrender.com'

  // Check cache first (CAG - Cache-Augmented Generation)
  let tools = cache.get<BackendTool[]>(cacheKey.toolsList())

  if (!tools) {
    // Fetch from backend
    tools = await fetchToolsFromBackend(authHeader, apiUrl)

    // Cache only if we got tools
    if (tools && tools.length > 0) {
      cache.set(cacheKey.toolsList(), tools, CACHE_TTL.TOOLS_LIST)
    }
  }

  // Convert to OpenAI format
  return formatToolsForOpenAI(tools || [])
}
