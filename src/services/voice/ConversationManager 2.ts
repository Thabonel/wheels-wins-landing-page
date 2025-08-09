import { useVoiceStore } from '@/stores/useVoiceStore';
import { voiceOrchestrator } from '@/services/VoiceOrchestrator';
import { sttService } from './STTService';
import { vadService } from './VADService';
import { webRTCService } from './WebRTCConnectionService';

/**
 * Conversation Manager - Orchestrates the entire voice conversation flow
 * 
 * Manages the complex state machine for natural conversations:
 * - Turn-taking between user and agent
 * - Context management and memory
 * - Intent recognition and routing
 * - Error recovery and fallback handling
 */

export type ConversationState = 
  | 'idle'           // Not in conversation
  | 'listening'      // Listening for user input
  | 'processing'     // Processing user input
  | 'thinking'       // Agent thinking (LLM processing)
  | 'speaking'       // Agent speaking response
  | 'interrupted'    // User interrupted agent
  | 'error';         // Error state

export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: number;
  confidence?: number;
  intent?: string;
  emotion?: string;
  metadata?: any;
}

export interface ConversationContext {
  sessionId: string;
  startTime: number;
  turns: ConversationTurn[];
  currentState: ConversationState;
  userProfile?: any;
  locationContext?: any;
  preferences?: any;
  topics: string[];
  lastActivity: number;
}

export interface ConversationConfig {
  maxTurns: number;
  maxContextLength: number;
  sessionTimeout: number; // ms
  enableIntentRecognition: boolean;
  enableEmotionDetection: boolean;
  enableContextCarryover: boolean;
  
  // Callbacks
  onStateChange?: (state: ConversationState) => void;
  onTurnComplete?: (turn: ConversationTurn) => void;
  onIntentDetected?: (intent: string, entities: any) => void;
  onConversationEnd?: (context: ConversationContext) => void;
  onError?: (error: Error) => void;
}

export class ConversationManager {
  private static instance: ConversationManager;
  
  private config: ConversationConfig;
  private context: ConversationContext;
  private state: ConversationState = 'idle';
  private sessionTimer: NodeJS.Timeout | null = null;
  private processingTimer: NodeJS.Timeout | null = null;
  
  // Services integration
  private isInitialized = false;
  private currentUserInput = '';
  private isProcessingInput = false;

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  private constructor() {
    this.config = {
      maxTurns: 100,
      maxContextLength: 4000, // tokens
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      enableIntentRecognition: true,
      enableEmotionDetection: false,
      enableContextCarryover: true,
    };

    this.context = this.createNewContext();
  }

  /**
   * Initialize conversation manager
   */
  async initialize(config: Partial<ConversationConfig> = {}): Promise<void> {
    console.log('🗣️ Initializing Conversation Manager...');
    
    this.config = { ...this.config, ...config };
    
    // Set up VAD callbacks for conversation flow
    vadService.updateConfig({
      onSpeechStart: () => this.handleUserSpeechStart(),
      onSpeechEnd: () => this.handleUserSpeechEnd(),
    });
    
    // Set up STT callbacks
    await sttService.initialize({
      onPartialTranscript: (text) => this.handlePartialTranscript(text),
      onFinalTranscript: (text, confidence, metadata) => 
        this.handleFinalTranscript(text, confidence, metadata),
      onError: (error) => this.handleSTTError(error),
    });
    
    this.isInitialized = true;
    console.log('✅ Conversation Manager initialized');
  }

  /**
   * Start a new conversation session
   */
  startConversation(userContext?: any): void {
    console.log('🎭 Starting new conversation');
    
    if (!this.isInitialized) {
      throw new Error('Conversation Manager not initialized');
    }
    
    // Create new context
    this.context = this.createNewContext();
    
    if (userContext) {
      this.context.userProfile = userContext.profile;
      this.context.locationContext = userContext.location;
      this.context.preferences = userContext.preferences;
    }
    
    // Start session timer
    this.startSessionTimer();
    
    // Transition to listening state
    this.transitionTo('listening');
    
    // Start VAD listening
    vadService.start();
    
    // Send initial greeting
    this.sendAgentMessage("Hello! I'm PAM, your travel assistant. How can I help you today?", {
      intent: 'greeting',
      priority: 'high' as const,
    });
  }

