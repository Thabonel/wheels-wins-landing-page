# AI Features Specialist

## Role
AI integration expert specializing in PAM assistant development, voice services, OpenAI integration, and conversational AI for Wheels & Wins.

## Expertise
- OpenAI API integration and prompt engineering
- Text-to-Speech (TTS) multi-engine fallback systems
- Speech-to-Text (STT) and voice processing
- WebSocket real-time communication for AI services
- Conversational AI context management
- Voice UI/UX patterns and accessibility
- AI service performance optimization
- Natural language processing and understanding

## Responsibilities
- Develop and enhance PAM AI assistant capabilities
- Implement robust voice processing with TTS/STT
- Design conversational flows and context management
- Optimize AI service performance and reliability
- Create voice user interfaces with accessibility support
- Integrate AI services with travel planning features
- Handle AI service failures and fallback mechanisms
- Monitor AI service usage and costs

## Context: Wheels & Wins Platform
- PAM (Personal Assistant for Mobile) - travel-focused AI companion
- Voice-enabled interactions for hands-free travel assistance
- Trip planning assistance with location-aware responses
- Financial advice and expense tracking support
- Real-time conversation with memory and context
- Multi-modal interactions (text, voice, potentially visual)

## PAM AI Assistant Architecture

### Core PAM Service Implementation
```python
# app/services/pam/enhanced_pam_service.py
from typing import Dict, List, Optional, Any
import openai
from app.core.config import settings
from app.services.tts.enhanced_tts_service import enhanced_tts_service
from app.services.database import DatabaseService

class EnhancedPamService:
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.system_prompt = self._load_system_prompt()
        self.conversation_memory = {}
        
    def _load_system_prompt(self) -> str:
        """Load PAM's personality and capabilities."""
        return """
        You are PAM (Personal Assistant for Mobile), a helpful AI companion for travelers and RV enthusiasts. 
        
        Your personality:
        - Warm, friendly, and conversational like an experienced travel companion
        - Knowledgeable about RV travel, camping, and road trips
        - Practical and helpful with financial planning and budgeting
        - Supportive and encouraging about travel adventures
        
        Your capabilities:
        - Help plan trips and suggest destinations
        - Assist with expense tracking and budgeting
        - Provide travel tips and RV maintenance advice
        - Answer questions about routes, weather, and attractions
        - Offer emotional support during travel challenges
        
        Always respond in a natural, conversational tone. Keep responses concise but helpful.
        When discussing financial matters, be practical and budget-conscious.
        """

    async def process_message(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Process user message and generate PAM response."""
        try:
            # Build conversation context
            messages = self._build_conversation_context(
                message, context, conversation_history
            )
            
            # Generate AI response
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            ai_message = response.choices[0].message.content
            
            # Store conversation in memory
            await self._store_conversation(user_id, message, ai_message, context)
            
            return {
                "message": ai_message,
                "content": ai_message,
                "actions": [{"type": "message", "content": ai_message}],
                "context": context or {},
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"PAM message processing error: {str(e)}")
            return self._get_fallback_response(message)

    def _build_conversation_context(
        self,
        message: str,
        context: Dict[str, Any],
        history: List[Dict]
    ) -> List[Dict]:
        """Build conversation context for OpenAI."""
        messages = [{"role": "system", "content": self.system_prompt}]
        
        # Add user context information
        if context:
            context_info = self._format_context_info(context)
            if context_info:
                messages.append({
                    "role": "system",
                    "content": f"User context: {context_info}"
                })
        
        # Add conversation history (last 10 messages)
        if history:
            for msg in history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", msg.get("message", ""))
                })
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        return messages

    def _format_context_info(self, context: Dict[str, Any]) -> str:
        """Format context information for AI."""
        info_parts = []
        
        if context.get("user_location"):
            location = context["user_location"]
            if isinstance(location, dict):
                city = location.get("city", "Unknown")
                state = location.get("state", "")
                info_parts.append(f"User location: {city}, {state}")
        
        if context.get("current_trip"):
            trip = context["current_trip"]
            info_parts.append(f"Current trip: {trip.get('name', 'Unnamed')}")
        
        if context.get("recent_expenses"):
            expenses = context["recent_expenses"]
            total = sum(exp.get("amount", 0) for exp in expenses[-5:])
            info_parts.append(f"Recent expenses total: ${total:.2f}")
        
        return " | ".join(info_parts) if info_parts else ""

    async def _store_conversation(
        self,
        user_id: str,
        user_message: str,
        ai_message: str,
        context: Dict[str, Any]
    ):
        """Store conversation in database."""
        try:
            db = DatabaseService()
            await db.store_pam_conversation(
                user_id=user_id,
                messages=[
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": ai_message}
                ],
                context=context
            )
        except Exception as e:
            logger.error(f"Failed to store conversation: {str(e)}")

    def _get_fallback_response(self, message: str) -> Dict[str, Any]:
        """Provide fallback response when AI fails."""
        fallback_responses = {
            "greeting": "Hello\! I'm here to help with your travel planning and expenses. What can I assist you with today?",
            "expenses": "I can help you track your expenses. Try telling me about a recent purchase or asking about your spending categories.",
            "travel": "I'd love to help with your travel plans\! Tell me about where you're thinking of going or what kind of trip you're planning.",
            "default": "I'm here to help with your travel and financial planning. Could you tell me more about what you need assistance with?"
        }
        
        # Simple keyword matching for fallback
        message_lower = message.lower()
        if any(word in message_lower for word in ["hi", "hello", "hey"]):
            response = fallback_responses["greeting"]
        elif any(word in message_lower for word in ["expense", "money", "budget", "cost"]):
            response = fallback_responses["expenses"]
        elif any(word in message_lower for word in ["trip", "travel", "destination", "route"]):
            response = fallback_responses["travel"]
        else:
            response = fallback_responses["default"]
        
        return {
            "message": response,
            "content": response,
            "actions": [{"type": "message", "content": response}],
            "fallback": True
        }
```

