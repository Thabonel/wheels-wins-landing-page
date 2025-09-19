/**
 * PAM Tool Execution Engine
 * Handles routing, validation, execution, and formatting of tool calls from Claude
 */

import { logger } from '@/lib/logger';
import { 
  getToolByName, 
  validateToolDefinition,
  type ToolDefinition,
  type ToolInputSchema 
} from './toolRegistry';

// Import tool implementations
import profileTools, { type ToolResponse as ProfileToolResponse } from './profileTools';
import tripTools, { type ToolResponse as TripToolResponse } from './tripTools';
import webSearchTools from './webSearchTools';

// ===================
// WEATHER RESPONSE FUNCTIONS
// ===================

/**
 * Provide weather responses - PAM can answer weather questions like Claude
 */
async function provideWeatherResponse(
  location: string = 'your location',
  type: 'current' | 'forecast' = 'current',
  units: string = 'metric',
  days?: number
): Promise<any> {
  try {
    const targetLocation = location || 'your location';

    if (type === 'current') {
      return {
        success: true,
        data: null,
        formattedResponse: `I don't have access to real-time weather data for ${targetLocation} right now, but I can still help with weather-related questions! Here's what I can provide:

• **General weather guidance**: I can discuss typical weather patterns, seasonal considerations, and climate information for different regions
• **Travel weather advice**: Help you plan trips around seasonal weather, discuss what to pack, or suggest the best times to visit destinations
• **Weather preparedness**: Advice on handling different weather conditions while traveling or at home

For current conditions and specific forecasts, I'd recommend checking weather.com, your weather app, or asking me about general weather patterns for your area.

What specific weather information can I help you with?`
      };
    } else {
      const forecastDays = days || 5;
      return {
        success: true,
        data: null,
        formattedResponse: `I don't have access to real-time ${forecastDays}-day weather forecasts for ${targetLocation}, but here's what I can help you with:

• **For accurate forecasts**: Check weather.com, your phone's weather app, or search "${forecastDays} day weather forecast ${targetLocation}"
• **For trip planning**: I can help you plan routes, estimate costs, and suggest good times to travel
• **For seasonal guidance**: I can provide general seasonal weather patterns for different regions
• **For RV considerations**: I can discuss weather-related travel tips and seasonal campground availability

What aspects of your travel planning can I assist you with today?`
      };
    }
  } catch (error) {
    return {
      success: true,
      data: null,
      formattedResponse: `I'm having trouble accessing weather information right now, but I'm here to help with your travel planning, expense tracking, and other questions. What else can I help you with today?`
    };
  }
}

// ===================
// TYPE DEFINITIONS
// ===================

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  userId: string;
  requestId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: any;
  formattedResponse?: string;
  error?: string;
  message?: string;
  executionTime?: number;
  userId: string;
  requestId?: string;
}

export interface ToolValidationError {
  parameter: string;
  expected: string;
  received: string;
  message: string;
}

export interface ToolUsageAnalytics {
  toolName: string;
  userId: string;
  timestamp: Date;
  executionTime: number;
  success: boolean;
  parameterCount: number;
  dataSize?: number;
  error?: string;
}

// ===================
// TOOL EXECUTION ROUTER
// ===================

/**
 * Execute a tool call from Claude with full error handling and logging
 */
