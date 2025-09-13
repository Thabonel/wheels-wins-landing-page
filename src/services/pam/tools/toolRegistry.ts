/**
 * PAM Tool Registry - Complete tool definitions for Claude API integration
 * 
 * This registry defines all available tools that Claude can use to access
 * user data and perform calculations within the Wheels & Wins platform.
 * Each tool follows Anthropic's tool definition format with JSON Schema.
 */

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: {
    type: string;
  };
  format?: string;
  minimum?: number;
  maximum?: number;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
  category: 'financial' | 'profile' | 'calendar' | 'trip' | 'vehicle' | 'settings';
  examples?: string[];
}

/**
 * Complete PAM Tool Registry
 * Categories: financial, profile, calendar, trip, vehicle, settings
 */
export const PAM_TOOLS: ToolDefinition[] = [
  // ===================
  // FINANCIAL TOOLS
  // ===================
  {
    name: 'getUserExpenses',
    description: 'Retrieve user expense data with optional filtering by date range, category, or amount. Use this to analyze spending patterns, categorize expenses, or generate financial reports.',
    category: 'financial',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          format: 'date',
          description: 'Start date for expense range (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          format: 'date',
          description: 'End date for expense range (YYYY-MM-DD format)'
        },
        category: {
          type: 'string',
          description: 'Filter by expense category',
          enum: [
            'food_dining',
            'transportation',
            'entertainment',
            'utilities',
            'healthcare',
            'shopping',
            'travel',
            'fuel',
            'maintenance',
            'insurance',
            'other'
          ]
        },
        min_amount: {
          type: 'number',
          description: 'Minimum expense amount to include',
          minimum: 0
        },
        max_amount: {
          type: 'number',
          description: 'Maximum expense amount to include',
          minimum: 0
        },
        limit: {
          type: 'number',
          description: 'Maximum number of expenses to return',
          minimum: 1,
          maximum: 1000
        }
      },
      additionalProperties: false
    },
    examples: [
      'Show me my expenses from last month',
      'What did I spend on food this week?',
      'Find all expenses over $100 in December'
    ]
  },

  {
    name: 'getUserBudgets',
    description: 'Get user budget information including budget limits, current spending, and remaining amounts for different categories. Essential for budget tracking and spending analysis.',
    category: 'financial',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Specific budget category to retrieve',
          enum: [
            'food_dining',
            'transportation',
            'entertainment',
            'utilities',
            'healthcare',
            'shopping',
            'travel',
            'fuel',
            'maintenance',
            'total_monthly'
          ]
        },
        month: {
          type: 'string',
          format: 'date',
          description: 'Month for budget data (YYYY-MM format, defaults to current month)'
        },
        include_history: {
          type: 'boolean',
          description: 'Include historical budget performance data'
        }
      },
      additionalProperties: false
    },
    examples: [
      'How much budget do I have left this month?',
      'Show me my food budget status',
      'Am I over budget in any category?'
    ]
  },

  {
    name: 'getIncomeData',
    description: 'Retrieve user income information including salary, side income, and other revenue sources. Use for financial planning and income vs expense analysis.',
    category: 'financial',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          format: 'date',
          description: 'Start date for income range (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          format: 'date',
          description: 'End date for income range (YYYY-MM-DD format)'
        },
        income_type: {
          type: 'string',
          description: 'Type of income to retrieve',
          enum: ['salary', 'freelance', 'investment', 'side_hustle', 'other', 'all']
        },
        include_projections: {
          type: 'boolean',
          description: 'Include projected future income based on current patterns'
        }
      },
      additionalProperties: false
    },
    examples: [
      'What is my total income this month?',
      'Show me my freelance income vs salary',
      'Project my income for next quarter'
    ]
  },

  {
    name: 'calculateSavings',
    description: 'Calculate savings data including savings rate, emergency fund status, and savings goals progress. Essential for financial health assessment.',
    category: 'financial',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for savings calculation',
          enum: ['week', 'month', 'quarter', 'year', 'all_time']
        },
        include_goals: {
          type: 'boolean',
          description: 'Include savings goals progress in calculation'
        },
        goal_category: {
          type: 'string',
          description: 'Specific savings goal to analyze',
          enum: ['emergency_fund', 'vacation', 'car_purchase', 'home_down_payment', 'retirement', 'custom']
        }
      },
      required: ['period'],
      additionalProperties: false
    },
    examples: [
      'How much have I saved this month?',
      'What is my savings rate?',
      'How close am I to my emergency fund goal?'
    ]
  },

  // ===================
  // PROFILE TOOLS  
  // ===================
  {
    name: 'getUserProfile',
    description: 'Get comprehensive user profile information including personal details, preferences, financial goals, and account settings.',
    category: 'profile',
    input_schema: {
      type: 'object',
      properties: {
        include_financial_goals: {
          type: 'boolean',
          description: 'Include financial goals and targets in profile data'
        },
        include_preferences: {
          type: 'boolean',
          description: 'Include user preferences and notification settings'
        },
        include_statistics: {
          type: 'boolean',
          description: 'Include account usage statistics and metrics'
        }
      },
      additionalProperties: false
    },
    examples: [
      'Show me my profile information',
      'What are my financial goals?',
      'Display my account preferences'
    ]
  },

  {
    name: 'getUserSettings',
    description: 'Retrieve and manage user application settings including notifications, privacy preferences, currency, and display options.',
    category: 'settings',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Specific settings category to retrieve',
          enum: [
            'notifications',
            'privacy',
            'display',
            'currency',
            'language',
            'integrations',
            'security',
            'all'
          ]
        },
        include_defaults: {
          type: 'boolean',
          description: 'Include default values for comparison'
        }
      },
      additionalProperties: false
    },
    examples: [
      'What are my notification settings?',
      'Show me my privacy preferences',
      'What currency am I using?'
    ]
  },

  // ===================
  // CALENDAR TOOLS
  // ===================
  {
    name: 'getUpcomingEvents',
    description: 'Retrieve upcoming calendar events including trips, appointments, bill due dates, and financial deadlines.',
    category: 'calendar',
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: {
          type: 'number',
          description: 'Number of days ahead to look for events',
          minimum: 1,
          maximum: 365
        },
        event_type: {
          type: 'string',
          description: 'Type of events to retrieve',
          enum: [
            'trips',
            'bill_due_dates',
            'financial_goals',
            'maintenance_reminders',
            'appointments',
            'all'
          ]
        },
        include_recurring: {
          type: 'boolean',
          description: 'Include recurring events in results'
        }
      },
      additionalProperties: false
    },
    examples: [
      'What events do I have coming up?',
      'When are my bills due this month?',
      'Show me upcoming trips'
    ]
  },

  // ===================
  // TRIP/TRAVEL TOOLS
  // ===================
  {
    name: 'getTripHistory',
    description: 'Get historical trip data including destinations, costs, fuel consumption, and travel patterns. Use for travel expense analysis.',
    category: 'trip',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          format: 'date',
          description: 'Start date for trip history (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          format: 'date',
          description: 'End date for trip history (YYYY-MM-DD format)'
        },
        trip_type: {
          type: 'string',
          description: 'Type of trips to include',
          enum: ['business', 'personal', 'commute', 'leisure', 'all']
        },
        include_costs: {
          type: 'boolean',
          description: 'Include trip cost breakdown and analysis'
        },
        include_fuel_data: {
          type: 'boolean',
          description: 'Include fuel consumption and efficiency data'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of trips to return',
          minimum: 1,
          maximum: 500
        }
      },
      additionalProperties: false
    },
    examples: [
      'Show me my recent trips',
      'How much did I spend on travel last month?',
      'What are my most expensive trips?'
    ]
  },

  // ===================
  // VEHICLE TOOLS
  // ===================
  {
    name: 'getVehicleData',
    description: 'Retrieve vehicle information including make, model, maintenance history, insurance details, and performance metrics.',
    category: 'vehicle',
    input_schema: {
      type: 'object',
      properties: {
        vehicle_id: {
          type: 'string',
          description: 'Specific vehicle ID to retrieve (optional - defaults to primary vehicle)'
        },
        include_maintenance: {
          type: 'boolean',
          description: 'Include maintenance history and upcoming service needs'
        },
        include_insurance: {
          type: 'boolean',
          description: 'Include insurance information and coverage details'
        },
        include_performance: {
          type: 'boolean',
          description: 'Include performance metrics like fuel efficiency'
        }
      },
      additionalProperties: false
    },
    examples: [
      'Tell me about my car',
      'When is my next maintenance due?',
      'What is my car\'s fuel efficiency?'
    ]
  },

  {
    name: 'getFuelData',
    description: 'Get fuel consumption data, costs, station preferences, and efficiency analysis. Essential for travel cost optimization.',
    category: 'vehicle',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          format: 'date',
          description: 'Start date for fuel data (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          format: 'date',
          description: 'End date for fuel data (YYYY-MM-DD format)'
        },
        vehicle_id: {
          type: 'string',
          description: 'Specific vehicle to analyze (optional)'
        },
        include_stations: {
          type: 'boolean',
          description: 'Include fuel station preferences and price comparisons'
        },
        include_efficiency: {
          type: 'boolean',
          description: 'Include fuel efficiency calculations and trends'
        },
        analysis_type: {
          type: 'string',
          description: 'Type of fuel analysis to perform',
          enum: ['cost_summary', 'efficiency_trends', 'station_comparison', 'monthly_breakdown', 'all']
        }
      },
      additionalProperties: false
    },
    examples: [
      'How much did I spend on fuel this month?',
      'What is my average fuel efficiency?',
      'Which gas stations do I use most?'
    ]
  }
];

