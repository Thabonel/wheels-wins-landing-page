
export interface PamIntent {
  type: 'onboarding' | 'travel_advice' | 'budget_help' | 'local_recommendations' | 'safety_tips' | 'transport_info' | 'general';
  confidence: number;
}

export interface PamWebhookPayload {
  user_id: string;
  message: string;
  intent: string;
  is_first_time?: boolean;
  session_context?: {
    message_count: number;
    previous_intents: string[];
  };
}

export interface PamSessionData {
  messageCount: number;
  previousIntents: string[];
  isFirstTime: boolean;
}