export async function executeToolCall(
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  requestId?: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const executionRequest: ToolExecutionRequest = {
    toolName,
    parameters,
    userId,
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  logger.debug('Executing tool call', {
    toolName,
    userId,
    requestId: executionRequest.requestId,
    paramCount: Object.keys(parameters).length
  });

  try {
    // Step 1: Validate tool exists
    const toolDefinition = getToolByName(toolName);
    if (!toolDefinition) {
      const error = `Tool '${toolName}' not found in registry`;
      logger.error('Tool execution failed - tool not found', { toolName, userId });
      
      await logToolUsage({
        toolName,
        userId,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        success: false,
        parameterCount: Object.keys(parameters).length,
        error
      });

      return {
        success: false,
        toolName,
        error,
        message: `The tool '${toolName}' is not available. Please check the tool name and try again.`,
        executionTime: Date.now() - startTime,
        userId,
        requestId: executionRequest.requestId
      };
    }

    // Step 2: Validate parameters
    const validationResult = validateToolParams(toolName, parameters);
    if (!validationResult.valid) {
      const error = `Parameter validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`;
      logger.error('Tool execution failed - parameter validation', {
        toolName,
        userId,
        errors: validationResult.errors
      });

      await logToolUsage({
        toolName,
        userId,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        success: false,
        parameterCount: Object.keys(parameters).length,
        error
      });

      return {
        success: false,
        toolName,
        error,
        message: `Invalid parameters: ${validationResult.errors?.map(e => `${e.parameter} - ${e.message}`).join('; ')}`,
        executionTime: Date.now() - startTime,
        userId,
        requestId: executionRequest.requestId
      };
    }

    // Step 3: Route to appropriate tool function
    const toolResult = await routeToolCall(toolDefinition, parameters, userId);

    // Step 4: Format response for Claude
    const formattedResponse = formatToolResponse(toolName, toolResult.data);

    const executionTime = Date.now() - startTime;

    // Step 5: Log successful execution
    await logToolUsage({
      toolName,
      userId,
      timestamp: new Date(),
      executionTime,
      success: toolResult.success,
      parameterCount: Object.keys(parameters).length,
      dataSize: toolResult.data ? JSON.stringify(toolResult.data).length : 0,
      error: toolResult.error
    });

    logger.debug('Tool execution completed', {
      toolName,
      userId,
      requestId: executionRequest.requestId,
      success: toolResult.success,
      executionTime
    });

    return {
      success: toolResult.success,
      toolName,
      data: toolResult.data,
      formattedResponse,
      error: toolResult.error,
      message: toolResult.message,
      executionTime,
      userId,
      requestId: executionRequest.requestId
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
    
    logger.error('Unexpected error in tool execution', {
      toolName,
      userId,
      requestId: executionRequest.requestId,
      error: errorMessage,
      executionTime
    });

    await logToolUsage({
      toolName,
      userId,
      timestamp: new Date(),
      executionTime,
      success: false,
      parameterCount: Object.keys(parameters).length,
      error: errorMessage
    });

    return {
      success: false,
      toolName,
      error: 'Tool execution failed',
      message: 'An unexpected error occurred while executing the tool. Please try again or contact support.',
      executionTime,
      userId,
      requestId: executionRequest.requestId
    };
  }
}

// ===================
// TOOL ROUTING
// ===================

/**
 * Route tool call to the appropriate implementation function
 */
async function routeToolCall(
  toolDefinition: ToolDefinition,
  parameters: Record<string, any>,
  userId: string
): Promise<ProfileToolResponse<any> | TripToolResponse<any>> {
  
  switch (toolDefinition.name) {
    // Profile tools
    case 'getUserProfile':
      return await profileTools.getUserProfile(userId, {
        include_financial_goals: parameters.include_financial_goals,
        include_preferences: parameters.include_preferences,
        include_statistics: parameters.include_statistics
      });

    case 'getUserSettings':
      return await profileTools.getUserSettings(userId, parameters.category);

    case 'getUserPreferences':
      return await profileTools.getUserPreferences(userId, {
        include_defaults: parameters.include_defaults
      });

    // Trip tools
    case 'getTripHistory':
      return await tripTools.getTripHistory(userId, {
        start_date: parameters.start_date,
        end_date: parameters.end_date,
        trip_type: parameters.trip_type,
        include_costs: parameters.include_costs,
        include_fuel_data: parameters.include_fuel_data,
        limit: parameters.limit
      });

    case 'getVehicleData':
      return await tripTools.getVehicleData(userId, {
        vehicle_id: parameters.vehicle_id,
        include_maintenance: parameters.include_maintenance,
        include_insurance: parameters.include_insurance,
        include_performance: parameters.include_performance
      });

    case 'getFuelData':
      return await tripTools.getFuelData(userId, {
        dateRange: parameters.start_date && parameters.end_date ? {
          start_date: parameters.start_date,
          end_date: parameters.end_date
        } : undefined,
        vehicle_id: parameters.vehicle_id,
        include_stations: parameters.include_stations,
        include_efficiency: parameters.include_efficiency,
        analysis_type: parameters.analysis_type
      });

    case 'getTripPlans':
      return await tripTools.getTripPlans(userId, {
        limit: parameters.limit,
        include_estimates: parameters.include_estimates
      });

    // Financial tools (placeholder - to be implemented)
    case 'getUserExpenses':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Financial tools are coming in the next implementation phase.'
      };

    case 'getUserBudgets':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Budget tools are coming in the next implementation phase.'
      };

    case 'getIncomeData':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Income tools are coming in the next implementation phase.'
      };

    case 'calculateSavings':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Savings calculation tools are coming in the next implementation phase.'
      };

    // Calendar tools (placeholder - to be implemented)
    case 'getUpcomingEvents':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Calendar tools are coming in the next implementation phase.'
      };

    // Weather tools - PAM can answer weather questions like Claude
    case 'getCurrentWeather':
      return await provideWeatherResponse(
        parameters.location,
        'current',
        parameters.units || 'metric'
      );

    case 'getWeatherForecast':
      return await provideWeatherResponse(
        parameters.location,
        'forecast',
        parameters.units || 'metric',
        parameters.days || 5
      );

    // Web Search tools
    case 'performWebSearch':
      return await webSearchTools.performWebSearch(
        parameters.query,
        parameters.num_results || 5,
        parameters.search_type,
        userId
      );

    case 'searchCurrentWeather':
      return await webSearchTools.searchCurrentWeather(
        parameters.location,
        userId
      );

    case 'searchNews':
      return await webSearchTools.searchNews(
        parameters.topic,
        userId
      );

    default:
      return {
        success: false,
        error: 'Tool routing not implemented',
        message: `Tool '${toolDefinition.name}' exists in registry but routing is not implemented.`
      };
  }
}