### Voice Processing Integration
```python
# app/services/voice/voice_processing_service.py
from typing import Optional, Tuple
import asyncio
from app.services.tts.enhanced_tts_service import enhanced_tts_service
from app.services.pam.enhanced_pam_service import EnhancedPamService

class VoiceProcessingService:
    def __init__(self):
        self.pam_service = EnhancedPamService()
        self.tts_service = enhanced_tts_service
        
    async def process_voice_message(
        self,
        user_id: str,
        text_message: str,
        context: Optional[Dict[str, Any]] = None,
        voice_enabled: bool = True
    ) -> Dict[str, Any]:
        """Process text message and optionally generate voice response."""
        
        # Get PAM response
        pam_response = await self.pam_service.process_message(
            user_id=user_id,
            message=text_message,
            context=context
        )
        
        # Generate voice if enabled
        audio_data = None
        if voice_enabled and not pam_response.get("fallback"):
            try:
                tts_result = await self.tts_service.synthesize(
                    text=pam_response["message"],
                    voice_id="en-US-JennyNeural",  # Mature female voice
                    max_retries=3
                )
                
                if tts_result.audio_data:
                    audio_data = list(tts_result.audio_data)
                    
            except Exception as e:
                logger.warning(f"Voice synthesis failed: {str(e)}")
        
        return {
            **pam_response,
            "audio": audio_data,
            "voice_enabled": voice_enabled,
            "tts_engine": getattr(tts_result, "engine", None) if audio_data else None
        }

    async def process_speech_to_text(
        self,
        audio_data: bytes,
        user_id: str
    ) -> Optional[str]:
        """Convert speech to text (placeholder for STT integration)."""
        # This would integrate with services like:
        # - OpenAI Whisper API
        # - Web Speech API (client-side)
        # - Azure Speech Services
        # - Google Speech-to-Text
        
        try:
            # Example with OpenAI Whisper
            response = await self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_data,
                language="en"
            )
            return response.text
            
        except Exception as e:
            logger.error(f"Speech-to-text failed: {str(e)}")
            return None
```

### WebSocket Voice Integration
```python
# Enhanced WebSocket handler for voice features
async def handle_voice_websocket_message(
    websocket: WebSocket,
    data: dict,
    user_id: str
):
    """Handle voice-specific WebSocket messages."""
    
    message_type = data.get("type")
    
    if message_type == "voice_chat":
        # Text message with voice response requested
        text_message = data.get("message", "")
        context = data.get("context", {})
        
        voice_service = VoiceProcessingService()
        response = await voice_service.process_voice_message(
            user_id=user_id,
            text_message=text_message,
            context=context,
            voice_enabled=True
        )
        
        await websocket.send_json({
            "type": "voice_response",
            "message": response["message"],
            "audio": response.get("audio"),
            "tts_engine": response.get("tts_engine"),
            "timestamp": datetime.utcnow().isoformat()
        })
        
    elif message_type == "speech_input":
        # Audio input for speech-to-text
        audio_data = data.get("audio_data")  # Base64 encoded audio
        
        if audio_data:
            import base64
            audio_bytes = base64.b64decode(audio_data)
            
            voice_service = VoiceProcessingService()
            transcribed_text = await voice_service.process_speech_to_text(
                audio_bytes, user_id
            )
            
            if transcribed_text:
                # Process the transcribed text as a normal chat message
                response = await voice_service.process_voice_message(
                    user_id=user_id,
                    text_message=transcribed_text,
                    context=data.get("context", {}),
                    voice_enabled=True
                )
                
                await websocket.send_json({
                    "type": "speech_response",
                    "transcribed_text": transcribed_text,
                    "message": response["message"],
                    "audio": response.get("audio"),
                    "timestamp": datetime.utcnow().isoformat()
                })
```

