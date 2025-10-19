/**
 * Context Gatherers - Modular, composable context sources for PAM
 *
 * Design Principles:
 * 1. Each gatherer is isolated and fail-safe
 * 2. Gatherers return null on failure (never throw)
 * 3. Easy to add new context sources
 * 4. Context is composable and optional
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cache, cacheKey, CACHE_TTL } from './cache.ts'

// ============================================================================
// CONTEXT GATHERER: User Profile
// ============================================================================

interface UserProfileContext {
  userId: string
  email: string
  name?: string
  vehicle?: string
  fuelType?: string
  region?: string
  travelStyle?: string
  preferredUnits?: string
}

export async function gatherUserProfileContext(
  userId: string,
  email: string,
  authHeader: string
): Promise<string | null> {
  try {
    // Check cache first (CAG - Cache-Augmented Generation)
    let userProfile = cache.get<any>(cacheKey.userProfile(userId))

    if (!userProfile) {
      // Fetch from database
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data } = await supabaseClient
        .from('profiles')
        .select('full_name, nickname, vehicle_make_model, vehicle_type, fuel_type, region, travel_style, preferred_units')
        .eq('id', userId)
        .single()

      userProfile = data

      // Cache for next time
      if (userProfile) {
        cache.set(cacheKey.userProfile(userId), userProfile, CACHE_TTL.USER_PROFILE)
      }
    }

    // Format context string
    const context = `
USER CONTEXT (use this to personalize responses):
- User ID: ${userId}
- Email: ${email}
${userProfile ? `
- Name: ${userProfile.nickname || userProfile.full_name || 'Not set'}
- Vehicle: ${userProfile.vehicle_make_model || userProfile.vehicle_type || 'Not specified'}
- Fuel Type: ${userProfile.fuel_type || 'Not specified'}
- Region: ${userProfile.region || 'Not specified'}
- Travel Style: ${userProfile.travel_style || 'Not specified'}
- Preferred Units: ${userProfile.preferred_units || 'metric'}
` : ''}
`.trim()

    return context

  } catch (error) {
    console.error('❌ User profile context gatherer failed:', error)
    // ✅ Fail-safe: Return null, PAM continues without profile context
    return null
  }
}

// ============================================================================
// CONTEXT GATHERER: RPS Parts (Future)
// ============================================================================

export async function gatherRPSContext(
  message: string,
  authHeader: string
): Promise<string | null> {
  try {
    // Detect if this is an RPS parts query
    const rpsPatterns = [
      /NIIN\s+[\d-]+/i,
      /NSN\s+[\d-]+/i,
      /part\s+number/i,
      /unimog\s+part/i
    ]

    const isRPSQuery = rpsPatterns.some(pattern => pattern.test(message))

    if (!isRPSQuery) {
      return null // Not an RPS query
    }

    // TODO: Phase 8 - Call backend RPS service
    // const backendUrl = Deno.env.get('BACKEND_URL')
    // const response = await fetch(`${backendUrl}/api/v1/rps/search`, {
    //   method: 'POST',
    //   headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ query: message })
    // })
    // const rpsData = await response.json()

    // For now, return null (not implemented)
    return null

  } catch (error) {
    console.error('❌ RPS context gatherer failed:', error)
    // ✅ Fail-safe: Return null, PAM continues without RPS context
    return null
  }
}

// ============================================================================
// CONTEXT GATHERER: Workshop Information (Future)
// ============================================================================

export async function gatherWISContext(
  message: string,
  authHeader: string
): Promise<string | null> {
  try {
    // Detect if this is a WIS/manual query
    const wisPatterns = [
      /how\s+to/i,
      /procedure/i,
      /repair/i,
      /maintenance/i,
      /torque\s+spec/i
    ]

    const isWISQuery = wisPatterns.some(pattern => pattern.test(message))

    if (!isWISQuery) {
      return null // Not a WIS query
    }

    // TODO: Phase 9 - Call manual search service
    // const backendUrl = Deno.env.get('BACKEND_URL')
    // const response = await fetch(`${backendUrl}/api/v1/manual/search`, {
    //   method: 'POST',
    //   headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ query: message })
    // })
    // const wisData = await response.json()

    // For now, return null (not implemented)
    return null

  } catch (error) {
    console.error('❌ WIS context gatherer failed:', error)
    // ✅ Fail-safe: Return null, PAM continues without WIS context
    return null
  }
}

// ============================================================================
// CONTEXT GATHERER: Recent Trips/Expenses (Future)
// ============================================================================

export async function gatherRecentActivityContext(
  userId: string,
  authHeader: string
): Promise<string | null> {
  try {
    // TODO: Phase 10 - Fetch recent user activity
    // - Recent trips
    // - Recent expenses
    // - Recent savings events
    // - Budget alerts

    // For now, return null (not implemented)
    return null

  } catch (error) {
    console.error('❌ Recent activity context gatherer failed:', error)
    // ✅ Fail-safe: Return null, PAM continues without activity context
    return null
  }
}

// ============================================================================
// MASTER CONTEXT GATHERER
// ============================================================================

export async function gatherAllContext(
  userId: string,
  email: string,
  message: string,
  authHeader: string
): Promise<string> {
  try {
    // Gather all context sources in parallel (fail-safe)
    const [
      userProfileCtx,
      rpsCtx,
      wisCtx,
      activityCtx
    ] = await Promise.all([
      gatherUserProfileContext(userId, email, authHeader),
      gatherRPSContext(message, authHeader),
      gatherWISContext(message, authHeader),
      gatherRecentActivityContext(userId, authHeader)
    ])

    // Compose all non-null contexts
    const allContexts = [
      userProfileCtx,
      rpsCtx,
      wisCtx,
      activityCtx
    ].filter(Boolean)

    // Join with double newline separator
    return allContexts.join('\n\n')

  } catch (error) {
    console.error('❌ Master context gatherer failed:', error)
    // ✅ Fail-safe: Return empty string, PAM continues with base prompt only
    return ''
  }
}
