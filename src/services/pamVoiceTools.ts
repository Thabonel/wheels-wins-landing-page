/**
 * PAM Voice Tool Definitions (OpenAI Format)
 *
 * All 47 PAM tools converted from Claude format to OpenAI function calling format.
 * These tools enable GPT-realtime to control the entire Wheels & Wins platform via voice.
 */

export interface PAMTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Build complete PAM tool definitions for OpenAI Realtime API
 */
export function buildPAMTools(): PAMTool[] {
  return [
    // ==============================
    // BUDGET TOOLS (10)
    // ==============================
    {
      name: 'create_expense',
      description: 'Add an expense to the user\'s budget tracker. Use this when the user mentions spending money on something.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount spent (must be positive)' },
          category: { type: 'string', description: 'Category: gas, food, campground, maintenance, etc.' },
          description: { type: 'string', description: 'Optional description of what was purchased' },
          date: { type: 'string', description: 'Optional date in ISO format (defaults to today)' }
        },
        required: ['amount', 'category']
      }
    },
    {
      name: 'track_savings',
      description: 'Log money saved by PAM for the user. Use this when you find a deal, cheaper option, or help save money.',
      parameters: {
        type: 'object',
        properties: {
          amount_saved: { type: 'number', description: 'Amount of money saved' },
          category: { type: 'string', description: 'What was saved on (gas, campground, route, etc.)' },
          description: { type: 'string', description: 'How the money was saved' },
          event_type: { type: 'string', enum: ['gas', 'campground', 'route', 'other'], description: 'Type of savings' }
        },
        required: ['amount_saved', 'category']
      }
    },
    {
      name: 'analyze_budget',
      description: 'Analyze the user\'s budget and spending patterns. Use when user asks how their budget is doing.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'get_spending_summary',
      description: 'Get a summary of user\'s spending for a time period. Use when user asks what they spent.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Number of days to look back (default: 30)' },
          category: { type: 'string', description: 'Optional category filter' }
        },
        required: []
      }
    },
    {
      name: 'update_budget',
      description: 'Set or update a budget category amount. Use when user wants to set a budget.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Budget category' },
          amount: { type: 'number', description: 'Monthly budget amount' }
        },
        required: ['category', 'amount']
      }
    },
    {
      name: 'compare_vs_budget',
      description: 'Compare actual spending vs budgeted amounts. Use when user asks if they\'re on track.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'predict_end_of_month',
      description: 'Forecast end-of-month spending based on current trends. Use for predictions.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'find_savings_opportunities',
      description: 'Find ways the user can save money. Use when user asks how to save or cut costs.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'categorize_transaction',
      description: 'Auto-categorize an expense based on description. Use when category is unclear.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Transaction description' },
          amount: { type: 'number', description: 'Transaction amount' }
        },
        required: ['description']
      }
    },
    {
      name: 'export_budget_report',
      description: 'Generate and export a budget report. Use when user wants a report.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv', 'summary'], description: 'Export format' }
        },
        required: []
      }
    },

    // ==============================
    // TRIP TOOLS (12)
    // ==============================
    {
      name: 'plan_trip',
      description: 'Plan a multi-stop trip with budget constraints. Use when user wants to plan a road trip.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Starting location' },
          destination: { type: 'string', description: 'End location' },
          budget: { type: 'number', description: 'Optional budget limit in USD' },
          stops: { type: 'array', items: { type: 'string' }, description: 'Optional intermediate stops' },
          start_date: { type: 'string', description: 'Optional start date in ISO format' }
        },
        required: ['origin', 'destination']
      }
    },
    {
      name: 'find_rv_parks',
      description: 'Find RV parks and campgrounds near a location. Use when user asks for campgrounds.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location to search near' },
          radius_miles: { type: 'integer', description: 'Search radius (default: 50)' },
          amenities: { type: 'array', items: { type: 'string' }, description: 'Required amenities' },
          max_price: { type: 'number', description: 'Maximum price per night' }
        },
        required: ['location']
      }
    },
    {
      name: 'get_weather_forecast',
      description: 'Get weather forecast for a location. Use when user asks about weather.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location for forecast' },
          days: { type: 'integer', description: 'Number of days (default: 7, max: 14)' }
        },
        required: ['location']
      }
    },
    {
      name: 'calculate_gas_cost',
      description: 'Calculate estimated gas cost for a trip. Automatically formats response in user\'s preferred units (imperial/metric). Use when user asks about fuel costs.',
      parameters: {
        type: 'object',
        properties: {
          distance_miles: { type: 'number', description: 'Trip distance in miles (for US/imperial users)' },
          distance_km: { type: 'number', description: 'Trip distance in kilometers (for international/metric users)' },
          mpg: { type: 'number', description: 'Vehicle MPG (optional, uses stored vehicle data if not provided)' },
          gas_price: { type: 'number', description: 'Price per gallon (optional, default: $3.50)' }
        },
        required: []
      }
    },
    {
      name: 'find_cheap_gas',
      description: 'Find cheapest gas stations near a location. Use when user wants to find cheap gas.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location to search near' },
          radius_miles: { type: 'integer', description: 'Search radius (default: 25)' },
          fuel_type: { type: 'string', enum: ['regular', 'diesel', 'premium'], description: 'Type of fuel' }
        },
        required: ['location']
      }
    },
    {
      name: 'optimize_route',
      description: 'Optimize route for cost and time efficiency. Use when user wants the best route.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Starting location' },
          destination: { type: 'string', description: 'End location' },
          stops: { type: 'array', items: { type: 'string' }, description: 'Intermediate stops' },
          optimization_type: { type: 'string', enum: ['cost', 'time', 'balanced'], description: 'Optimization priority' }
        },
        required: ['origin', 'destination']
      }
    },
    {
      name: 'get_road_conditions',
      description: 'Check road conditions and traffic alerts. Use when user asks about road conditions.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location or route to check' },
          route: { type: 'string', description: 'Optional specific route number (e.g., I-80)' }
        },
        required: ['location']
      }
    },
    {
      name: 'find_attractions',
      description: 'Find attractions and points of interest near a location. Use when user wants things to see.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location to search near' },
          radius_miles: { type: 'integer', description: 'Search radius (default: 50)' },
          categories: { type: 'array', items: { type: 'string' }, description: 'Categories (national_parks, museums, etc.)' }
        },
        required: ['location']
      }
    },
    {
      name: 'estimate_travel_time',
      description: 'Estimate travel time with breaks. Use when user asks how long a trip will take.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Starting location' },
          destination: { type: 'string', description: 'End location' },
          distance_miles: { type: 'number', description: 'Optional distance (calculated if not provided)' },
          include_breaks: { type: 'boolean', description: 'Include rest stops (default: true)' }
        },
        required: ['origin', 'destination']
      }
    },
    {
      name: 'save_favorite_spot',
      description: 'Save a location as a favorite. Use when user wants to bookmark a place.',
      parameters: {
        type: 'object',
        properties: {
          location_name: { type: 'string', description: 'Name of the location' },
          location_address: { type: 'string', description: 'Address or coordinates' },
          category: { type: 'string', description: 'Category (campground, restaurant, attraction, etc.)' },
          notes: { type: 'string', description: 'Optional personal notes' },
          rating: { type: 'integer', description: 'Optional rating (1-5)' }
        },
        required: ['location_name', 'location_address']
      }
    },
    {
      name: 'update_vehicle_fuel_consumption',
      description: 'Update vehicle fuel consumption data. Use when user tells you their vehicle\'s MPG or liters per 100km.',
      parameters: {
        type: 'object',
        properties: {
          mpg: { type: 'number', description: 'Fuel consumption in miles per gallon (MPG)' },
          l_per_100km: { type: 'number', description: 'Fuel consumption in liters per 100 kilometers' },
          vehicle_id: { type: 'string', description: 'Specific vehicle ID (optional, uses primary vehicle if not provided)' }
        },
        required: []
      }
    },
    {
      name: 'create_vehicle',
      description: 'Create a new vehicle for the user. Use when user wants to add a vehicle to their garage.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Vehicle nickname (e.g., \'My RV\', \'Blue Truck\')' },
          make: { type: 'string', description: 'Manufacturer (e.g., \'Ford\', \'RAM\', \'Winnebago\')' },
          model: { type: 'string', description: 'Model name (e.g., \'F-350\', \'1500\', \'Vista\')' },
          year: { type: 'integer', description: 'Year of manufacture' },
          vehicle_type: {
            type: 'string',
            enum: ['rv', 'motorhome', 'travel_trailer', 'fifth_wheel', 'truck', 'car', 'motorcycle', 'boat'],
            description: 'Type of vehicle (default: rv)'
          },
          fuel_type: {
            type: 'string',
            enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'propane'],
            description: 'Type of fuel (default: gasoline)'
          },
          set_as_primary: { type: 'boolean', description: 'Make this the primary vehicle (default: true)' }
        },
        required: ['name']
      }
    },

    // ==============================
    // SOCIAL TOOLS (10)
    // ==============================
    {
      name: 'create_post',
      description: 'Create a social post to share with the community. Use when user wants to post updates.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Post content' },
          title: { type: 'string', description: 'Optional post title' },
          location: { type: 'string', description: 'Optional location tag' },
          image_url: { type: 'string', description: 'Optional image URL' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' }
        },
        required: ['content']
      }
    },
    {
      name: 'message_friend',
      description: 'Send a direct message to another user. Use when user wants to DM someone.',
      parameters: {
        type: 'object',
        properties: {
          recipient_id: { type: 'string', description: 'UUID of the recipient' },
          message: { type: 'string', description: 'Message content' }
        },
        required: ['recipient_id', 'message']
      }
    },
    {
      name: 'comment_on_post',
      description: 'Add a comment to a post. Use when user wants to comment on community posts.',
      parameters: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'UUID of the post' },
          comment: { type: 'string', description: 'Comment content' }
        },
        required: ['post_id', 'comment']
      }
    },
    {
      name: 'search_posts',
      description: 'Search for posts in the community. Use when user wants to find specific content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags to filter by' },
          location: { type: 'string', description: 'Optional location filter' },
          limit: { type: 'integer', description: 'Max results (default: 20)' }
        },
        required: ['query']
      }
    },
    {
      name: 'get_feed',
      description: 'Get user\'s social feed. Use when user wants to see community posts.',
      parameters: {
        type: 'object',
        properties: {
          filter_type: { type: 'string', enum: ['all', 'friends', 'following'], description: 'Feed filter type' },
          limit: { type: 'integer', description: 'Max posts (default: 20)' },
          offset: { type: 'integer', description: 'Pagination offset' }
        },
        required: []
      }
    },
    {
      name: 'like_post',
      description: 'Like or unlike a post. Use when user wants to react to posts.',
      parameters: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'UUID of the post' },
          unlike: { type: 'boolean', description: 'Set to true to unlike (default: false)' }
        },
        required: ['post_id']
      }
    },
    {
      name: 'follow_user',
      description: 'Follow or unfollow another user. Use when user wants to connect with RVers.',
      parameters: {
        type: 'object',
        properties: {
          target_user_id: { type: 'string', description: 'UUID of user to follow/unfollow' },
          unfollow: { type: 'boolean', description: 'Set to true to unfollow (default: false)' }
        },
        required: ['target_user_id']
      }
    },
    {
      name: 'share_location',
      description: 'Share current location or spot with community. Use when user wants to share where they are.',
      parameters: {
        type: 'object',
        properties: {
          location_name: { type: 'string', description: 'Name of the location' },
          latitude: { type: 'number', description: 'Location latitude' },
          longitude: { type: 'number', description: 'Location longitude' },
          description: { type: 'string', description: 'Optional description' },
          is_public: { type: 'boolean', description: 'Public visibility (default: true)' }
        },
        required: ['location_name', 'latitude', 'longitude']
      }
    },
    {
      name: 'find_nearby_rvers',
      description: 'Find RVers near a location. Use when user wants to discover local community.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Search center latitude' },
          longitude: { type: 'number', description: 'Search center longitude' },
          radius_miles: { type: 'integer', description: 'Search radius (default: 50)' },
          limit: { type: 'integer', description: 'Max results (default: 20)' }
        },
        required: ['latitude', 'longitude']
      }
    },
    {
      name: 'create_event',
      description: 'Create a community meetup event. Use when user wants to plan gatherings.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description' },
          event_date: { type: 'string', description: 'Event date/time (ISO format)' },
          location: { type: 'string', description: 'Event location name' },
          latitude: { type: 'number', description: 'Optional location latitude' },
          longitude: { type: 'number', description: 'Optional location longitude' },
          max_attendees: { type: 'integer', description: 'Optional max attendees' }
        },
        required: ['title', 'description', 'event_date', 'location']
      }
    },

    // ==============================
    // SHOP TOOLS (5)
    // ==============================
    {
      name: 'search_products',
      description: 'Search for RV parts and gear in the shop. Use when user wants to find products.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          category: { type: 'string', description: 'Optional category filter' },
          max_price: { type: 'number', description: 'Optional max price filter' },
          min_rating: { type: 'number', description: 'Optional min rating (1-5)' },
          limit: { type: 'integer', description: 'Max results (default: 20)' }
        },
        required: ['query']
      }
    },
    {
      name: 'add_to_cart',
      description: 'Add product to shopping cart. Use when user wants to purchase items.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'UUID of the product' },
          quantity: { type: 'integer', description: 'Quantity to add (default: 1)' }
        },
        required: ['product_id']
      }
    },
    {
      name: 'get_cart',
      description: 'View shopping cart contents. Use when user wants to see their cart.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'checkout',
      description: 'Complete purchase from cart. Use when user wants to checkout.',
      parameters: {
        type: 'object',
        properties: {
          payment_method_id: { type: 'string', description: 'Optional payment method ID' },
          shipping_address_id: { type: 'string', description: 'Optional shipping address ID' }
        },
        required: []
      }
    },
    {
      name: 'track_order',
      description: 'Track order status and shipping. Use when user wants to check order status.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Optional order UUID' },
          order_number: { type: 'string', description: 'Optional order number (e.g., ORD-12345)' }
        },
        required: []
      }
    },

    // ==============================
    // PROFILE TOOLS (6)
    // ==============================
    {
      name: 'update_profile',
      description: 'Update user profile information. Use when user wants to modify their profile.',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Optional new username' },
          bio: { type: 'string', description: 'Optional bio text' },
          avatar_url: { type: 'string', description: 'Optional avatar image URL' },
          location: { type: 'string', description: 'Optional location' },
          rv_type: { type: 'string', description: 'Optional RV type' },
          rv_year: { type: 'integer', description: 'Optional RV year' }
        },
        required: []
      }
    },
    {
      name: 'update_settings',
      description: 'Update user settings and preferences. Use when user wants to change settings.',
      parameters: {
        type: 'object',
        properties: {
          email_notifications: { type: 'boolean', description: 'Email notification setting' },
          push_notifications: { type: 'boolean', description: 'Push notification setting' },
          theme: { type: 'string', enum: ['light', 'dark', 'auto'], description: 'Theme preference' },
          language: { type: 'string', description: 'Language code' },
          budget_alerts: { type: 'boolean', description: 'Budget alert setting' },
          trip_reminders: { type: 'boolean', description: 'Trip reminder setting' }
        },
        required: []
      }
    },
    {
      name: 'manage_privacy',
      description: 'Manage privacy and data sharing settings. Use when user wants to control privacy.',
      parameters: {
        type: 'object',
        properties: {
          profile_visibility: { type: 'string', enum: ['public', 'friends', 'private'], description: 'Profile visibility' },
          location_sharing: { type: 'boolean', description: 'Whether to share location' },
          show_activity: { type: 'boolean', description: 'Whether to show activity status' },
          allow_messages: { type: 'string', enum: ['everyone', 'friends', 'none'], description: 'Who can message' },
          data_collection: { type: 'boolean', description: 'Allow data collection for analytics' }
        },
        required: []
      }
    },
    {
      name: 'get_user_stats',
      description: 'Get user statistics and activity summary. Use when user wants to see their stats.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'export_data',
      description: 'Export all user data (GDPR compliance). Use when user wants to download their data.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },

    // ==============================
    // ADMIN TOOLS (2)
    // ==============================
    {
      name: 'add_knowledge',
      description: 'ADMIN ONLY: Store knowledge in PAM\'s long-term memory. Use when admin says \'remember\', \'PAM learn\', or \'note that\'.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title for the knowledge' },
          content: { type: 'string', description: 'The knowledge content to remember' },
          knowledge_type: {
            type: 'string',
            enum: ['location_tip', 'travel_rule', 'seasonal_advice', 'general_knowledge', 'policy', 'warning'],
            description: 'Type of knowledge'
          },
          category: {
            type: 'string',
            enum: ['travel', 'budget', 'social', 'shop', 'general'],
            description: 'Category'
          },
          location_context: { type: 'string', description: 'Optional: location this applies to' },
          date_context: { type: 'string', description: 'Optional: season/date context (e.g., \'May-August\', \'Winter\')' },
          priority: { type: 'integer', minimum: 1, maximum: 10, description: 'Priority 1-10 (default: 5)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional: tags for searching' }
        },
        required: ['title', 'content', 'knowledge_type', 'category']
      }
    },
    {
      name: 'search_knowledge',
      description: 'Search PAM\'s long-term knowledge base for relevant information. Use automatically when answering user queries.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text search query' },
          category: { type: 'string', enum: ['travel', 'budget', 'social', 'shop', 'general'], description: 'Filter by category' },
          knowledge_type: { type: 'string', description: 'Filter by type' },
          location_context: { type: 'string', description: 'Filter by location' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          min_priority: { type: 'integer', minimum: 1, maximum: 10, description: 'Minimum priority (default: 1)' },
          limit: { type: 'integer', description: 'Max results (default: 10)' }
        },
        required: []
      }
    }
  ];
}