  /**
   * End current conversation
   */
  endConversation(): void {
    console.log('👋 Ending conversation');
    
    // Stop all services
    vadService.stop();
    sttService.stopTranscribing();
    voiceOrchestrator.cancelSpeech();
    
    // Clear timers
    this.clearTimers();
    
    // Trigger callback
    if (this.config.onConversationEnd) {
      this.config.onConversationEnd(this.context);
    }
    
    // Save conversation history if needed
    this.saveConversationHistory();
    
    // Reset state
    this.transitionTo('idle');
  }

  /**
   * Handle user speech start (from VAD)
   */
  private handleUserSpeechStart(): void {
    console.log('🗣️ User started speaking');
    
    const store = useVoiceStore.getState();
    
    // Check if agent is speaking (barge-in)
    if (this.state === 'speaking') {
      console.log('⚠️ User interrupting agent (barge-in)');
      this.handleBargein();
      return;
    }
    
    // Start STT if not already transcribing
    const sttStatus = sttService.getStatus();
    if (!sttStatus.isTranscribing && webRTCService.getStatus().localStream) {
      sttService.startTranscribing(webRTCService.getStatus().localStream!);
    }
    
    // Update activity
    this.updateActivity();
  }

  /**
   * Handle user speech end (from VAD)
   */
  private handleUserSpeechEnd(): void {
    console.log('🔇 User stopped speaking');
    
    // Give a small delay to ensure final transcript is received
    setTimeout(() => {
      if (this.currentUserInput.trim()) {
        this.processUserInput(this.currentUserInput);
      }
    }, 500);
  }

  /**
   * Handle partial transcript from STT
   */
  private handlePartialTranscript(text: string): void {
    this.currentUserInput = text;
    
    // Could update UI with partial transcript
    console.log(`📝 Partial: "${text}"`);
  }

  /**
   * Handle final transcript from STT
   */
  private handleFinalTranscript(text: string, confidence: number, metadata?: any): void {
    console.log(`📝 Final transcript: "${text}" (confidence: ${confidence})`);
    
    this.currentUserInput = text;
    
    // Add user turn to context
    const turn: ConversationTurn = {
      id: this.generateTurnId(),
      speaker: 'user',
      text,
      timestamp: Date.now(),
      confidence,
      metadata,
    };
    
    this.addTurn(turn);
    
    // Process if not already processing
    if (!this.isProcessingInput && text.trim()) {
      this.processUserInput(text);
    }
  }

  /**
   * Process user input and generate response
   */
  private async processUserInput(text: string): Promise<void> {
    if (this.isProcessingInput) {
      console.log('⚠️ Already processing input');
      return;
    }
    
    console.log(`🤔 Processing user input: "${text}"`);
    
    this.isProcessingInput = true;
    this.transitionTo('processing');
    
    try {
      // Step 1: Intent recognition (if enabled)
      let intent = 'general';
      let entities: any = {};
      
      if (this.config.enableIntentRecognition) {
        const recognition = await this.recognizeIntent(text);
        intent = recognition.intent;
        entities = recognition.entities;
        
        if (this.config.onIntentDetected) {
          this.config.onIntentDetected(intent, entities);
        }
      }
      
      // Step 2: Generate response (this would integrate with your LLM)
      this.transitionTo('thinking');
      
      const response = await this.generateResponse(text, intent, entities);
      
      // Step 3: Send response
      await this.sendAgentMessage(response.text, {
        intent: response.intent,
        metadata: response.metadata,
      });
      
      // Reset for next input
      this.currentUserInput = '';
      this.isProcessingInput = false;
      
      // Return to listening
      this.transitionTo('listening');
      
    } catch (error) {
      console.error('❌ Error processing user input:', error);
      this.handleProcessingError(error as Error);
    }
  }

