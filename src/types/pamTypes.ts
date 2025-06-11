
export interface PamIntent {
  type: 'onboarding' | 'travel_advice' | 'budget_help' | 'local_recommendations' | 'safety_tips' | 'transport_info' | 'general';
  confidence: number;
}

export interface PamWebhookPayload {
  chatInput: string;
  user_id: string;
  session_id: string;
  voice_enabled: boolean;
}

export interface PamSessionData {
  messageCount: number;
  previousIntents: string[];
  isFirstTime: boolean;
}