// ===================
// PARAMETER VALIDATION
// ===================

export interface ValidationResult {
  valid: boolean;
  errors?: ToolValidationError[];
}

/**
 * Validate tool parameters against JSON schema
 */
export function validateToolParams(
  toolName: string,
  parameters: Record<string, any>
): ValidationResult {
  const toolDefinition = getToolByName(toolName);
  
  if (!toolDefinition) {
    return {
      valid: false,
      errors: [{
        parameter: 'toolName',
        expected: 'valid tool name',
        received: toolName,
        message: `Tool '${toolName}' not found in registry`
      }]
    };
  }

  const errors: ToolValidationError[] = [];
  const schema = toolDefinition.input_schema;

  // Check required parameters
  if (schema.required) {
    for (const requiredParam of schema.required) {
      if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
        errors.push({
          parameter: requiredParam,
          expected: `required parameter`,
          received: 'undefined',
          message: `Required parameter '${requiredParam}' is missing`
        });
      }
    }
  }

  // Validate each provided parameter
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramSchema = schema.properties[paramName];
    
    if (!paramSchema) {
      // Allow extra parameters for flexibility, but log them
      logger.debug('Extra parameter provided', { toolName, parameter: paramName, value: paramValue });
      continue;
    }

    // Type validation
    const validationError = validateParameterType(paramName, paramValue, paramSchema);
    if (validationError) {
      errors.push(validationError);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate individual parameter type and constraints
 */
function validateParameterType(
  paramName: string,
  paramValue: any,
  schema: any
): ToolValidationError | null {
  
  // Skip validation for undefined optional parameters
  if (paramValue === undefined || paramValue === null) {
    return null;
  }

  // Type checking
  switch (schema.type) {
    case 'string':
      if (typeof paramValue !== 'string') {
        return {
          parameter: paramName,
          expected: 'string',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a string`
        };
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(paramValue)) {
        return {
          parameter: paramName,
          expected: `one of: ${schema.enum.join(', ')}`,
          received: paramValue,
          message: `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}`
        };
      }

      // Format validation
      if (schema.format === 'date' && !isValidDateString(paramValue)) {
        return {
          parameter: paramName,
          expected: 'valid date string (YYYY-MM-DD)',
          received: paramValue,
          message: `Parameter '${paramName}' must be a valid date string (YYYY-MM-DD format)`
        };
      }
      break;

    case 'number':
      if (typeof paramValue !== 'number' || isNaN(paramValue)) {
        return {
          parameter: paramName,
          expected: 'number',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a number`
        };
      }

      // Range validation
      if (schema.minimum !== undefined && paramValue < schema.minimum) {
        return {
          parameter: paramName,
          expected: `>= ${schema.minimum}`,
          received: paramValue.toString(),
          message: `Parameter '${paramName}' must be >= ${schema.minimum}`
        };
      }

      if (schema.maximum !== undefined && paramValue > schema.maximum) {
        return {
          parameter: paramName,
          expected: `<= ${schema.maximum}`,
          received: paramValue.toString(),
          message: `Parameter '${paramName}' must be <= ${schema.maximum}`
        };
      }
      break;

    case 'boolean':
      if (typeof paramValue !== 'boolean') {
        return {
          parameter: paramName,
          expected: 'boolean',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a boolean (true or false)`
        };
      }
      break;

    case 'array':
      if (!Array.isArray(paramValue)) {
        return {
          parameter: paramName,
          expected: 'array',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be an array`
        };
      }
      break;

    case 'object':
      if (typeof paramValue !== 'object' || Array.isArray(paramValue)) {
        return {
          parameter: paramName,
          expected: 'object',
          received: Array.isArray(paramValue) ? 'array' : typeof paramValue,
          message: `Parameter '${paramName}' must be an object`
        };
      }
      break;
  }

  return null;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
}