  /**
   * Recognize intent from user input
   */
  private async recognizeIntent(text: string): Promise<{ intent: string; entities: any }> {
    // Simple keyword-based intent recognition
    // In production, this would use NLU service
    
    const lowerText = text.toLowerCase();
    
    // Travel-related intents
    if (lowerText.includes('book') || lowerText.includes('reserve')) {
      return { intent: 'booking', entities: {} };
    }
    
    if (lowerText.includes('weather')) {
      return { intent: 'weather', entities: {} };
    }
    
    if (lowerText.includes('direction') || lowerText.includes('route')) {
      return { intent: 'navigation', entities: {} };
    }
    
    if (lowerText.includes('recommend') || lowerText.includes('suggest')) {
      return { intent: 'recommendation', entities: {} };
    }
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      return { intent: 'greeting', entities: {} };
    }
    
    if (lowerText.includes('bye') || lowerText.includes('goodbye')) {
      return { intent: 'farewell', entities: {} };
    }
    
    return { intent: 'general', entities: {} };
  }

  /**
   * Generate response based on user input
   */
  private async generateResponse(
    text: string, 
    intent: string, 
    entities: any
  ): Promise<{ text: string; intent: string; metadata?: any }> {
    // This would integrate with your LLM service
    // For now, return mock responses based on intent
    
    const responses: Record<string, string[]> = {
      greeting: [
        "Hello! How can I assist you with your travel plans today?",
        "Hi there! Ready to plan your next adventure?",
        "Welcome! What destination are you thinking about?",
      ],
      farewell: [
        "Goodbye! Have a great journey!",
        "Safe travels! Feel free to ask me anything anytime.",
        "See you later! Enjoy your trip!",
      ],
      booking: [
        "I can help you find and book the perfect accommodation. What dates are you looking at?",
        "Let me search for available options for you. Where would you like to stay?",
      ],
      weather: [
        "Let me check the weather forecast for you. Which location are you interested in?",
        "I'll get you the latest weather information. What city would you like to know about?",
      ],
      navigation: [
        "I can help you find the best route. Where are you trying to go?",
        "Let me get directions for you. What's your destination?",
      ],
      recommendation: [
        "I'd love to suggest some great places! What kind of experience are you looking for?",
        "Let me recommend some options based on your preferences. What interests you most?",
      ],
      general: [
        "That's interesting! Tell me more about what you need.",
        "I'm here to help with all your travel needs. What would you like to know?",
      ],
    };
    
    const intentResponses = responses[intent] || responses.general;
    const response = intentResponses[Math.floor(Math.random() * intentResponses.length)];
    
    return {
      text: response,
      intent: 'response',
      metadata: { originalIntent: intent, entities },
    };
  }

  /**
   * Send agent message
   */
  private async sendAgentMessage(
    text: string, 
    options: {
      intent?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      metadata?: any;
    } = {}
  ): Promise<void> {
    console.log(`🤖 Agent: "${text}"`);
    
    // Add agent turn to context
    const turn: ConversationTurn = {
      id: this.generateTurnId(),
      speaker: 'agent',
      text,
      timestamp: Date.now(),
      intent: options.intent,
      metadata: options.metadata,
    };
    
    this.addTurn(turn);
    
    // Transition to speaking state
    this.transitionTo('speaking');
    
    // Pause VAD while agent is speaking
    vadService.pause();
    
    // Speak the response
    await voiceOrchestrator.speak(text, {
      priority: options.priority || 'normal',
      fallbackToText: true,
    });
    
    // Resume VAD after speaking
    setTimeout(() => {
      if (this.state === 'speaking') {
        vadService.resume();
        this.transitionTo('listening');
      }
    }, 500);
  }

  /**
   * Handle barge-in (user interrupting agent)
   */
  private handleBargein(): void {
    console.log('⚠️ Handling barge-in');
    
    // Stop agent speech
    voiceOrchestrator.interrupt();
    
    // Transition to interrupted state
    this.transitionTo('interrupted');
    
    // Resume listening
    vadService.resume();
    
    // Quick transition back to listening
    setTimeout(() => {
      this.transitionTo('listening');
    }, 100);
  }

  /**
   * Handle STT error
   */
  private handleSTTError(error: Error): void {
    console.error('❌ STT error in conversation:', error);
    
    // Try to recover
    if (this.state === 'listening' || this.state === 'processing') {
      // Continue listening with fallback
      vadService.resume();
    }
  }

  /**
   * Handle processing error
   */
  private handleProcessingError(error: Error): void {
    console.error('❌ Processing error:', error);
    
    this.isProcessingInput = false;
    
    // Send error message to user
    this.sendAgentMessage(
      "I'm sorry, I had trouble understanding that. Could you please try again?",
      { intent: 'error', priority: 'high' }
    );
    
    // Return to listening
    this.transitionTo('listening');
  }

  /**
   * State machine transition
   */
  private transitionTo(newState: ConversationState): void {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`🔄 Conversation state: ${oldState} → ${newState}`);
    
    // Update store
    const store = useVoiceStore.getState();
    
    switch (newState) {
      case 'idle':
        store.setAgentStatus('idle');
        break;
      case 'listening':
        store.setAgentStatus('listening');
        break;
      case 'processing':
      case 'thinking':
        store.setAgentStatus('connected');
        break;
      case 'speaking':
        store.setAgentStatus('speaking');
        break;
      case 'interrupted':
        store.setAgentStatus('listening');
        break;
      case 'error':
        store.setAgentStatus('error');
        break;
    }
    
    // Trigger callback
    if (this.config.onStateChange) {
      this.config.onStateChange(newState);
    }
    
    this.context.currentState = newState;
  }

  /**
   * Add turn to conversation context
   */
  private addTurn(turn: ConversationTurn): void {
    this.context.turns.push(turn);
    
    // Trim if too many turns
    if (this.context.turns.length > this.config.maxTurns) {
      this.context.turns.shift();
    }
    
    // Update activity
    this.updateActivity();
    
    // Trigger callback
    if (this.config.onTurnComplete) {
      this.config.onTurnComplete(turn);
    }
  }

  /**
   * Create new conversation context
   */
  private createNewContext(): ConversationContext {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      turns: [],
      currentState: 'idle',
      topics: [],
      lastActivity: Date.now(),
    };
  }

  /**
   * Start session timer
   */
  private startSessionTimer(): void {
    this.clearTimers();
    
    this.sessionTimer = setTimeout(() => {
      console.log('⏱️ Session timeout');
      this.endConversation();
    }, this.config.sessionTimeout);
  }

  /**
   * Update last activity time
   */
  private updateActivity(): void {
    this.context.lastActivity = Date.now();
    
    // Reset session timer
    if (this.state !== 'idle') {
      this.startSessionTimer();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Save conversation history (for analytics/improvement)
   */
  private saveConversationHistory(): void {
    // In production, this would save to a database
    const history = {
      sessionId: this.context.sessionId,
      duration: Date.now() - this.context.startTime,
      turnCount: this.context.turns.length,
      topics: this.context.topics,
      turns: this.context.turns,
    };
    
    console.log('💾 Saving conversation history:', history);
    
    // Could send to analytics service
    localStorage.setItem(`conversation_${this.context.sessionId}`, JSON.stringify(history));
  }

  /**
   * Generate unique IDs
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return this.state;
  }

  /**
   * Get conversation context
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    sessionId: string;
    duration: number;
    turnCount: number;
    userTurns: number;
    agentTurns: number;
    state: ConversationState;
  } {
    const userTurns = this.context.turns.filter(t => t.speaker === 'user').length;
    const agentTurns = this.context.turns.filter(t => t.speaker === 'agent').length;
    
    return {
      sessionId: this.context.sessionId,
      duration: Date.now() - this.context.startTime,
      turnCount: this.context.turns.length,
      userTurns,
      agentTurns,
      state: this.state,
    };
  }
}

// Export singleton instance
export const conversationManager = ConversationManager.getInstance();