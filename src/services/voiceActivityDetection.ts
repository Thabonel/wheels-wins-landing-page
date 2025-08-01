/**
 * Voice Activity Detection Service
 * Integrates the VAD worklet for sophisticated conversation management
 */

export interface VADResult {
  isSpeech: boolean;
  confidence: number;
  timestamp: number;
}

export interface ConversationState {
  userSpeaking: boolean;
  pamSpeaking: boolean;
  waitingForPause: boolean;
  lastSpeechEnd: number;
  lastSilenceStart: number;
}

export class VoiceActivityDetectionService {
  private audioContext: AudioContext | null = null;
  private vadWorkletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isActive = false;
  
  // Conversation management
  private conversationState: ConversationState = {
    userSpeaking: false,
    pamSpeaking: false,
    waitingForPause: false,
    lastSpeechEnd: 0,
    lastSilenceStart: 0,
  };
  
  // Event handlers
  private onSpeechStartCallbacks: Array<(result: VADResult) => void> = [];
  private onSpeechEndCallbacks: Array<(result: VADResult) => void> = [];
  private onVADResultCallbacks: Array<(result: VADResult) => void> = [];
  
  // Configuration
  private readonly pauseThreshold = 1000; // 1 second of silence before considering pause
  private readonly interruptThreshold = 300; // 300ms of speech to interrupt PAM
  
  constructor() {
    console.log('🎯 Voice Activity Detection Service initialized');
  }
  
  /**
   * Initialize VAD with audio stream
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      console.log('🔧 Initializing VAD with audio stream');
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load VAD worklet
      await this.audioContext.audioWorklet.addModule('/vad-processor-worklet.js');
      
      // Create VAD worklet node
      this.vadWorkletNode = new AudioWorkletNode(this.audioContext, 'vad-processor-worklet', {
        processorOptions: {
          frameSize: 1024,
          hopLength: 512,
          preEmphasis: 0.97,
        },
      });
      
      // Connect audio stream
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.vadWorkletNode);
      
      // Set up message handling
      this.vadWorkletNode.port.onmessage = (event) => {
        this.handleVADResult(event.data);
      };
      
      this.mediaStream = stream;
      this.isActive = true;
      
      console.log('✅ VAD initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize VAD:', error);
      throw error;
    }
  }
  
  /**
   * Handle VAD results from worklet
   */
  private handleVADResult(data: any): void {
    const result: VADResult = {
      isSpeech: data.isSpeech,
      confidence: data.confidence,
      timestamp: Date.now(),
    };
    
    // Update conversation state
    this.updateConversationState(result);
    
    // Emit events
    this.onVADResultCallbacks.forEach(callback => callback(result));
    
    // Speech start/end events
    if (result.isSpeech && !this.conversationState.userSpeaking) {
      this.onSpeechStartCallbacks.forEach(callback => callback(result));
    } else if (!result.isSpeech && this.conversationState.userSpeaking) {
      this.onSpeechEndCallbacks.forEach(callback => callback(result));
    }
  }
  
  /**
   * Update conversation state based on VAD results
   */
  private updateConversationState(result: VADResult): void {
    const now = Date.now();
    
    if (result.isSpeech) {
      if (!this.conversationState.userSpeaking) {
        console.log('🎤 User started speaking');
        this.conversationState.userSpeaking = true;
        this.conversationState.waitingForPause = false;
      }
    } else {
      if (this.conversationState.userSpeaking) {
        console.log('🔇 User stopped speaking');
        this.conversationState.userSpeaking = false;
        this.conversationState.lastSpeechEnd = now;
        this.conversationState.lastSilenceStart = now;
      }
    }
  }
  
  /**
   * Check if it's appropriate for PAM to start speaking
   */
  canPAMSpeak(): boolean {
    const now = Date.now();
    const silenceDuration = now - this.conversationState.lastSilenceStart;
    
    // Don't speak if user is currently speaking
    if (this.conversationState.userSpeaking) {
      return false;
    }
    
    // Wait for natural pause after user speech
    if (this.conversationState.lastSpeechEnd > 0 && silenceDuration < this.pauseThreshold) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if PAM should be interrupted due to user speech
   */
  shouldInterruptPAM(): boolean {
    // Interrupt if user starts speaking while PAM is talking
    return this.conversationState.userSpeaking && this.conversationState.pamSpeaking;
  }
  
  /**
   * Notify service that PAM started speaking
   */
  setPAMSpeaking(speaking: boolean): void {
    this.conversationState.pamSpeaking = speaking;
    console.log(`🤖 PAM ${speaking ? 'started' : 'stopped'} speaking`);
  }
  
  /**
   * Wait for natural conversation pause
   */
  async waitForPause(maxWaitTime: number = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkPause = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= maxWaitTime) {
          console.log('⏰ Max wait time reached, proceeding anyway');
          resolve(true);
          return;
        }
        
        if (this.canPAMSpeak()) {
          console.log('✅ Natural pause detected, PAM can speak');
          resolve(true);
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkPause, 100);
      };
      
      checkPause();
    });
  }
  
  /**
   * Event listeners
   */
  onSpeechStart(callback: (result: VADResult) => void): void {
    this.onSpeechStartCallbacks.push(callback);
  }
  
  onSpeechEnd(callback: (result: VADResult) => void): void {
    this.onSpeechEndCallbacks.push(callback);
  }
  
  onVADResult(callback: (result: VADResult) => void): void {
    this.onVADResultCallbacks.push(callback);
  }
  
  /**
   * Get current conversation state
   */
  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up VAD service');
    
    this.isActive = false;
    
    if (this.vadWorkletNode) {
      this.vadWorkletNode.disconnect();
      this.vadWorkletNode = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Clear callbacks
    this.onSpeechStartCallbacks = [];
    this.onSpeechEndCallbacks = [];
    this.onVADResultCallbacks = [];
    
    // Reset conversation state
    this.conversationState = {
      userSpeaking: false,
      pamSpeaking: false,
      waitingForPause: false,
      lastSpeechEnd: 0,
      lastSilenceStart: 0,
    };
  }
  
  /**
   * Check if VAD is currently active
   */
  isVADActive(): boolean {
    return this.isActive;
  }
}

// Singleton instance
export const vadService = new VoiceActivityDetectionService();