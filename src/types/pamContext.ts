/**
 * PAM Context Type Definitions - SINGLE SOURCE OF TRUTH
 *
 * CRITICAL: These types MUST match what backend expects
 * See: docs/PAM_BACKEND_CONTEXT_REFERENCE.md
 *
 * If you change these types, you MUST update the backend and documentation.
 */

/**
 * User Location Context
 *
 * CRITICAL FIELD NAMES:
 * - Backend checks for 'lat' and 'lng' (NOT 'latitude' and 'longitude')
 * - See: backend/app/services/pam/tools/openmeteo_weather_tool.py line 96
 */
export interface UserLocationContext {
  /** Required: Backend weather tool checks 'lat' */
  lat: number;

  /** Required: Backend weather tool checks 'lng' */
  lng: number;

  /** Optional: Backward compatibility */
  latitude?: number;

  /** Optional: Backward compatibility */
  longitude?: number;

  /** Optional: City name (if geocoding succeeds) */
  city?: string;

  /** Optional: State/region */
  region?: string;

  /** Optional: Country name */
  country?: string;

  /** Optional: IANA timezone string */
  timezone?: string;

  /** Optional: GPS accuracy in meters */
  accuracy?: number;

  /** Optional: Unix timestamp when location was captured */
  timestamp?: number;

  /** Optional: How location was obtained */
  source?: 'gps' | 'ip' | 'browser' | 'cached';
}

/**
 * Complete PAM Context Object
 *
 * This is what gets sent to backend in every PAM request.
 * Backend files that check these fields are documented in PAM_BACKEND_CONTEXT_REFERENCE.md
 */
export interface PamContext {
  /** REQUIRED: User ID (snake_case) */
  user_id: string;

  /** Optional: Session ID for conversation continuity */
  session_id?: string;

  /** Optional: User location (MUST use 'user_location' not 'location') */
  user_location?: UserLocationContext;

  /** Optional: Current page user is viewing */
  current_page?: string;

  /** Optional: User's region/timezone */
  region?: string;

  /** Optional: User's IANA timezone (e.g., "Australia/Sydney") */
  timezone?: string;

  /** Optional: Connection type */
  connection_type?: 'websocket' | 'websocket_streaming' | 'http';

  /** Optional: Input mode (voice/text) */
  input_mode?: 'voice' | 'text';

  /** Optional: User settings object */
  user_settings?: Record<string, any>;

  /** Optional: Vehicle information */
  vehicle_info?: Record<string, any>;

  /** Optional: Travel preferences */
  travel_preferences?: Record<string, any>;

  /** Optional: Travel style */
  travel_style?: string;

  /** Optional: Budget constraints */
  budget_constraints?: Record<string, any>;

  /** Optional: Current trip information */
  current_trip?: Record<string, any>;

  /** Optional: Environment (production/staging/development) */
  environment?: string;

  /** Optional: Timestamp of request */
  timestamp?: number;

  /** Optional: Session data */
  session_data?: any;

  /** Optional: Last detected intent */
  last_intent?: string;

  /** Optional: UI state flags */
  in_financial_section?: boolean;
  viewing_expenses?: boolean;
  planning_trip?: boolean;
  is_rv_traveler?: boolean;
}

/**
 * PAM API Message Structure
 *
 * This is the complete message sent to backend API endpoints
 */
export interface PamApiMessage {
  message: string;
  user_id: string;
  context?: PamContext;
  session_id?: string;
}

/**
 * Field name validation rules
 *
 * These are COMMON MISTAKES that cause bugs:
 */
export const FIELD_NAME_RULES = {
  // ❌ WRONG field names (backend doesn't check these)
  WRONG: {
    location: 'Use user_location instead',
    userId: 'Use user_id instead (snake_case)',
    sessionId: 'Use session_id instead (snake_case)',
    userLocation: 'Backend maps this but prefer user_location directly',
    vehicleInfo: 'Use vehicle_info instead (snake_case)',
    travelStyle: 'Use travel_style instead (snake_case)',
    latitude: 'Use lat instead (weather tool checks lat)',
    longitude: 'Use lng instead (weather tool checks lng)',
  },

  // ✅ CORRECT field names (what backend actually checks)
  CORRECT: {
    user_location: 'Location context object',
    user_id: 'User identifier',
    session_id: 'Session identifier',
    vehicle_info: 'Vehicle data',
    travel_style: 'Travel preferences',
    lat: 'Latitude (checked by weather tool)',
    lng: 'Longitude (checked by weather tool)',
  }
} as const;

/**
 * Runtime validator to catch field name mismatches
 *
 * Call this before sending context to backend to get warnings
 */
export function validatePamContext(context: any): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for wrong field names
  Object.keys(FIELD_NAME_RULES.WRONG).forEach((wrongField) => {
    if (context[wrongField] !== undefined) {
      warnings.push(
        `⚠️ Found '${wrongField}' in context. ${FIELD_NAME_RULES.WRONG[wrongField as keyof typeof FIELD_NAME_RULES.WRONG]}`
      );
    }
  });

  // Check user_location structure if present
  if (context.user_location) {
    const loc = context.user_location;

    // Check for lat/lng (required for weather tool)
    if (loc.latitude !== undefined && loc.lat === undefined) {
      warnings.push(
        "⚠️ user_location has 'latitude' but missing 'lat'. Weather tool checks for 'lat' not 'latitude'."
      );
    }

    if (loc.longitude !== undefined && loc.lng === undefined) {
      warnings.push(
        "⚠️ user_location has 'longitude' but missing 'lng'. Weather tool checks for 'lng' not 'longitude'."
      );
    }

    // If no lat/lng and no city, weather queries will fail
    if (!loc.lat && !loc.lng && !loc.city) {
      errors.push(
        '❌ user_location must have either (lat + lng) OR city for weather queries to work'
      );
    }
  }

  // Check for required user_id
  if (!context.user_id) {
    errors.push('❌ Missing required field: user_id');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Type guard to check if object is valid PamContext
 */
export function isPamContext(obj: any): obj is PamContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.user_id === 'string'
  );
}
