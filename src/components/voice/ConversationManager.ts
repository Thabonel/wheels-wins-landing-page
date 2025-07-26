/**
 * Advanced Conversation Manager
 * Handles voice interruptions, turn-taking, and conversation flow
 * Inspired by natural conversation patterns from open source Jarvis models
 */

interface ConversationState {
  currentTurn: 'user' | 'ai' | 'idle';
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  canInterrupt: boolean;
  conversationActive: boolean;
  lastInteractionTime: number;
  turnHistory: ConversationTurn[];
}

interface ConversationTurn {
  id: string;
  speaker: 'user' | 'ai';
  content: string;
  timestamp: number;
  duration: number;
  confidence?: number;
  interrupted?: boolean;
  metadata?: Record<string, any>;
}

interface InterruptionEvent {
  type: 'voice_interruption' | 'explicit_stop' | 'timeout' | 'new_wake_word';
  timestamp: number;
  confidence: number;
  triggerData?: any;
}

interface ConversationConfig {
  maxTurnDuration: number;
  silenceThreshold: number;
  interruptionDelay: number;
  turnTimeout: number;
  enableBargeIn: boolean;
  adaptiveInterruption: boolean;
  conversationTimeout: number;
  maxTurnHistory: number;
}

interface ConversationCallbacks {
  onTurnChange?: (newTurn: 'user' | 'ai' | 'idle', previousTurn: 'user' | 'ai' | 'idle') => void;
  onInterruption?: (event: InterruptionEvent) => void;
  onConversationStart?: () => void;
  onConversationEnd?: (reason: string) => void;
  onAIResponseStart?: () => void;
  onAIResponseEnd?: () => void;
  onUserSpeechStart?: () => void;
  onUserSpeechEnd?: () => void;
  onSilenceDetected?: (duration: number) => void;
}

export class ConversationManager {
  private config: ConversationConfig;
  private callbacks: ConversationCallbacks;
  private state: ConversationState;
  
  // Turn management
  private turnTimer: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private conversationTimer: NodeJS.Timeout | null = null;
  private interruptionBuffer: InterruptionEvent[] = [];
  
  // Audio monitoring
  private audioMonitor: AudioContext | null = null;
  private speechDetector: any = null; // VAD integration
  
  // Interruption detection
  private lastSpeechActivity = 0;
  private speechActivityThreshold = 0.02;
  private consecutiveSpeechFrames = 0;
  private requiredSpeechFrames = 3;

  constructor(config: Partial<ConversationConfig> = {}, callbacks: ConversationCallbacks = {}) {
    this.config = {
      maxTurnDuration: 30000, // 30 seconds max per turn
      silenceThreshold: 2000, // 2 seconds of silence
      interruptionDelay: 500, // 500ms delay before allowing interruption
      turnTimeout: 60000, // 60 seconds total turn timeout
      enableBargeIn: true, // Allow interrupting AI speech
      adaptiveInterruption: true, // Adapt interruption sensitivity
      conversationTimeout: 300000, // 5 minutes conversation timeout
      maxTurnHistory: 20, // Keep last 20 turns
      ...config
    };
    
    this.callbacks = callbacks;
    
    this.state = {
      currentTurn: 'idle',
      isAISpeaking: false,
      isUserSpeaking: false,
      canInterrupt: false,
      conversationActive: false,
      lastInteractionTime: 0,
      turnHistory: []
    };
  }

  async initialize(): Promise<boolean> {
    console.log('🎭 Initializing Conversation Manager...');
    
    try {
      // Initialize audio context for speech monitoring
      this.audioMonitor = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      console.log('✅ Conversation Manager initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Conversation Manager initialization failed:', error);
      return false;
    }
  }

  // Conversation lifecycle management
  startConversation(trigger: 'wake_word' | 'manual' | 'continuation' = 'manual'): void {
    console.log(`🎬 Starting conversation (trigger: ${trigger})`);
    
    this.state.conversationActive = true;
    this.state.lastInteractionTime = Date.now();
    
    // Set conversation timeout
    this.setConversationTimeout();
    
    // Start with user turn after wake word
    this.setTurn('user');
    
    this.callbacks.onConversationStart?.();
  }

  endConversation(reason: string = 'manual'): void {
    console.log(`🏁 Ending conversation (reason: ${reason})`);
    
    this.state.conversationActive = false;
    this.clearAllTimers();
    this.setTurn('idle');
    
    this.callbacks.onConversationEnd?.(reason);
  }

  // Turn management
  setTurn(newTurn: 'user' | 'ai' | 'idle'): void {
    const previousTurn = this.state.currentTurn;
    
    if (previousTurn === newTurn) {
      return;
    }
    
    console.log(`🔄 Turn change: ${previousTurn} → ${newTurn}`);
    
    // Clean up previous turn
    this.clearTurnTimer();
    this.clearSilenceTimer();
    
    // Update state
    this.state.currentTurn = newTurn;
    this.state.lastInteractionTime = Date.now();
    
    // Setup new turn
    switch (newTurn) {
      case 'user':
        this.startUserTurn();
        break;
      case 'ai':
        this.startAITurn();
        break;
      case 'idle':
        this.startIdleTurn();
        break;
    }
    
    this.callbacks.onTurnChange?.(newTurn, previousTurn);
  }

