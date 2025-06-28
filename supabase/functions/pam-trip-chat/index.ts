import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PAMRequest {
  message: string;
  context: any;
  suggestions: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context, suggestions }: PAMRequest = await req.json()

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Process the message with PAM logic
    const response = await processMessage(message, context, suggestions)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function processMessage(message: string, context: any, currentSuggestions: any[]) {
  const lowerMessage = message.toLowerCase();

  // Simple natural language processing
  if (lowerMessage.includes('plan') && lowerMessage.includes('trip')) {
    return handleTripPlanning(message, context);
  } else if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
    return handleBudgetOptimization(message, context);
  } else if (lowerMessage.includes('friend') || lowerMessage.includes('meetup')) {
    return handleSocialSuggestions(message, context);
  } else if (lowerMessage.includes('route') || lowerMessage.includes('scenic')) {
    return handleRouteOptimization(message, context);
  } else if (lowerMessage.includes('apply suggestion')) {
    return handleApplySuggestion(message, context, currentSuggestions);
  } else {
    return handleGeneralQuery(message, context);
  }
}

function handleTripPlanning(message: string, context: any) {
  const response = "I'd be happy to help you plan your RV trip! Based on your preferences, I can suggest routes that fit your budget and timeline. What's your destination and how many days do you have?";
  
  const suggestions = [
    {
      id: `suggestion-${Date.now()}-1`,
      type: 'route',
      title: 'Optimize for fuel efficiency',
      description: 'Plan route using major highways to improve fuel economy by 15%',
      impact: { cost: -45, time: 30, difficulty: 'easy' },
      confidence: 0.85,
      actionable: true
    },
    {
      id: `suggestion-${Date.now()}-2`,
      type: 'budget',
      title: 'Mix campground types',
      description: 'Use state parks for 3 nights instead of RV resorts to save money',
      impact: { cost: -120, time: 0, difficulty: 'easy' },
      confidence: 0.9,
      actionable: true
    }
  ];

  return {
    response,
    suggestions,
    tripUpdates: null
  };
}

function handleBudgetOptimization(message: string, context: any) {
  const currentBudget = context.currentTrip?.budget || 1500;
  const response = `Looking at your $${currentBudget} budget, I can help optimize costs. Consider staying at state parks instead of private RV parks to save 30-40% on accommodation costs.`;
  
  const suggestions = [
    {
      id: `suggestion-${Date.now()}-budget`,
      type: 'budget',
      title: 'Switch to state parks',
      description: 'Use state parks for 60% of nights to reduce accommodation costs',
      impact: { cost: -180, time: 0, difficulty: 'easy' },
      confidence: 0.88,
      actionable: true
    }
  ];

  return {
    response,
    suggestions,
    tripUpdates: null
  };
}

function handleSocialSuggestions(message: string, context: any) {
  const friendCount = context.friends?.length || 0;
  const response = friendCount > 0 
    ? `I found ${friendCount} friends who might be in your area during your trip! Let me check for potential meetup opportunities along your route.`
    : "You haven't added any friends yet. Add friends to get meetup suggestions when planning your routes!";
  
  const suggestions = friendCount > 0 ? [
    {
      id: `suggestion-${Date.now()}-social`,
      type: 'social',
      title: 'Potential meetup in Moab',
      description: 'Sarah & Mike will be in Moab the same time as your Day 5',
      impact: { cost: 25, time: 0, difficulty: 'medium' },
      confidence: 0.75,
      actionable: true
    }
  ] : [];

  return {
    response,
    suggestions,
    tripUpdates: null
  };
}

function handleRouteOptimization(message: string, context: any) {
  const response = "I can suggest scenic alternatives that add minimal time but maximize your experience. Would you prefer mountain views, coastal routes, or desert landscapes?";
  
  const suggestions = [
    {
      id: `suggestion-${Date.now()}-scenic`,
      type: 'scenic',
      title: 'Take the scenic byway',
      description: 'Route 12 through Utah offers incredible red rock views with minimal detour',
      impact: { cost: 15, time: 45, difficulty: 'easy' },
      confidence: 0.92,
      actionable: true
    }
  ];

  return {
    response,
    suggestions,
    tripUpdates: null
  };
}

function handleApplySuggestion(message: string, context: any, currentSuggestions: any[]) {
  const response = "Great choice! I've applied that suggestion to your trip plan. Your route has been updated with the optimization.";
  
  // In a real implementation, this would update the actual trip data
  const tripUpdates = {
    isPlanning: true
  };

  return {
    response,
    suggestions: [], // Clear suggestions after applying
    tripUpdates
  };
}

function handleGeneralQuery(message: string, context: any) {
  const responses = [
    "I'm here to help with your RV trip planning! Ask me about routes, budgets, friends, or scenic alternatives.",
    "Let me know what aspect of your trip you'd like to optimize - I can help with costs, routes, timing, or social meetups.",
    "I can assist with route planning, budget optimization, finding friends along your path, and discovering scenic alternatives!"
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    response,
    suggestions: [],
    tripUpdates: null
  };
}