// ===================
// RESPONSE FORMATTING
// ===================

/**
 * Format tool response for Claude consumption
 */
export function formatToolResponse(toolName: string, data: any): string {
  if (!data) {
    return formatEmptyResponse(toolName);
  }

  try {
    switch (toolName) {
      case 'getUserProfile':
        return formatProfileResponse(data);
      
      case 'getUserSettings':
        return formatSettingsResponse(data);
      
      case 'getUserPreferences':
        return formatPreferencesResponse(data);
      
      case 'getTripHistory':
        return formatTripHistoryResponse(data);
      
      case 'getVehicleData':
        return formatVehicleResponse(data);
      
      case 'getFuelData':
        return formatFuelDataResponse(data);
      
      case 'getTripPlans':
        return formatTripPlansResponse(data);
      
      default:
        return formatGenericResponse(toolName, data);
    }
  } catch (error) {
    logger.error('Error formatting tool response', { toolName, error });
    return `Retrieved data for ${toolName} but encountered formatting issues. Raw data available for analysis.`;
  }
}

/**
 * Format empty/null response
 */
function formatEmptyResponse(toolName: string): string {
  const responseMap: Record<string, string> = {
    getUserProfile: "No profile information found for this user.",
    getUserSettings: "No custom settings found - using default settings.",
    getUserPreferences: "No custom preferences found - using default preferences.",
    getTripHistory: "No trips found for the specified criteria.",
    getVehicleData: "No vehicles found for this user.",
    getFuelData: "No fuel records found for the specified criteria.",
    getTripPlans: "No upcoming trip plans found."
  };

  return responseMap[toolName] || `No data found for ${toolName}.`;
}

/**
 * Format profile response for Claude
 */