  private startUserTurn(): void {
    console.log('🗣️ User turn started');
    
    this.state.isUserSpeaking = false;
    this.state.isAISpeaking = false;
    this.state.canInterrupt = false;
    
    // Set turn timeout
    this.turnTimer = setTimeout(() => {
      console.log('⏰ User turn timed out');
      this.endConversation('user_timeout');
    }, this.config.turnTimeout);
    
    // Start monitoring for user speech
    this.startSpeechMonitoring();
  }

  private startAITurn(): void {
    console.log('🤖 AI turn started');
    
    this.state.isAISpeaking = true;
    this.state.isUserSpeaking = false;
    
    // Allow interruption after delay
    setTimeout(() => {
      if (this.state.currentTurn === 'ai' && this.state.isAISpeaking) {
        this.state.canInterrupt = this.config.enableBargeIn;
        console.log(`💬 AI interruption ${this.state.canInterrupt ? 'enabled' : 'disabled'}`);
      }
    }, this.config.interruptionDelay);
    
    // Set maximum AI speaking time
    this.turnTimer = setTimeout(() => {
      console.log('⏰ AI turn timed out');
      this.onAIResponseComplete();
    }, this.config.maxTurnDuration);
    
    this.callbacks.onAIResponseStart?.();
  }

  private startIdleTurn(): void {
    console.log('😴 Idle turn started');
    
    this.state.isAISpeaking = false;
    this.state.isUserSpeaking = false;
    this.state.canInterrupt = false;
    
    this.stopSpeechMonitoring();
  }

  // Speech monitoring and interruption detection
  private startSpeechMonitoring(): void {
    // This would integrate with the existing VAD system
    // For now, we'll create a simplified monitoring system
    console.log('👂 Starting speech monitoring for interruptions...');
  }

  private stopSpeechMonitoring(): void {
    console.log('🔇 Stopping speech monitoring');
  }

  // User speech events
  onUserSpeechStart(): void {
    if (!this.state.conversationActive) {
      return;
    }
    
    console.log('🗣️ User speech detected');
    this.state.isUserSpeaking = true;
    this.state.lastInteractionTime = Date.now();
    
    // Handle potential interruption
    if (this.state.currentTurn === 'ai' && this.state.canInterrupt) {
      this.handleVoiceInterruption();
    } else if (this.state.currentTurn === 'user') {
      this.clearSilenceTimer();
    }
    
    this.callbacks.onUserSpeechStart?.();
  }

  onUserSpeechEnd(): void {
    if (!this.state.conversationActive) {
      return;
    }
    
    console.log('🤐 User speech ended');
    this.state.isUserSpeaking = false;
    
    if (this.state.currentTurn === 'user') {
      // Start silence timer to detect end of user turn
      this.startSilenceTimer();
    }
    
    this.callbacks.onUserSpeechEnd?.();
  }

  // AI response events
  onAIResponseStart(): void {
    if (!this.state.conversationActive) {
      return;
    }
    
    console.log('🤖 AI response started');
    this.setTurn('ai');
  }

  onAIResponseComplete(): void {
    if (!this.state.conversationActive) {
      return;
    }
    
    console.log('✅ AI response completed');
    this.state.isAISpeaking = false;
    this.state.canInterrupt = false;
    
    this.callbacks.onAIResponseEnd?.();
    
    // Return turn to user
    this.setTurn('user');
  }

  // Interruption handling
  private handleVoiceInterruption(): void {
    const now = Date.now();
    const interruptionEvent: InterruptionEvent = {
      type: 'voice_interruption',
      timestamp: now,
      confidence: this.calculateInterruptionConfidence(),
      triggerData: {
        aiSpeakingTime: now - this.state.lastInteractionTime,
        speechActivity: this.consecutiveSpeechFrames
      }
    };
    
    console.log(`🚫 Voice interruption detected (confidence: ${interruptionEvent.confidence.toFixed(2)})`);
    
    // Add to interruption buffer for analysis
    this.interruptionBuffer.push(interruptionEvent);
    this.pruneInterruptionBuffer();
    
    // Decide whether to allow interruption
    if (this.shouldAllowInterruption(interruptionEvent)) {
      this.executeInterruption(interruptionEvent);
    }
  }

  private calculateInterruptionConfidence(): number {
    // Calculate confidence based on various factors
    let confidence = 0.5;
    
    // Speech activity strength
    const speechStrength = Math.min(1, this.consecutiveSpeechFrames / this.requiredSpeechFrames);
    confidence += speechStrength * 0.3;
    
    // Time since AI started speaking (later = higher confidence)
    const aiSpeakingTime = Date.now() - this.state.lastInteractionTime;
    const timeConfidence = Math.min(1, aiSpeakingTime / this.config.interruptionDelay);
    confidence += timeConfidence * 0.2;
    
    return Math.min(1, confidence);
  }

