import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff, MapPin, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { pamUIController } from "@/lib/PamUIController";
import { getWebSocketUrl, apiFetch, authenticatedFetch } from "@/services/api";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { supabase } from "@/integrations/supabase/client";

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: string;
  context?: any;
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

const Pam: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Connecting" | "Disconnected">("Disconnected");
  const [userContext, setUserContext] = useState<any>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [wakeWordRecognition, setWakeWordRecognition] = useState<SpeechRecognition | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => {
    // Generate or restore session ID for conversation continuity
    const saved = localStorage.getItem('pam_session_id');
    return saved || `session_${user?.id}_${Date.now()}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const sessionToken = session?.access_token;

  // Load user context and memory when component mounts
  useEffect(() => {
    console.log('🚀 PAM useEffect triggered with user:', { userId: user?.id, hasUser: !!user, hasSession: !!session });
    if (user?.id) {
      console.log('📋 PAM: Loading user context and connecting...');
      
      // Persist session ID for conversation continuity
      localStorage.setItem('pam_session_id', sessionId);
      
      loadUserContext();
      loadConversationMemory();
      connectToBackend();
    } else {
      console.log('❌ PAM: No user ID, skipping connection');
    }
    // eslint-disable-next-line
  }, [user?.id, sessionId]);

  // Listen for external PAM control events
  useEffect(() => {
    const handleOpenWithMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      console.log('🎯 PAM: Opening with message:', message);
      setIsOpen(true);
      setInputMessage(message);
      // Focus input after a brief delay to ensure component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleOpen = () => {
      console.log('🎯 PAM: Opening');
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleSendMessageEvent = (event: CustomEvent) => {
      const { message } = event.detail;
      console.log('🎯 PAM: Sending message:', message);
      if (isOpen) {
        setInputMessage(message);
        // Auto-send the message
        setTimeout(() => {
          handleSendMessage();
        }, 100);
      } else {
        // Open PAM and send message
        setIsOpen(true);
        setInputMessage(message);
        setTimeout(() => {
          handleSendMessage();
        }, 200);
      }
    };

    // Add event listeners
    window.addEventListener('pam-open-with-message', handleOpenWithMessage as EventListener);
    window.addEventListener('pam-open', handleOpen);
    window.addEventListener('pam-send-message', handleSendMessageEvent as EventListener);

    return () => {
      window.removeEventListener('pam-open-with-message', handleOpenWithMessage as EventListener);
      window.removeEventListener('pam-open', handleOpen);
      window.removeEventListener('pam-send-message', handleSendMessageEvent as EventListener);
    };
  }, [isOpen]);

  const loadUserContext = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is my current context and preferences?',
          context: {
            user_id: user?.id,
            request_type: 'load_user_context'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Loaded user context:', data);
        setUserContext(data?.context_updates || data?.actions || data);
      }
    } catch (error) {
      console.error('Failed to load user context:', error);
    }
  };

  const loadConversationMemory = async () => {
    try {
      // ROBUST MEMORY: First try to restore from localStorage
      const savedState = localStorage.getItem(`pam_conversation_${user?.id}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
            console.log('📚 PAM: Restored conversation from localStorage:', parsed.messages.length, 'messages');
            
            // Restore session ID if available
            if (parsed.sessionId) {
              setSessionId(parsed.sessionId);
            }
            return; // Successfully restored from localStorage
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse saved conversation state:', parseError);
        }
      }
      
      // Fallback to backend memory system
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is my conversation history?',
          context: {
            user_id: user?.id,
            request_type: 'load_conversation_memory'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const memoryMessages = data.memories?.map((m: any) => ({
          id: m.id,
          content: m.content,
          sender: m.topic === 'user_message' ? 'user' : 'pam',
          timestamp: m.created_at,
          context: m.context
        })) || [];
        setMessages(memoryMessages);
        console.log('📚 PAM: Loaded conversation from backend:', memoryMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
    }
  };

  const saveToMemory = async (message: string, sender: 'user' | 'pam', context?: any) => {
    try {
      // Use PAM's built-in memory system instead of generic actions endpoint
      // The PAM chat endpoint automatically saves conversation history
      console.log('💾 Saving to PAM memory:', { message: message.substring(0, 100), sender, user_id: user?.id });
      
      // PAM automatically saves messages when processing them through the chat endpoint
      // No need for explicit memory saving as it's handled by the agentic orchestrator
      
    } catch (error) {
      console.error('Failed to save to memory:', error);
    }
  };

  const connectToBackend = useCallback(async () => {
    console.log('🔌 PAM connectToBackend called with:', { userId: user?.id, hasToken: !!sessionToken });
    if (!user?.id) {
      console.log('❌ PAM: No user ID, cannot connect');
      return;
    }

    // First check if backend is healthy
    try {
      const healthResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com'}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!healthResponse.ok) {
        console.warn('⚠️ PAM backend health check failed, using fallback mode');
        setConnectionStatus("Disconnected");
        addMessage("🤖 Hi! I'm PAM. The live backend is currently unavailable, but I can still help you using the REST API. How can I assist you today?", "pam");
        return;
      }
    } catch (error) {
      console.error('❌ PAM backend health check error:', error);
      setConnectionStatus("Disconnected");
      addMessage("🤖 Hi! I'm PAM. I'm having trouble connecting to the backend, but I can still help you using the REST API. How can I assist you today?", "pam");
      return;
    }

    try {
      // IMPORTANT: Using correct PAM endpoint /api/v1/pam/ws
      // Fix: Use reference token for WebSocket to avoid URL length issues
      const baseWebSocketUrl = getWebSocketUrl('/api/v1/pam/ws');
      
      // Get a short reference token instead of the full JWT
      let tokenForWs = sessionToken;
      try {
        // Check if we should use reference tokens
        const useReferenceTokens = localStorage.getItem('use_reference_tokens') !== 'false';
        if (useReferenceTokens && sessionToken) {
          // For WebSocket, use the user ID instead of the full token to avoid URL length limits
          tokenForWs = user?.id || 'demo-token';
          console.log('🎫 Using user ID for WebSocket authentication to avoid URL limits');
        }
      } catch (error) {
        console.warn('Could not determine reference token preference, using fallback');
        tokenForWs = user?.id || 'demo-token';
      }
      
      const wsUrl = `${baseWebSocketUrl}?token=${encodeURIComponent(tokenForWs)}`;
      console.log('🔧 PAM Base WebSocket URL:', baseWebSocketUrl);
      console.log('🌐 PAM WebSocket URL (using short token):', wsUrl);
      console.log('✅ Target endpoint: /api/v1/pam/ws');
      
      // Validate that we're actually hitting the right endpoint
      if (!wsUrl.includes('/api/v1/pam/ws')) {
        console.error('❌ WebSocket URL validation failed! Expected /api/v1/pam/ws but got:', wsUrl);
        throw new Error('WebSocket endpoint validation failed');
      }
      
      setConnectionStatus("Connecting");
      console.log('🔄 PAM: Creating WebSocket connection...');
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ PAM WebSocket connected successfully');
        setConnectionStatus("Connected");
        setReconnectAttempts(0); // Reset reconnect attempts on successful connection
        
        // Clear any pending reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // ROBUST MEMORY: Only show greeting if no previous conversation
        if (messages.length === 0) {
          addMessage("🤖 Hi! I'm PAM, your autonomous agentic AI travel companion! I can autonomously plan complex multi-step journeys, reason through complex logistics like Sydney→Hobart ferry crossings, learn from our conversations, and proactively identify potential issues. I use advanced tools for deep thinking, user profiling, and intelligent decision-making. How can I demonstrate my agentic capabilities for you today?", "pam");
        } else {
          console.log('📚 PAM: Session restored with existing conversation history');
        }
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle chat responses
          if (message.type === 'chat_response') {
            const content = message.content || message.message || message.response;
            addMessage(content, "pam");
            // Note: PAM backend automatically saves all conversation history
            
            // Display agentic capabilities information
            if (message.agentic_info) {
              displayAgenticInfo(message.agentic_info);
            }
            
            // Show thinking process if available
            if (message.thinking_process) {
              displayThinkingProcess(message.thinking_process);
            }
            
            // Handle autonomous actions
            if (message.autonomous_actions) {
              handleAutonomousActions(message.autonomous_actions);
            }
            
            // Handle Mundi geospatial data if present
            if (message.mundi_data) {
              console.log('🗺️ Received Mundi data:', message.mundi_data);
              // Dispatch event for MundiLayer to display results
              window.dispatchEvent(new CustomEvent('mundi-data-available', {
                detail: message.mundi_data
              }));
            }
          }
          
          // Handle UI action commands
          if (message.type === 'ui_action') {
            handleUIAction(message);
          }
        } catch (error) {
          console.error('Error parsing PAM message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 PAM WebSocket closed:', event.code, event.reason);
        setConnectionStatus("Disconnected");
        
        // ROBUST MEMORY: Save conversation state on disconnect
        try {
          localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
            messages: messages.slice(-10), // Keep last 10 messages
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }));
          console.log('💾 PAM: Conversation state saved to localStorage');
        } catch (error) {
          console.warn('⚠️ Could not save conversation state:', error);
        }
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
          console.log(`🔄 PAM reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectToBackend();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ PAM WebSocket error:', error);
        setConnectionStatus("Disconnected");
      };
    } catch (error) {
      console.error('❌ PAM WebSocket creation error:', error);
      setConnectionStatus("Disconnected");
    }
  }, [user?.id, sessionToken]);

  const displayAgenticInfo = (agenticInfo: any) => {
    console.log('🧠 Agentic capabilities displayed:', agenticInfo);
    const infoMessage = `🧠 **Agentic Analysis Active**\n\n${agenticInfo.capabilities?.join('\n• ') || 'Advanced AI reasoning engaged'}`;
    addMessage(infoMessage, "pam");
  };

  const displayThinkingProcess = (thinkingProcess: any) => {
    console.log('💭 Thinking process:', thinkingProcess);
    const thinkingMessage = `💭 **PAM's Thinking Process**\n\n${thinkingProcess.process?.join('\n') || 'Processing complex request...'}`;
    addMessage(thinkingMessage, "pam");
  };

  const handleAutonomousActions = (autonomousActions: any[]) => {
    console.log('🚀 Autonomous actions triggered:', autonomousActions);
    autonomousActions.forEach((action, index) => {
      setTimeout(() => {
        const actionMessage = `🚀 **Autonomous Action ${index + 1}**: ${action.description || action.action}\n${action.result || 'Action completed successfully'}`;
        addMessage(actionMessage, "pam");
      }, index * 1000); // Stagger actions for visual effect
    });
  };

  const handleUIAction = (message: any) => {
    try {
      const { action, payload } = message;
      
      // Add visual feedback with animation
      pamUIController.showToast(`PAM is performing: ${action}`, 'default');
      
      switch (action) {
        case 'navigate':
          // Highlight navigation action
          if (payload.elementId) {
            pamUIController.highlightElement(payload.elementId, 2000);
          }
          
          // Navigate with smooth transition
          setTimeout(() => {
            pamUIController.navigateToPage(payload.page, payload.params);
          }, 500);
          break;
          
        case 'fill_form':
          // Highlight form before filling
          if (payload.formId) {
            pamUIController.highlightElement(payload.formId, 3000);
          }
          
          // Fill form with delay for visual feedback
          setTimeout(() => {
            pamUIController.fillForm(payload.formId, payload.data);
            pamUIController.showToast('Form filled successfully!');
          }, 1000);
          break;
          
        case 'highlight':
          pamUIController.highlightElement(payload.elementId, payload.duration || 3000);
          break;
          
        case 'toast':
          pamUIController.showToast(payload.message, payload.variant);
          break;
          
        default:
          console.warn('Unknown UI action:', action);
      }
      
      // Add message about the action
      addMessage(`🔧 ${action.replace('_', ' ')} action completed`, "pam");
      
    } catch (error) {
      console.error('Error handling UI action:', error);
      pamUIController.showToast('Failed to perform UI action', 'destructive');
    }
  };

  // Initialize wake word detection when component mounts
  useEffect(() => {
    initializeWakeWordDetection();
    return () => {
      // Cleanup wake word detection
      if (wakeWordRecognition) {
        wakeWordRecognition.stop();
      }
    };
  }, []);

  const initializeWakeWordDetection = () => {
    try {
      // Check if SpeechRecognition is available
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('⚠️ SpeechRecognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const latest = event.results[event.results.length - 1];
        if (latest.isFinal) {
          const transcript = latest[0].transcript.toLowerCase().trim();
          console.log('🎙️ Wake word detection heard:', transcript);
          
          // Check for "Hi PAM" or variations
          if (transcript.includes('hi pam') || transcript.includes('hey pam') || 
              transcript.includes('hello pam') || transcript.includes('hi palm')) {
            console.log('✅ Wake word detected!');
            handleWakeWordDetected();
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('⚠️ Wake word recognition error:', event.error);
        if (event.error === 'not-allowed') {
          console.warn('⚠️ Microphone permission denied for wake word detection');
        }
      };

      recognition.onend = () => {
        // Restart recognition if wake word listening is still enabled
        if (isWakeWordListening && !isListening) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.warn('⚠️ Could not restart wake word recognition:', error);
            }
          }, 100);
        }
      };

      setWakeWordRecognition(recognition);
      
      // Start wake word detection automatically if user wants it
      const wakeWordEnabled = localStorage.getItem('pam_wake_word_enabled') !== 'false';
      if (wakeWordEnabled) {
        startWakeWordListening(recognition);
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize wake word detection:', error);
    }
  };

  const startWakeWordListening = (recognition?: SpeechRecognition) => {
    const recognizer = recognition || wakeWordRecognition;
    if (!recognizer) return;

    try {
      recognizer.start();
      setIsWakeWordListening(true);
      localStorage.setItem('pam_wake_word_enabled', 'true');
      console.log('👂 Wake word detection started - say "Hi PAM" to activate');
    } catch (error) {
      console.warn('⚠️ Could not start wake word detection:', error);
    }
  };

  const stopWakeWordListening = () => {
    if (wakeWordRecognition) {
      wakeWordRecognition.stop();
      setIsWakeWordListening(false);
      localStorage.setItem('pam_wake_word_enabled', 'false');
      console.log('🔇 Wake word detection stopped');
    }
  };

  const handleWakeWordDetected = () => {
    // Open PAM if not already open
    if (!isOpen) {
      setIsOpen(true);
      console.log('📱 PAM opened by wake word');
    }
    
    // Start voice recording automatically
    setTimeout(() => {
      handleVoiceToggle();
    }, 500); // Small delay to ensure PAM is open
  };

  const handleVoiceToggle = async () => {
    try {
      if (!isListening) {
        // Start recording
        setVoiceStatus("listening");
        console.log('🎤 Requesting microphone access...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          console.log('🛑 Recording stopped, processing audio...');
          setVoiceStatus("processing");
          
          const audioBlob = new Blob(chunks, { type: recorder.mimeType });
          console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
          
          await handleVoiceSubmission(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔌 Audio track stopped');
          });
          
          setVoiceStatus("idle");
        };

        recorder.onerror = (event) => {
          console.error('❌ MediaRecorder error:', event);
          setVoiceStatus("error");
          addMessage("Recording error occurred. Please try again.", "pam");
        };

        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        setIsListening(true);
        
        console.log('🎤 Started voice recording');
        addMessage("🟢 Recording... Click the green microphone to stop recording.", "pam");
        
        // Auto-stop after 30 seconds to prevent infinite recording
        setTimeout(() => {
          if (isListening && recorder.state === 'recording') {
            console.log('⏰ Auto-stopping recording after 30 seconds');
            recorder.stop();
            setIsListening(false);
          }
        }, 30000);
        
      } else {
        // Stop recording
        console.log('🛑 Stopping voice recording...');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }
    } catch (error) {
      console.error('❌ Voice recording error:', error);
      setVoiceStatus("error");
      setIsListening(false);
      
      if (error.name === 'NotAllowedError') {
        addMessage("🚫 Microphone access denied. Please allow microphone permissions and try again.", "pam");
      } else if (error.name === 'NotFoundError') {
        addMessage("🎤 No microphone found. Please check your audio devices.", "pam");
      } else {
        addMessage(`Voice recording error: ${error.message}. Please try again.`, "pam");
      }
    }
  };

  const handleVoiceSubmission = async (audioBlob: Blob) => {
    try {
      console.log('🎤 Processing voice message...', `${audioBlob.size} bytes`);
      setIsProcessingVoice(true);
      
      // Remove the temporary processing message and add a better one
      const processingMessage = addMessage("🎤 Processing your voice message...", "pam");

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`);

      console.log('📤 Sending audio to backend...');
      const response = await authenticatedFetch('/api/v1/pam/voice', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('📥 Response received, content-type:', contentType);
        
        if (contentType && contentType.startsWith('audio/')) {
          // Backend returned audio - play it
          const audioBuffer = await response.arrayBuffer();
          const responseAudioBlob = new Blob([audioBuffer], { type: contentType });
          const audioUrl = URL.createObjectURL(responseAudioBlob);
          const audio = new Audio(audioUrl);
          
          // Get transcription and response text from headers
          const transcription = response.headers.get('X-Transcription') || '';
          const responseText = response.headers.get('X-Response-Text') || 'PAM responded with audio';
          const pipeline = response.headers.get('X-Pipeline') || 'STT→LLM→TTS';
          
          console.log(`✅ Voice response received via ${pipeline}`);
          console.log('📝 Transcription:', transcription);
          console.log('🤖 Response:', responseText);
          
          // Remove processing message
          setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
          
          // Show transcription and response
          if (transcription && transcription.trim()) {
            addMessage(transcription, "user");
          }
          addMessage(`${responseText} 🔊`, "pam");
          
          // Play audio response
          audio.oncanplaythrough = () => {
            console.log('🔊 Playing audio response...');
            audio.play().catch(err => {
              console.warn('⚠️ Could not play audio:', err);
              addMessage("(Audio response ready but playback failed)", "pam");
            });
          };
          
          audio.onerror = (err) => {
            console.warn('⚠️ Audio playback error:', err);
            addMessage("(Audio response received but playback failed)", "pam");
          };
          
          // Cleanup audio URL after playback
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            console.log('🔄 Audio playback completed');
          };
          
        } else {
          // Backend returned JSON (fallback or error)
          const data = await response.json();
          console.log('📝 Voice response received as JSON:', data);
          
          // Remove processing message
          setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
          
          // Show user's transcribed message if available
          if (data.text && data.text.trim()) {
            addMessage(data.text, "user");
          }
          
          // Handle different response types with better user guidance
          if (data.response) {
            // Successful voice processing but no audio
            if (data.voice_ready === false && data.guidance) {
              addMessage(data.response, "pam");
              addMessage(`💡 ${data.guidance}`, "pam");
            } else {
              addMessage(data.response, "pam");
            }
          } else if (data.error) {
            // Voice processing error
            if (data.guidance) {
              addMessage(`${data.response || "I had trouble processing your voice message."}`, "pam");
              addMessage(`💡 ${data.guidance}`, "pam");
            } else {
              addMessage(`❌ ${data.error}`, "pam");
            }
          } else {
            // Fallback message
            addMessage("I processed your voice message but couldn't generate an audio response. You can continue typing your messages!", "pam");
          }
          
          // Log technical details for debugging
          if (data.pipeline) {
            console.log(`🔧 Voice pipeline: ${data.pipeline}`);
          }
          if (data.technical_details) {
            console.log(`🔍 Technical details: ${data.technical_details}`);
          }
        }
      } else {
        console.error('❌ Voice API response error:', response.status, response.statusText);
        // Remove processing message
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        addMessage("Sorry, I had trouble processing your voice message. Please try again.", "pam");
      }
    } catch (error) {
      console.error('❌ Voice submission error:', error);
      setIsProcessingVoice(false);
      addMessage("Sorry, there was an error processing your voice message.", "pam");
    } finally {
      setIsProcessingVoice(false);
      setVoiceStatus("idle");
    }
  };

  const addMessage = (content: string, sender: "user" | "pam"): PamMessage => {
    const newMessage: PamMessage = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      
      // ROBUST MEMORY: Save to localStorage on every message
      try {
        localStorage.setItem(`pam_conversation_${user?.id}`, JSON.stringify({
          messages: updatedMessages.slice(-10), // Keep last 10 messages
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('⚠️ Could not save message to localStorage:', error);
      }
      
      return updatedMessages;
    });
    
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const message = inputMessage.trim();
    addMessage(message, "user");
    // Note: PAM backend automatically saves all conversation history
    setInputMessage("");

    const messageData = {
      type: "chat",
      content: message,
      context: {
        user_id: user?.id,  // Move userId into context as expected by backend
        userLocation: userContext?.current_location,
        vehicleInfo: userContext?.vehicle_info,
        travelStyle: userContext?.travel_style,
        conversation_history: messages.slice(-5).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        })),
        timestamp: new Date().toISOString(),
        session_id: sessionId
      }
    };

    // Try WebSocket first if connected
    if (connectionStatus === "Connected" && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageData));
        return;
      } catch (error) {
        console.error('❌ Failed to send via WebSocket:', error);
      }
    }

    // Fallback to REST API
    try {
      const response = await authenticatedFetch('/api/v1/pam/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          context: messageData.context
        })
      });

      if (response.ok) {
        const data = await response.json();
        const pamResponse = data.response || data.message || data.content || "I'm sorry, I couldn't process that request.";
        addMessage(pamResponse, "pam");
        // Note: PAM backend automatically saves all conversation history
        
        // Handle any UI actions from the response
        if (data.ui_action) {
          handleUIAction(data.ui_action);
        }
      } else {
        addMessage("I'm having trouble connecting to the server. Please try again later.", "pam");
      }
    } catch (error) {
      console.error('❌ Failed to send message via REST API:', error);
      addMessage("I'm experiencing connection issues. Please check your internet connection and try again.", "pam");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPersonalizedGreeting = () => {
    if (!userContext) return "Hi! I'm PAM";
    const location = userContext.current_location || "your location";
    const vehicle = userContext.vehicle_info?.type || "vehicle";
    return `Hi! I'm PAM, your travel companion. I see you're in ${location} with your ${vehicle}. Ready for an adventure?`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  // --- UI ---
  if (mode === "sidebar") {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center space-x-3">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="PAM"
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-gray-800">PAM</h3>
              <p className="text-xs text-gray-500">
                {connectionStatus === "Connected" ? "🟢 Agentic AI Online" : 
                 connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm">
              <p>{getPersonalizedGreeting()}</p>
              <div className="mt-4 space-y-2">
                <button 
                  onClick={() => setInputMessage("Autonomously plan a complex trip from Sydney to Hobart with ferry logistics")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <MapPin className="w-4 h-4" />
                  🧠 Autonomous Complex Trip Planning
                </button>
                <button 
                  onClick={() => setInputMessage("Show me your thinking process for planning a budget-friendly 3-week road trip")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <Calendar className="w-4 h-4" />
                  💭 Show AI Reasoning Process
                </button>
                <button 
                  onClick={() => setInputMessage("Use your agentic tools to analyze my profile and suggest improvements")}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                >
                  <DollarSign className="w-4 h-4" />
                  🚀 Proactive Profile Analysis
                </button>
                <button 
                  onClick={() => isWakeWordListening ? stopWakeWordListening() : startWakeWordListening()}
                  className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                    isWakeWordListening ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {isWakeWordListening ? "👂 Wake Word Active - Say 'Hi PAM'" : "🎙️ Enable 'Hi PAM' Wake Word"}
                </button>
                <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    console.log('🧪 PAM MAIN: Session token:', session?.access_token?.substring(0, 30));
                    console.log('🧪 PAM MAIN: Token parts:', session?.access_token?.split('.').length);
                    console.log('🧪 PAM MAIN: Is mock token?', session?.access_token === 'mock-token');
                    console.log('🧪 PAM MAIN: User:', user?.email);
                  }}
                  className="flex items-center gap-2 w-full p-2 text-left text-xs bg-red-100 rounded-lg hover:bg-red-200"
                >
                  🔍 Debug Session Token
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask PAM anything..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={connectionStatus !== "Connected"}
            />
            <button
              onClick={handleVoiceToggle}
              className={`p-2 rounded-lg transition-colors relative ${
                voiceStatus === "listening" ? "bg-green-500 text-white" : 
                voiceStatus === "processing" ? "bg-yellow-500 text-white" :
                voiceStatus === "error" ? "bg-red-600 text-white" :
                "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              disabled={connectionStatus !== "Connected" || isProcessingVoice}
              title={
                voiceStatus === "listening" ? "🟢 Recording... Click to stop" :
                voiceStatus === "processing" ? "⏳ Processing voice..." :
                voiceStatus === "error" ? "❌ Voice error" :
                "🎤 Start voice recording"
              }
            >
              <Mic className="w-4 h-4" />
              {voiceStatus === "listening" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full animate-pulse" 
                     title="Recording active" />
              )}
              {isWakeWordListening && voiceStatus === "idle" && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
                     title="Wake word 'Hi PAM' active" />
              )}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
              className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default/floating mode
  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-white rounded-full p-3 shadow-lg transition-all z-50"
        aria-label="Open PAM Chat"
      >
          <div className="relative">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="PAM Assistant"
              className="w-8 h-8 rounded-full"
            />
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            connectionStatus === "Connected" ? "bg-green-500" : 
            connectionStatus === "Connecting" ? "bg-yellow-500" : "bg-red-500"
          }`} />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary/5 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img
                src={getPublicAssetUrl('Pam.webp')}
                alt="PAM"
                className="w-8 h-8 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-800">PAM</h3>
                <p className="text-xs text-gray-500">
                  {connectionStatus === "Connected" ? "🟢 Agentic AI Reasoning" : 
                   connectionStatus === "Connecting" ? "🟡 Connecting..." : "🔴 Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close PAM Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <p>{getPersonalizedGreeting()}</p>
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => setInputMessage("Autonomously plan a complex trip from Sydney to Hobart with ferry logistics")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <MapPin className="w-4 h-4" />
                    🧠 Autonomous Complex Trip Planning
                  </button>
                  <button 
                    onClick={() => setInputMessage("Show me your thinking process for planning a budget-friendly 3-week road trip")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <Calendar className="w-4 h-4" />
                    💭 Show AI Reasoning Process
                  </button>
                  <button 
                    onClick={() => setInputMessage("Use your agentic tools to analyze my profile and suggest improvements")}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <DollarSign className="w-4 h-4" />
                    🚀 Proactive Profile Analysis
                  </button>
                  <button 
                    onClick={() => isWakeWordListening ? stopWakeWordListening() : startWakeWordListening()}
                    className={`flex items-center gap-2 w-full p-2 text-left text-xs rounded-lg ${
                      isWakeWordListening ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    {isWakeWordListening ? "👂 Wake Word Active - Say 'Hi PAM'" : "🎙️ Enable 'Hi PAM' Wake Word"}
                  </button>
                  <button 
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      console.log('🧪 PAM MAIN: Session token:', session?.access_token?.substring(0, 30));
                      console.log('🧪 PAM MAIN: Token parts:', session?.access_token?.split('.').length);
                      console.log('🧪 PAM MAIN: Is mock token?', session?.access_token === 'mock-token');
                      console.log('🧪 PAM MAIN: User:', user?.email);
                    }}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-red-100 rounded-lg hover:bg-red-200"
                  >
                    🔍 Debug Session Token
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask PAM anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={connectionStatus !== "Connected"}
              />
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-lg transition-colors relative ${
                  voiceStatus === "listening" ? "bg-green-500 text-white" : 
                  voiceStatus === "processing" ? "bg-yellow-500 text-white" :
                  voiceStatus === "error" ? "bg-red-600 text-white" :
                  "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                disabled={connectionStatus !== "Connected" || isProcessingVoice}
                title={
                  voiceStatus === "listening" ? "🟢 Recording... Click to stop" :
                  voiceStatus === "processing" ? "⏳ Processing voice..." :
                  voiceStatus === "error" ? "❌ Voice error" :
                  "🎤 Start voice recording"
                }
              >
                <Mic className="w-4 h-4" />
                {voiceStatus === "listening" && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full animate-pulse" 
                       title="Recording active" />
                )}
                {isWakeWordListening && voiceStatus === "idle" && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
                       title="Wake word 'Hi PAM' active" />
                )}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
                className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {connectionStatus !== "Connected" && (
              <p className="text-xs text-red-500 mt-1">
                {connectionStatus === "Connecting" ? "Connecting to PAM..." : "PAM is offline"}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Pam;
