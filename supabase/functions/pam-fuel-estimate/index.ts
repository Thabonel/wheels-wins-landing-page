/**
 * PAM Fuel Estimate Edge Function
 *
 * Calculate fuel cost for a trip based on distance and vehicle efficiency.
 * Pure compute function - no database access required.
 *
 * **Performance:**
 * - Target: <100ms response time
 * - Cache: 10 minutes (body-based)
 * - No database queries
 *
 * **Security:**
 * - JWT authentication required
 * - Input validation (positive numbers)
 * - No sensitive data storage
 *
 * **Formula:**
 * ```
 * Fuel Needed (L) = (Distance km × Fuel Efficiency L/100km) / 100
 * Total Cost = Fuel Needed (L) × Price per Liter
 * ```
 *
 * **Usage:**
 * ```typescript
 * const response = await fetch('/functions/v1/pam-fuel-estimate', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${token}`,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     distance_km: 450,
 *     fuel_efficiency_l_per_100km: 12.5,
 *     fuel_price_per_liter: 1.45
 *   })
 * });
 * ```
 *
 * @author Wheels & Wins Team
 * @version 1.0.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type {
  FuelEstimateRequest,
  FuelEstimateResponse,
} from "../_shared/types.ts";
import {
  createAuthenticatedClient,
  requireAuth,
  handleCorsPreflight,
  jsonResponse,
  errorResponse,
  validateRequired,
  validatePositiveNumber,
  getCacheHeaders,
  Logger,
  ValidationError,
  AuthenticationError,
} from "../_shared/utils.ts";

const logger = new Logger("pam-fuel-estimate");

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", {
      status: 405,
      code: "METHOD_NOT_ALLOWED",
    });
  }

  try {
    // Parse request body
    const body: FuelEstimateRequest = await req.json();

    // Validate request
    validateFuelEstimateRequest(body);

    // Create authenticated client (for auth only)
    const { client } = createAuthenticatedClient(req);

    // Require authentication
    const user = await requireAuth(client);
    logger.info("Fuel estimate request", {
      user_id: user.id,
      distance_km: body.distance_km,
    });

    // Calculate fuel estimate (pure computation)
    const estimate = calculateFuelEstimate(body);

    logger.info("Fuel estimate calculated", {
      user_id: user.id,
      estimated_cost: estimate.estimated_cost,
    });

    // Return with caching (10 minutes for identical requests)
    return jsonResponse(estimate, {
      cache: getCacheHeaders("medium"),
    });
  } catch (error) {
    logger.error("Error calculating fuel estimate", {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    if (error instanceof ValidationError) {
      return errorResponse(error.message, {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }

    // Generic error
    return errorResponse("Internal server error", {
      status: 500,
      code: "INTERNAL_ERROR",
    });
  }
});

/**
 * Validate fuel estimate request
 */
function validateFuelEstimateRequest(body: FuelEstimateRequest): void {
  // Required fields
  validateRequired(body, [
    "distance_km",
    "fuel_efficiency_l_per_100km",
    "fuel_price_per_liter",
  ]);

  // All values must be positive numbers
  validatePositiveNumber(body.distance_km, "distance_km");
  validatePositiveNumber(
    body.fuel_efficiency_l_per_100km,
    "fuel_efficiency_l_per_100km"
  );
  validatePositiveNumber(
    body.fuel_price_per_liter,
    "fuel_price_per_liter"
  );

  // Sanity checks
  if (body.distance_km > 10000) {
    throw new ValidationError(
      "Distance seems unusually high (>10,000 km). Please verify."
    );
  }

  if (body.fuel_efficiency_l_per_100km > 100) {
    throw new ValidationError(
      "Fuel efficiency seems unusually high (>100 L/100km). Please verify."
    );
  }

  if (body.fuel_price_per_liter > 10) {
    throw new ValidationError(
      "Fuel price seems unusually high (>$10/L). Please verify."
    );
  }
}

/**
 * Calculate fuel estimate
 * Pure function - no side effects
 */
function calculateFuelEstimate(
  request: FuelEstimateRequest
): FuelEstimateResponse {
  // Formula: (Distance × Efficiency) / 100 = Liters needed
  const fuelNeeded =
    (request.distance_km * request.fuel_efficiency_l_per_100km) / 100;

  // Total cost = Liters × Price per liter
  const estimatedCost = fuelNeeded * request.fuel_price_per_liter;

  // Round to 2 decimal places
  const fuelNeededRounded = Math.round(fuelNeeded * 100) / 100;
  const estimatedCostRounded = Math.round(estimatedCost * 100) / 100;

  return {
    distance_km: request.distance_km,
    fuel_needed_liters: fuelNeededRounded,
    estimated_cost: estimatedCostRounded,
    fuel_price_per_liter: request.fuel_price_per_liter,
    fuel_efficiency: request.fuel_efficiency_l_per_100km,
    calculation: {
      formula:
        "Fuel Needed (L) = (Distance km × Efficiency L/100km) / 100; Cost = Fuel × Price",
      steps: [
        `Step 1: Calculate fuel needed: (${request.distance_km} km × ${request.fuel_efficiency_l_per_100km} L/100km) / 100 = ${fuelNeededRounded} L`,
        `Step 2: Calculate cost: ${fuelNeededRounded} L × $${request.fuel_price_per_liter}/L = $${estimatedCostRounded}`,
      ],
    },
  };
}