  private shouldAllowInterruption(event: InterruptionEvent): boolean {
    // Adaptive interruption logic
    if (!this.config.adaptiveInterruption) {
      return event.confidence > 0.7;
    }
    
    // Consider recent interruption pattern
    const recentInterruptions = this.interruptionBuffer
      .filter(e => Date.now() - e.timestamp < 10000) // Last 10 seconds
      .length;
    
    // Lower threshold if user frequently interrupts
    const baseThreshold = 0.7;
    const adaptiveThreshold = Math.max(0.5, baseThreshold - (recentInterruptions * 0.05));
    
    return event.confidence > adaptiveThreshold;
  }

  private executeInterruption(event: InterruptionEvent): void {
    console.log('🛑 Executing voice interruption');
    
    // Stop AI response
    this.state.isAISpeaking = false;
    this.state.canInterrupt = false;
    
    // Record interrupted turn
    if (this.state.turnHistory.length > 0) {
      const lastTurn = this.state.turnHistory[this.state.turnHistory.length - 1];
      if (lastTurn.speaker === 'ai') {
        lastTurn.interrupted = true;
        lastTurn.duration = Date.now() - lastTurn.timestamp;
      }
    }
    
    // Switch to user turn
    this.setTurn('user');
    
    this.callbacks.onInterruption?.(event);
  }

  // Silence detection
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      const silenceDuration = this.config.silenceThreshold;
      console.log(`🤫 Silence detected (${silenceDuration}ms)`);
      
      this.callbacks.onSilenceDetected?.(silenceDuration);
      
      if (this.state.currentTurn === 'user') {
        // User turn is complete, wait for AI response or end conversation
        this.setTurn('idle');
      }
    }, this.config.silenceThreshold);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // Turn history management
  addTurn(speaker: 'user' | 'ai', content: string, metadata: Record<string, any> = {}): void {
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speaker,
      content,
      timestamp: Date.now(),
      duration: 0,
      metadata
    };
    
    this.state.turnHistory.push(turn);
    
    // Maintain history size
    if (this.state.turnHistory.length > this.config.maxTurnHistory) {
      this.state.turnHistory.shift();
    }
    
    console.log(`📝 Added ${speaker} turn: "${content.substring(0, 50)}..."`);
  }

  completeTurn(turnId: string, duration?: number): void {
    const turn = this.state.turnHistory.find(t => t.id === turnId);
    if (turn) {
      turn.duration = duration || (Date.now() - turn.timestamp);
    }
  }

  // Utility methods
  private setConversationTimeout(): void {
    this.clearConversationTimer();
    
    this.conversationTimer = setTimeout(() => {
      console.log('⏰ Conversation timed out');
      this.endConversation('conversation_timeout');
    }, this.config.conversationTimeout);
  }

  private clearConversationTimer(): void {
    if (this.conversationTimer) {
      clearTimeout(this.conversationTimer);
      this.conversationTimer = null;
    }
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearTurnTimer();
    this.clearSilenceTimer();
    this.clearConversationTimer();
  }

  private pruneInterruptionBuffer(): void {
    const cutoff = Date.now() - 30000; // Keep last 30 seconds
    this.interruptionBuffer = this.interruptionBuffer.filter(e => e.timestamp > cutoff);
  }

  // Public API
  getCurrentState(): ConversationState {
    return { ...this.state };
  }

  getTurnHistory(): ConversationTurn[] {
    return [...this.state.turnHistory];
  }

  isConversationActive(): boolean {
    return this.state.conversationActive;
  }

  canUserSpeak(): boolean {
    return this.state.conversationActive && 
           (this.state.currentTurn === 'user' || 
            (this.state.currentTurn === 'ai' && this.state.canInterrupt));
  }

  forceEndTurn(): void {
    if (this.state.currentTurn === 'ai') {
      this.onAIResponseComplete();
    } else if (this.state.currentTurn === 'user') {
      this.setTurn('idle');
    }
  }

  // Manual interruption (e.g., stop button)
  forceInterruption(reason: string = 'manual'): void {
    const event: InterruptionEvent = {
      type: 'explicit_stop',
      timestamp: Date.now(),
      confidence: 1.0,
      triggerData: { reason }
    };
    
    console.log(`🛑 Manual interruption: ${reason}`);
    this.executeInterruption(event);
  }

  // Update speech activity for interruption detection
  updateSpeechActivity(isSpeech: boolean, confidence: number = 0): void {
    if (isSpeech && confidence > this.speechActivityThreshold) {
      this.consecutiveSpeechFrames++;
      this.lastSpeechActivity = Date.now();
    } else {
      this.consecutiveSpeechFrames = Math.max(0, this.consecutiveSpeechFrames - 1);
    }
  }

  // Configuration updates
  updateConfig(newConfig: Partial<ConversationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Conversation Manager config updated');
  }

  destroy(): void {
    console.log('🛑 Destroying Conversation Manager...');
    
    this.endConversation('destroyed');
    this.clearAllTimers();
    
    if (this.audioMonitor) {
      this.audioMonitor.close();
      this.audioMonitor = null;
    }
  }
}