/**
 * Tool Categories for organization
 */
export const TOOL_CATEGORIES = {
  financial: 'Financial Data & Analysis',
  profile: 'User Profile & Account',
  calendar: 'Calendar & Events',
  trip: 'Travel & Trip Planning',
  vehicle: 'Vehicle & Transportation',
  settings: 'Settings & Preferences'
} as const;

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES): ToolDefinition[] {
  return PAM_TOOLS.filter(tool => tool.category === category);
}

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return PAM_TOOLS.find(tool => tool.name === name);
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return PAM_TOOLS.map(tool => tool.name);
}

/**
 * Validate tool definition schema
 */
export function validateToolDefinition(tool: ToolDefinition): boolean {
  try {
    // Basic required fields
    if (!tool.name || typeof tool.name !== 'string') return false;
    if (!tool.description || typeof tool.description !== 'string') return false;
    if (!tool.category || !Object.keys(TOOL_CATEGORIES).includes(tool.category)) return false;
    
    // Input schema validation
    if (!tool.input_schema || typeof tool.input_schema !== 'object') return false;
    if (tool.input_schema.type !== 'object') return false;
    if (!tool.input_schema.properties || typeof tool.input_schema.properties !== 'object') return false;
    
    // Validate each property
    for (const [propName, propDef] of Object.entries(tool.input_schema.properties)) {
      if (!propDef.type || typeof propDef.type !== 'string') return false;
      if (!propDef.description || typeof propDef.description !== 'string') return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get tools formatted for Claude API
 */
export function getToolsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}> {
  return PAM_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }));
}

/**
 * Tool registry statistics
 */
export function getToolRegistryStats() {
  const stats = {
    total_tools: PAM_TOOLS.length,
    by_category: {} as Record<string, number>,
    validation_status: {
      valid: 0,
      invalid: 0
    }
  };
  
  // Count by category and validate
  PAM_TOOLS.forEach(tool => {
    stats.by_category[tool.category] = (stats.by_category[tool.category] || 0) + 1;
    
    if (validateToolDefinition(tool)) {
      stats.validation_status.valid++;
    } else {
      stats.validation_status.invalid++;
    }
  });
  
  return stats;
}

export default PAM_TOOLS;