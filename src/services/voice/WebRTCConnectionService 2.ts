import { useVoiceStore } from '@/stores/useVoiceStore';

/**
 * WebRTC Connection Service for real-time voice communication
 * 
 * Implements WebRTC for superior real-time performance over WebSocket
 * Based on research showing WebRTC's advantages for voice agents:
 * - Lower latency (UDP-based)
 * - Better handling of packet loss
 * - Native jitter buffering
 * - Built-in echo cancellation
 */

export interface WebRTCConfig {
  stunServers?: string[];
  turnServers?: RTCIceServer[];
  signalingUrl: string;
  enableDataChannel?: boolean;
  enableAudioStream?: boolean;
  audioConstraints?: MediaStreamConstraints['audio'];
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface ConnectionMetrics {
  latency: number;
  packetsLost: number;
  jitter: number;
  audioLevel: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export class WebRTCConnectionService {
  private static instance: WebRTCConnectionService;
  
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingSocket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private config: WebRTCConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  private isConnecting = false;
  private isConnected = false;
  private connectionId: string | null = null;

  // Singleton pattern
  static getInstance(): WebRTCConnectionService {
    if (!WebRTCConnectionService.instance) {
      WebRTCConnectionService.instance = new WebRTCConnectionService();
    }
    return WebRTCConnectionService.instance;
  }

  private constructor() {
    // Default configuration
    this.config = {
      stunServers: ['stun:stun.l.google.com:19302'],
      signalingUrl: '',
      enableDataChannel: true,
      enableAudioStream: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // Optimal for speech
      }
    };
  }

  /**
   * Initialize WebRTC connection
   */
  async connect(config: Partial<WebRTCConfig> = {}): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('🔗 WebRTC already connecting or connected');
      return;
    }

    this.config = { ...this.config, ...config };
    this.isConnecting = true;
    
    const store = useVoiceStore.getState();
    store.setAgentStatus('connecting');

