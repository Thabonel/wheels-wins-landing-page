
export interface PamWebhookPayload {
  chatInput: string;
  user_id: string;
  voice_enabled: boolean;
  pam_memory?: any; // Optional memory context object
}

export interface PamSessionData {
  messageCount: number;
  previousIntents: string[];
  isFirstTime: boolean;
}

export interface PamIntent {
  type: 'onboarding' | 'travel_advice' | 'budget_help' | 'local_recommendations' | 'safety_tips' | 'transport_info' | 'general';
  confidence: number;
}