function formatProfileResponse(profile: any): string {
  const parts = [`User Profile for ${profile.full_name || profile.email || 'User'}:`];
  
  if (profile.personal_info?.occupation) {
    parts.push(`• Occupation: ${profile.personal_info.occupation}`);
  }
  
  if (profile.financial_goals) {
    parts.push('• Financial Goals:');
    if (profile.financial_goals.emergency_fund_target) {
      parts.push(`  - Emergency Fund Target: $${profile.financial_goals.emergency_fund_target.toLocaleString()}`);
    }
    if (profile.financial_goals.monthly_savings_goal) {
      parts.push(`  - Monthly Savings Goal: $${profile.financial_goals.monthly_savings_goal.toLocaleString()}`);
    }
  }
  
  if (profile.statistics) {
    parts.push('• Account Statistics:');
    parts.push(`  - Total Expenses: $${profile.statistics.total_expenses.toLocaleString()}`);
    parts.push(`  - Total Income: $${profile.statistics.total_income.toLocaleString()}`);
    parts.push(`  - Total Trips: ${profile.statistics.total_trips}`);
    parts.push(`  - Account Age: ${profile.statistics.account_age_days} days`);
  }

  return parts.join('\n');
}

/**
 * Format settings response for Claude
 */
function formatSettingsResponse(settings: any): string {
  const parts = ['User Settings:'];
  
  if (settings.notifications) {
    parts.push('• Notifications:');
    parts.push(`  - Email: ${settings.notifications.email_enabled ? 'Enabled' : 'Disabled'}`);
    parts.push(`  - Push: ${settings.notifications.push_enabled ? 'Enabled' : 'Disabled'}`);
    parts.push(`  - Budget Alerts: ${settings.notifications.budget_alerts ? 'Enabled' : 'Disabled'}`);
  }
  
  if (settings.display) {
    parts.push('• Display:');
    parts.push(`  - Theme: ${settings.display.theme}`);
    parts.push(`  - Currency: ${settings.display.currency}`);
    parts.push(`  - Language: ${settings.display.language}`);
  }

  return parts.join('\n');
}

/**
 * Format trip history response for Claude
 */
function formatTripHistoryResponse(trips: any[]): string {
  if (!trips || trips.length === 0) {
    return "No trips found for the specified criteria.";
  }

  const parts = [`Found ${trips.length} trip(s):`];
  
  trips.slice(0, 5).forEach((trip, index) => {
    parts.push(`\n${index + 1}. ${trip.title}`);
    parts.push(`   • Type: ${trip.trip_type}`);
    parts.push(`   • Distance: ${trip.distance_miles} miles`);
    parts.push(`   • Date: ${new Date(trip.start_time).toLocaleDateString()}`);
    if (trip.cost_breakdown?.total > 0) {
      parts.push(`   • Total Cost: $${trip.cost_breakdown.total.toFixed(2)}`);
    }
  });

  if (trips.length > 5) {
    parts.push(`\n... and ${trips.length - 5} more trips`);
  }

  return parts.join('\n');
}

/**
 * Format vehicle response for Claude  
 */
