
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

// =====================================================
// PAM 2.0 ENHANCED TYPES
// =====================================================

/**
 * PAM 2.0 Chat Request - matches backend SecureWebSocketMessage model
 */
export interface Pam2ChatRequest {
  type: 'chat'; // Required by backend SecureWebSocketMessage schema
  user_id: string;
  message: string;
  context?: {
    region?: string;
    current_page?: string;
    session_data?: any;
    // DEPRECATED: Use userLocation instead. Backend maps userLocation -> user_location
    location?: any;
    // PREFERRED: Contains { lat, lng, city?, region?, country?, source }
    // Backend auto-maps this to user_location (snake_case)
    userLocation?: any;
  };
  session_id?: string;
}

/**
 * PAM 2.0 Chat Response - matches backend ChatResponse model
 */
export interface Pam2ChatResponse {
  response: string;
  ui_action?: string;
  metadata?: {
    user_id: string;
    session_id: string;
    phase: string;
    service_analyses?: {
      trip_activity?: any;
      financial_content?: any;
      safety_check?: any;
    };
    timestamp: string;
  };
  session_id?: string;
}

/**
 * PAM 2.0 Health Response
 */
export interface Pam2HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  modules: Record<string, string>;
}

/**
 * PAM 2.0 Service Configuration
 */
export interface Pam2Config {
  usePam2: boolean;
  fallbackToPam1: boolean;
  endpoints: {
    chat: string;
    websocket: string;
    health: string;
  };
}
