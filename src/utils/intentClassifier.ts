interface IntentResult {
  type: string;
  confidence: number;
  suggestedTools: string[];
}

const INTENT_PATTERNS: Record<string, { patterns: RegExp[]; tools: string[] }> = {
  budget: {
    patterns: [
      /\b(expense|spend|spent|cost|budget|track|money|cash|income|saving|financial)\b/i,
      /\b(how much|total|remaining|over budget|under budget)\b/i,
      /\$\d+/,
    ],
    tools: ['create_expense', 'analyze_budget', 'get_spending_summary', 'track_savings', 'predict_end_of_month'],
  },
  trip: {
    patterns: [
      /\b(trip|travel|route|drive|journey|destination|itinerary|plan a)\b/i,
      /\b(campground|rv park|camping|fuel stop|road condition)\b/i,
      /\b(weather|forecast|temperature)\b/i,
    ],
    tools: ['plan_trip', 'find_rv_parks', 'get_weather_forecast', 'calculate_gas_cost', 'optimize_route'],
  },
  medical: {
    patterns: [
      /\b(medical|medications?|medicine|health|doctor|allergy|emergency|prescription)\b/i,
      /\b(condition|diagnosis|hospital|clinic)\b/i,
    ],
    tools: ['get_medical_records', 'get_medications', 'search_medical_records', 'get_emergency_info'],
  },
  social: {
    patterns: [
      /\b(friend|share|invite|group|community|social|message|follow|nearby rvers?)\b/i,
      /\b(post|feed|comment|event)\b/i,
    ],
    tools: ['create_post', 'message_friend', 'find_nearby_rvers', 'get_feed', 'create_event'],
  },
  calendar: {
    patterns: [
      /\b(calendar|appointment|schedule|book|reminder|event|meeting)\b/i,
      /\b(tomorrow|next week|monday|tuesday|wednesday|thursday|friday)\b/i,
    ],
    tools: ['create_calendar_event', 'get_calendar_events', 'update_calendar_event'],
  },
  shop: {
    patterns: [
      /\b(shop|buy|purchase|product|price|deal|cart|order)\b/i,
      /\b(tyre|tire|parts|gear|equipment|accessories)\b/i,
    ],
    tools: ['search_products', 'recommend_products', 'compare_prices', 'web_search'],
  },
};

export class IntentClassifier {
  static classifyIntent(message: string): IntentResult {
    let bestMatch = 'general';
    let bestScore = 0;

    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
      const matchCount = config.patterns.filter((p) => p.test(message)).length;
      const score = matchCount / config.patterns.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = intent;
      }
    }

    const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.5, 1.0) : 0.3;
    const tools = INTENT_PATTERNS[bestMatch]?.tools ?? [];

    return {
      type: bestMatch,
      confidence,
      suggestedTools: tools,
    };
  }
}