function formatVehicleResponse(vehicles: any): string {
  const vehicleArray = Array.isArray(vehicles) ? vehicles : [vehicles];
  
  if (vehicleArray.length === 0) {
    return "No vehicles found.";
  }

  const parts = [`Found ${vehicleArray.length} vehicle(s):`];
  
  vehicleArray.forEach((vehicle, index) => {
    parts.push(`\n${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    if (vehicle.color) parts.push(`   • Color: ${vehicle.color}`);
    if (vehicle.avg_mpg) parts.push(`   • Average MPG: ${vehicle.avg_mpg}`);
    if (vehicle.maintenance?.next_service_due) {
      parts.push(`   • Next Service: ${new Date(vehicle.maintenance.next_service_due).toLocaleDateString()}`);
    }
    if (vehicle.is_primary) parts.push(`   • Primary Vehicle`);
  });

  return parts.join('\n');
}

/**
 * Format fuel data response for Claude
 */
function formatFuelDataResponse(fuelData: any): string {
  const { records, summary, efficiency, stations } = fuelData;
  
  const parts = [`Fuel Data Summary:`];
  
  if (summary) {
    parts.push(`• Total Records: ${summary.records_count}`);
    parts.push(`• Total Cost: $${summary.total_cost.toFixed(2)}`);
    parts.push(`• Total Gallons: ${summary.total_gallons.toFixed(1)}`);
    parts.push(`• Average Price/Gallon: $${summary.average_price_per_gallon.toFixed(2)}`);
  }
  
  if (efficiency) {
    parts.push(`• Fuel Efficiency:`);
    parts.push(`  - Average MPG: ${efficiency.avg_mpg}`);
    parts.push(`  - Best MPG: ${efficiency.best_mpg}`);
    parts.push(`  - Worst MPG: ${efficiency.worst_mpg}`);
  }
  
  if (stations && stations.length > 0) {
    parts.push(`• Top Fuel Stations:`);
    stations.slice(0, 3).forEach(station => {
      parts.push(`  - ${station.name}: ${station.visit_count} visits, avg $${station.avg_price}/gal`);
    });
  }

  return parts.join('\n');
}

/**
 * Format trip plans response for Claude
 */
function formatTripPlansResponse(plans: any[]): string {
  if (!plans || plans.length === 0) {
    return "No upcoming trip plans found.";
  }

  const parts = [`Found ${plans.length} upcoming trip plan(s):`];
  
  plans.forEach((plan, index) => {
    parts.push(`\n${index + 1}. ${plan.title}`);
    parts.push(`   • Planned Date: ${new Date(plan.planned_date).toLocaleDateString()}`);
    parts.push(`   • Status: ${plan.status}`);
    if (plan.estimated_distance > 0) {
      parts.push(`   • Distance: ${plan.estimated_distance} miles`);
    }
    if (plan.estimated_cost?.total > 0) {
      parts.push(`   • Estimated Cost: $${plan.estimated_cost.total.toFixed(2)}`);
    }
  });

  return parts.join('\n');
}

/**
 * Generic response formatter
 */
function formatGenericResponse(toolName: string, data: any): string {
  if (Array.isArray(data)) {
    return `Retrieved ${data.length} items from ${toolName}.`;
  } else if (typeof data === 'object') {
    const keys = Object.keys(data);
    return `Retrieved ${toolName} data with ${keys.length} properties.`;
  } else {
    return `Retrieved data from ${toolName}.`;
  }
}

/**
 * Format preferences response for Claude
 */
function formatPreferencesResponse(preferences: any): string {
  const parts = ['User Preferences:'];
  
  if (preferences.financial?.default_budget_categories) {
    parts.push(`• Budget Categories: ${preferences.financial.default_budget_categories.join(', ')}`);
  }
  
  if (preferences.travel?.preferred_fuel_stations) {
    parts.push(`• Preferred Gas Stations: ${preferences.travel.preferred_fuel_stations.join(', ')}`);
  }
  
  if (preferences.interface?.dashboard_widgets) {
    parts.push(`• Dashboard Widgets: ${preferences.interface.dashboard_widgets.join(', ')}`);
  }

  return parts.join('\n');
}

// ===================
// ANALYTICS & LOGGING
// ===================

/**
 * Log tool usage for analytics (placeholder - integrate with your analytics system)
 */
async function logToolUsage(analytics: ToolUsageAnalytics): Promise<void> {
  try {
    // Log to console for development
    logger.info('Tool usage analytics', analytics);
    
    // TODO: Send to analytics service (e.g., Mixpanel, PostHog, custom endpoint)
    // await analyticsService.track('tool_execution', analytics);
    
    // TODO: Store in database for usage patterns
    // await supabase.from('tool_usage_logs').insert(analytics);
    
  } catch (error) {
    logger.error('Failed to log tool usage', { error, analytics });
  }
}

export default {
  executeToolCall,
  formatToolResponse,
  validateToolParams
};