    try {
      // Step 1: Get user media (microphone)
      if (this.config.enableAudioStream) {
        await this.initializeLocalStream();
      }

      // Step 2: Connect to signaling server
      await this.connectSignaling();

      // Step 3: Create peer connection
      await this.createPeerConnection();

      // Step 4: Create data channel for control messages
      if (this.config.enableDataChannel) {
        this.createDataChannel();
      }

      // Step 5: Start metrics monitoring
      this.startMetricsMonitoring();

      this.isConnecting = false;
      this.isConnected = true;
      
      store.setAgentStatus('connected');
      store.setConnectionId(this.connectionId);
      
      console.log('✅ WebRTC connection established');

    } catch (error) {
      console.error('❌ WebRTC connection failed:', error);
      this.isConnecting = false;
      
      store.setError(`WebRTC connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      store.setAgentStatus('error');
      
      // Attempt reconnection
      this.scheduleReconnect();
      
      throw error;
    }
  }

  /**
   * Initialize local audio stream
   */
  private async initializeLocalStream(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.config.audioConstraints,
        video: false
      });
      
      console.log('✅ Microphone access granted');
      
      // Monitor audio levels
      this.monitorAudioLevels(this.localStream);
      
    } catch (error) {
      console.error('❌ Failed to access microphone:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Connect to signaling server (WebSocket for signaling only)
   */
  private async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to signaling server...');
      
      this.signalingSocket = new WebSocket(this.config.signalingUrl);
      
      const timeout = setTimeout(() => {
        reject(new Error('Signaling connection timeout'));
      }, 10000);

      this.signalingSocket.onopen = () => {
        clearTimeout(timeout);
        console.log('✅ Signaling connected');
        this.connectionId = `webrtc_${Date.now()}`;
        resolve();
      };

      this.signalingSocket.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ Signaling error:', error);
        reject(new Error('Signaling connection failed'));
      };

      this.signalingSocket.onmessage = async (event) => {
        await this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.signalingSocket.onclose = () => {
        console.log('🔌 Signaling disconnected');
        if (this.isConnected) {
          this.handleDisconnection();
        }
      };
    });
  }

  /**
   * Create RTCPeerConnection
   */
  private async createPeerConnection(): Promise<void> {
    console.log('🔧 Creating peer connection...');
    
    const configuration: RTCConfiguration = {
      iceServers: this.config.turnServers || [
        { urls: this.config.stunServers || [] }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('🎵 Received remote audio stream');
      this.remoteStream = event.streams[0];
      this.handleRemoteStream(this.remoteStream);
    };

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${this.peerConnection?.connectionState}`);
      
      if (this.peerConnection?.connectionState === 'connected') {
        this.handleConnectionSuccess();
      } else if (this.peerConnection?.connectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };

    // ICE connection state monitoring
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE state: ${this.peerConnection?.iceConnectionState}`);
      
      const store = useVoiceStore.getState();
      
      if (this.peerConnection?.iceConnectionState === 'disconnected') {
        store.updateMetrics({ connectionQuality: 'poor' });
      } else if (this.peerConnection?.iceConnectionState === 'failed') {
        this.handleICEFailure();
      }
    };
  }

  /**
   * Create data channel for control messages
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;
    
    console.log('📡 Creating data channel...');
    
    this.dataChannel = this.peerConnection.createDataChannel('control', {
      ordered: true,
      maxRetransmits: 3
    });

    this.dataChannel.onopen = () => {
      console.log('✅ Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('🔌 Data channel closed');
    };

    this.dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data);
    };

    this.dataChannel.onerror = (error) => {
      console.error('❌ Data channel error:', error);
    };
  }

  /**
   * Handle signaling messages
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    console.log('📨 Signaling message:', message.type);
    
    switch (message.type) {
      case 'offer':
        await this.handleOffer(message.offer);
        break;
        
      case 'answer':
        await this.handleAnswer(message.answer);
        break;
        
      case 'ice-candidate':
        await this.handleIceCandidate(message.candidate);
        break;
        
      case 'ready':
        await this.createOffer();
        break;
        
      default:
        console.warn('Unknown signaling message type:', message.type);
    }
  }

  /**
   * Create and send offer
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;
    
    console.log('📤 Creating offer...');
    
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    
    await this.peerConnection.setLocalDescription(offer);
    
    this.sendSignalingMessage({
      type: 'offer',
      offer
    });
  }

  /**
   * Handle received offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    console.log('📥 Handling offer...');
    
    await this.peerConnection.setRemoteDescription(offer);
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    this.sendSignalingMessage({
      type: 'answer',
      answer
    });
  }

  /**
   * Handle received answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    console.log('📥 Handling answer...');
    await this.peerConnection.setRemoteDescription(answer);
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    
    console.log('❄️ Adding ICE candidate...');
    await this.peerConnection.addIceCandidate(candidate);
  }

  /**
   * Send signaling message
   */
  private sendSignalingMessage(message: any): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  /**
   * Handle remote audio stream
   */
  private handleRemoteStream(stream: MediaStream): void {
    console.log('🎵 Processing remote audio stream');
    
    // Create audio element for playback
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    
    // Store reference for cleanup
    (window as any).__webrtcAudio = audio;
  }

  /**
   * Handle data channel messages
   */
  private handleDataChannelMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log('📡 Data channel message:', message);
      
      // Handle control messages (interrupt, status, etc.)
      if (message.type === 'interrupt') {
        const store = useVoiceStore.getState();
        store.handleInterrupt();
      }
      
    } catch (error) {
      console.error('Failed to parse data channel message:', error);
    }
  }

  /**
   * Monitor audio levels
   */
  private monitorAudioLevels(stream: MediaStream): void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    microphone.connect(analyser);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      const store = useVoiceStore.getState();
      store.updateMetrics({ audioLevel: average });
      
      if (this.isConnected) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  }

  /**
   * Start metrics monitoring
   */
  private startMetricsMonitoring(): void {
    this.metricsInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      
      const stats = await this.peerConnection.getStats();
      const metrics = this.calculateMetrics(stats);
      
      const store = useVoiceStore.getState();
      store.updateMetrics(metrics);
      
    }, 1000); // Update every second
  }

  /**
   * Calculate connection metrics from WebRTC stats
   */
  private calculateMetrics(stats: RTCStatsReport): Partial<ConnectionMetrics> {
    const metrics: Partial<ConnectionMetrics> = {};
    
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        metrics.latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }
      
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        metrics.packetsLost = report.packetsLost || 0;
        metrics.jitter = report.jitter ? report.jitter * 1000 : 0;
      }
    });
    
    // Calculate connection quality based on metrics
    const quality = this.calculateConnectionQuality(metrics);
    metrics.connectionQuality = quality;
    
    return metrics;
  }

  /**
   * Calculate connection quality based on metrics
   */
  private calculateConnectionQuality(metrics: Partial<ConnectionMetrics>): ConnectionMetrics['connectionQuality'] {
    const latency = metrics.latency || 0;
    const packetsLost = metrics.packetsLost || 0;
    const jitter = metrics.jitter || 0;
    
    if (latency < 50 && packetsLost < 1 && jitter < 10) {
      return 'excellent';
    } else if (latency < 150 && packetsLost < 5 && jitter < 30) {
      return 'good';
    } else if (latency < 300 && packetsLost < 10 && jitter < 50) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnectionSuccess(): void {
    console.log('✅ WebRTC connection successful');
    this.reconnectAttempts = 0;
    
    const store = useVoiceStore.getState();
    store.resetReconnectAttempts();
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(): void {
    console.error('❌ WebRTC connection failed');
    this.handleDisconnection();
  }

  /**
   * Handle ICE failure
   */
  private handleICEFailure(): void {
    console.error('❌ ICE connection failed');
    
    // Attempt ICE restart
    this.restartICE();
  }

  /**
   * Restart ICE connection
   */
  private async restartICE(): Promise<void> {
    if (!this.peerConnection) return;
    
    console.log('🔄 Restarting ICE...');
    
    const offer = await this.peerConnection.createOffer({ iceRestart: true });
    await this.peerConnection.setLocalDescription(offer);
    
    this.sendSignalingMessage({
      type: 'offer',
      offer,
      iceRestart: true
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    console.log('🔌 WebRTC disconnected');
    
    this.isConnected = false;
    
    const store = useVoiceStore.getState();
    store.setAgentStatus('disconnected');
    
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
      console.error('❌ Max reconnection attempts reached');
      
      const store = useVoiceStore.getState();
      store.setError('Connection lost. Please refresh the page.');
      store.setAgentStatus('error');
      
      return;
    }
    
    this.reconnectAttempts++;
    
    const delay = Math.min(
      (this.config.reconnectDelay || 1000) * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    
    const store = useVoiceStore.getState();
    store.incrementReconnectAttempts();
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send audio data over WebRTC
   */
  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready for audio data');
      return;
    }
    
    // Convert ArrayBuffer to base64 for transmission
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)));
    
    this.dataChannel.send(JSON.stringify({
      type: 'audio',
      data: base64,
      timestamp: Date.now()
    }));
  }

  /**
   * Send control message
   */
  sendControlMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready for control message');
      return;
    }
    
    this.dataChannel.send(JSON.stringify({
      type: 'control',
      ...message,
      timestamp: Date.now()
    }));
  }

  /**
   * Disconnect WebRTC
   */
  disconnect(): void {
    console.log('🔌 Disconnecting WebRTC...');
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Close connections
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
    
    // Stop streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    // Clean up audio element
    if ((window as any).__webrtcAudio) {
      (window as any).__webrtcAudio.pause();
      (window as any).__webrtcAudio.srcObject = null;
      delete (window as any).__webrtcAudio;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    const store = useVoiceStore.getState();
    store.setAgentStatus('idle');
    store.setConnectionId(null);
    
    console.log('✅ WebRTC disconnected');
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    connectionId: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
  } {
    return {
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      localStream: this.localStream,
      remoteStream: this.remoteStream
    };
  }
}

// Export singleton instance
export const webRTCService = WebRTCConnectionService.getInstance();