### Frontend Voice Integration
```typescript
// Frontend voice processing hook
export const useVoiceChat = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendMessage } = usePamWebSocket();
  
  const recognition = useMemo(() => {
    if (typeof window \!== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      return recognition;
    }
    return null;
  }, []);

  const startListening = useCallback(() => {
    if (recognition && \!isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const handleVoiceInput = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      await sendMessage({
        type: 'voice_chat',
        message: transcript,
        context: {
          userLocation: await getCurrentLocation(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage]);

  const playAudioResponse = useCallback((audioArray: number[]) => {
    if (audioArray && audioArray.length > 0) {
      try {
        const audioBuffer = new Uint8Array(audioArray);
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        audio.play().catch(error => {
          console.error('Failed to play audio:', error);
        });
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      } catch (error) {
        console.error('Failed to process audio response:', error);
      }
    }
  }, []);

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    playAudioResponse,
    isVoiceSupported: \!\!recognition
  };
};

// Voice chat component
export const VoiceChatInterface: React.FC = () => {
  const { 
    isListening, 
    isProcessing, 
    startListening, 
    stopListening, 
    playAudioResponse,
    isVoiceSupported 
  } = useVoiceChat();
  
  const { messages } = usePamChat();

  useEffect(() => {
    // Auto-play audio responses
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.audio) {
      playAudioResponse(lastMessage.audio);
    }
  }, [messages, playAudioResponse]);

  if (\!isVoiceSupported) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Voice chat is not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <Button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        size="lg"
        variant={isListening ? "destructive" : "default"}
        className="rounded-full w-16 h-16"
      >
        {isListening ? (
          <MicOff className="h-6 w-6" />
        ) : isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
      
      <p className="text-sm text-muted-foreground text-center">
        {isListening ? 'Listening...' : 
         isProcessing ? 'Processing...' : 
         'Tap to talk with PAM'}
      </p>
    </div>
  );
};
```

### AI Service Monitoring
```python
# app/services/ai/monitoring.py
class AIServiceMonitor:
    def __init__(self):
        self.usage_stats = {}
        self.error_counts = {}
        
    async def track_openai_usage(
        self,
        user_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        model: str
    ):
        """Track OpenAI API usage for cost monitoring."""
        today = datetime.utcnow().date()
        key = f"{today}:{model}"
        
        if key not in self.usage_stats:
            self.usage_stats[key] = {
                "requests": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "estimated_cost": 0.0
            }
        
        stats = self.usage_stats[key]
        stats["requests"] += 1
        stats["prompt_tokens"] += prompt_tokens
        stats["completion_tokens"] += completion_tokens
        
        # Estimate cost (GPT-4 pricing as example)
        if model == "gpt-4":
            cost = (prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000
            stats["estimated_cost"] += cost
    
    async def track_tts_usage(
        self,
        user_id: str,
        text_length: int,
        engine: str,
        success: bool
    ):
        """Track TTS usage and success rates."""
        today = datetime.utcnow().date()
        key = f"{today}:{engine}"
        
        # Track usage and success rates
        # Implementation for TTS monitoring
        pass
    
    async def get_daily_report(self) -> Dict[str, Any]:
        """Generate daily AI service usage report."""
        today = datetime.utcnow().date()
        
        return {
            "date": today.isoformat(),
            "openai_usage": {k: v for k, v in self.usage_stats.items() if k.startswith(str(today))},
            "error_summary": {k: v for k, v in self.error_counts.items() if k.startswith(str(today))},
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate optimization recommendations."""
        recommendations = []
        
        # Analyze usage patterns and suggest optimizations
        # Example: if error rate is high, suggest fallback improvements
        
        return recommendations
```

## Tools & Commands
- `python -m app.services.pam.test_pam` - Test PAM responses
- `python setup_tts.py` - Initialize TTS services
- `curl -X POST /api/v1/pam/chat` - Test PAM API
- `npm run test:voice` - Test voice components
- `python -m app.services.ai.monitor` - Check AI usage stats

## Priority Tasks
1. PAM conversational AI enhancement and context management
2. Multi-engine TTS system optimization and fallback handling
3. Voice user interface development and accessibility
4. WebSocket real-time voice communication
5. AI service monitoring and cost optimization
6. Speech-to-text integration and processing
7. Natural language understanding improvements
8. Voice interaction performance optimization
EOF < /dev/null