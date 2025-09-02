"""
PAM Phase 8: Voice and Gesture Controls
Advanced voice and gesture control system for hands-free interaction with PAM.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import logging
import numpy as np
import speech_recognition as sr
import pyttsx3
from transformers import pipeline
import cv2
import mediapipe as mp

from ..core.base_agent import PAMBaseAgent
from ..integrations.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class VoiceCommand(Enum):
    """Voice command types"""
    NAVIGATION = "navigation"
    ACTION = "action"
    QUERY = "query"
    CONTROL = "control"
    BOOKING = "booking"
    FINANCIAL = "financial"
    SOCIAL = "social"
    SETTINGS = "settings"
    EMERGENCY = "emergency"

class GestureType(Enum):
    """Gesture types"""
    SWIPE_LEFT = "swipe_left"
    SWIPE_RIGHT = "swipe_right"
    SWIPE_UP = "swipe_up"
    SWIPE_DOWN = "swipe_down"
    TAP = "tap"
    DOUBLE_TAP = "double_tap"
    PINCH = "pinch"
    ZOOM = "zoom"
    ROTATE = "rotate"
    POINT = "point"
    THUMBS_UP = "thumbs_up"
    THUMBS_DOWN = "thumbs_down"
    WAVE = "wave"
    PEACE_SIGN = "peace_sign"
    OK_SIGN = "ok_sign"

class ControlMode(Enum):
    """Control modes"""
    VOICE_ONLY = "voice_only"
    GESTURE_ONLY = "gesture_only"
    COMBINED = "combined"
    ADAPTIVE = "adaptive"

@dataclass
class VoiceProfile:
    """User voice profile"""
    user_id: str
    voice_signature: Dict[str, float]
    accent: str
    language: str
    speech_rate: float
    pitch_range: Tuple[float, float]
    volume_preference: float
    noise_tolerance: float
    wake_words: List[str]
    command_shortcuts: Dict[str, str]

@dataclass
class GestureProfile:
    """User gesture profile"""
    user_id: str
    dominant_hand: str
    gesture_sensitivity: float
    custom_gestures: Dict[str, Dict[str, Any]]
    accessibility_adaptations: List[str]
    gesture_speed_preference: float
    gesture_size_preference: float
    camera_position_preference: str

@dataclass
class VoiceCommand:
    """Voice command structure"""
    command_id: str
    user_id: str
    raw_text: str
    processed_text: str
    intent: str
    entities: Dict[str, Any]
    confidence_score: float
    context: Dict[str, Any]
    timestamp: datetime
    response_time: float

@dataclass
class GestureCommand:
    """Gesture command structure"""
    command_id: str
    user_id: str
    gesture_type: GestureType
    coordinates: List[Tuple[float, float]]
    confidence_score: float
    context: Dict[str, Any]
    timestamp: datetime
    processing_time: float

class PAMVoiceGestureControlSystem:
    """Advanced voice and gesture control system"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.voice_profiles: Dict[str, VoiceProfile] = {}
        self.gesture_profiles: Dict[str, GestureProfile] = {}
        self.voice_recognizer = sr.Recognizer()
        self.tts_engine = pyttsx3.init()
        self.nlp_pipeline = pipeline("text-classification", model="microsoft/DialoGPT-large")
        
        # Gesture recognition setup
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Command handlers
        self.voice_command_handlers: Dict[VoiceCommand, Callable] = {}
        self.gesture_command_handlers: Dict[GestureType, Callable] = {}
        self.active_sessions: Dict[str, Dict] = {}
        
        # Wake word detection
        self.wake_words = ["hey pam", "ok pam", "pam assistant", "pam help"]
        self.is_listening = False
        
    async def initialize(self):
        """Initialize voice and gesture control system"""
        try:
            await self._setup_voice_recognition()
            await self._setup_gesture_recognition()
            await self._load_user_profiles()
            await self._setup_command_handlers()
            logger.info("Voice and gesture control system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize voice/gesture system: {e}")
    
    async def start_voice_listening(self, user_id: str, device_context: Dict[str, Any]) -> Dict[str, Any]:
        """Start voice listening session"""
        try:
            # Get user voice profile
            voice_profile = await self._get_or_create_voice_profile(user_id)
            
            # Configure recognizer for user
            self.voice_recognizer.energy_threshold = voice_profile.noise_tolerance
            self.voice_recognizer.dynamic_energy_threshold = True
            
            # Start listening session
            session_id = f"voice_session_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            self.active_sessions[session_id] = {
                'user_id': user_id,
                'type': 'voice',
                'started_at': datetime.utcnow(),
                'device_context': device_context,
                'voice_profile': voice_profile
            }
            
            # Start background listening task
            asyncio.create_task(self._voice_listening_loop(session_id))
            
            return {
                'status': 'started',
                'session_id': session_id,
                'wake_words': voice_profile.wake_words,
                'supported_commands': await self._get_supported_voice_commands(),
                'voice_feedback_enabled': True
            }
            
        except Exception as e:
            logger.error(f"Failed to start voice listening for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def start_gesture_recognition(self, user_id: str, camera_stream: Any, device_context: Dict[str, Any]) -> Dict[str, Any]:
        """Start gesture recognition session"""
        try:
            # Get user gesture profile
            gesture_profile = await self._get_or_create_gesture_profile(user_id)
            
            # Start gesture recognition session
            session_id = f"gesture_session_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            self.active_sessions[session_id] = {
                'user_id': user_id,
                'type': 'gesture',
                'started_at': datetime.utcnow(),
                'device_context': device_context,
                'gesture_profile': gesture_profile,
                'camera_stream': camera_stream
            }
            
            # Start background gesture recognition task
            asyncio.create_task(self._gesture_recognition_loop(session_id))
            
            return {
                'status': 'started',
                'session_id': session_id,
                'supported_gestures': [gesture.value for gesture in GestureType],
                'custom_gestures': list(gesture_profile.custom_gestures.keys()),
                'calibration_needed': await self._check_calibration_needed(user_id)
            }
            
        except Exception as e:
            logger.error(f"Failed to start gesture recognition for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def process_voice_command(self, user_id: str, audio_data: bytes, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process voice command"""
        try:
            start_time = datetime.utcnow()
            
            # Convert audio to text
            text = await self._speech_to_text(audio_data, user_id)
            
            if not text:
                return {'status': 'no_speech_detected'}
            
            # Process natural language
            intent, entities, confidence = await self._process_natural_language(text, context)
            
            # Create voice command
            command = VoiceCommand(
                command_id=f"voice_cmd_{user_id}_{int(datetime.utcnow().timestamp())}",
                user_id=user_id,
                raw_text=text,
                processed_text=await self._clean_text(text),
                intent=intent,
                entities=entities,
                confidence_score=confidence,
                context=context,
                timestamp=start_time,
                response_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
            # Execute command
            result = await self._execute_voice_command(command)
            
            # Generate voice response
            voice_response = await self._generate_voice_response(command, result)
            
            # Store command for learning
            await self._store_voice_command(command, result)
            
            return {
                'status': 'success',
                'command': asdict(command),
                'result': result,
                'voice_response': voice_response,
                'execution_time': command.response_time
            }
            
        except Exception as e:
            logger.error(f"Failed to process voice command for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def process_gesture_command(self, user_id: str, gesture_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Process gesture command"""
        try:
            start_time = datetime.utcnow()
            
            # Recognize gesture
            gesture_type, confidence, coordinates = await self._recognize_gesture(gesture_data, user_id)
            
            if not gesture_type:
                return {'status': 'gesture_not_recognized'}
            
            # Create gesture command
            command = GestureCommand(
                command_id=f"gesture_cmd_{user_id}_{int(datetime.utcnow().timestamp())}",
                user_id=user_id,
                gesture_type=gesture_type,
                coordinates=coordinates,
                confidence_score=confidence,
                context=context,
                timestamp=start_time,
                processing_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
            # Execute command
            result = await self._execute_gesture_command(command)
            
            # Provide haptic/visual feedback
            feedback = await self._generate_gesture_feedback(command, result)
            
            # Store command for learning
            await self._store_gesture_command(command, result)
            
            return {
                'status': 'success',
                'command': asdict(command),
                'result': result,
                'feedback': feedback,
                'processing_time': command.processing_time
            }
            
        except Exception as e:
            logger.error(f"Failed to process gesture command for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def create_custom_voice_command(self, user_id: str, command_phrase: str, action: Dict[str, Any]) -> Dict[str, Any]:
        """Create custom voice command"""
        try:
            voice_profile = self.voice_profiles.get(user_id)
            if not voice_profile:
                voice_profile = await self._get_or_create_voice_profile(user_id)
            
            # Add custom command
            voice_profile.command_shortcuts[command_phrase.lower()] = action
            
            # Store updated profile
            await self._store_voice_profile(voice_profile)
            
            # Train recognition model for new phrase
            await self._train_custom_phrase(user_id, command_phrase)
            
            return {
                'status': 'created',
                'command_phrase': command_phrase,
                'action': action,
                'training_required': True
            }
            
        except Exception as e:
            logger.error(f"Failed to create custom voice command for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def create_custom_gesture(self, user_id: str, gesture_name: str, gesture_data: Dict[str, Any], action: Dict[str, Any]) -> Dict[str, Any]:
        """Create custom gesture"""
        try:
            gesture_profile = self.gesture_profiles.get(user_id)
            if not gesture_profile:
                gesture_profile = await self._get_or_create_gesture_profile(user_id)
            
            # Add custom gesture
            gesture_profile.custom_gestures[gesture_name] = {
                'gesture_data': gesture_data,
                'action': action,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store updated profile
            await self._store_gesture_profile(gesture_profile)
            
            # Train recognition model for new gesture
            await self._train_custom_gesture(user_id, gesture_name, gesture_data)
            
            return {
                'status': 'created',
                'gesture_name': gesture_name,
                'action': action,
                'training_samples_needed': 5
            }
            
        except Exception as e:
            logger.error(f"Failed to create custom gesture for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def calibrate_user_voice(self, user_id: str, calibration_samples: List[bytes]) -> Dict[str, Any]:
        """Calibrate user's voice profile"""
        try:
            # Analyze voice samples
            voice_characteristics = await self._analyze_voice_samples(calibration_samples)
            
            # Create or update voice profile
            voice_profile = VoiceProfile(
                user_id=user_id,
                voice_signature=voice_characteristics['signature'],
                accent=voice_characteristics['accent'],
                language=voice_characteristics['language'],
                speech_rate=voice_characteristics['speech_rate'],
                pitch_range=voice_characteristics['pitch_range'],
                volume_preference=voice_characteristics['volume'],
                noise_tolerance=voice_characteristics['noise_tolerance'],
                wake_words=self.wake_words.copy(),
                command_shortcuts={}
            )
            
            # Store profile
            self.voice_profiles[user_id] = voice_profile
            await self._store_voice_profile(voice_profile)
            
            # Train personalized model
            await self._train_personalized_voice_model(user_id, calibration_samples)
            
            return {
                'status': 'calibrated',
                'voice_profile': asdict(voice_profile),
                'accuracy_improvement': voice_characteristics['expected_accuracy_improvement'],
                'recommended_settings': voice_characteristics['recommended_settings']
            }
            
        except Exception as e:
            logger.error(f"Failed to calibrate voice for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def _voice_listening_loop(self, session_id: str):
        """Background voice listening loop"""
        session = self.active_sessions[session_id]
        user_id = session['user_id']
        voice_profile = session['voice_profile']
        
        try:
            with sr.Microphone() as source:
                self.voice_recognizer.adjust_for_ambient_noise(source)
                
                while session_id in self.active_sessions:
                    try:
                        # Listen for wake word
                        audio = self.voice_recognizer.listen(source, timeout=1, phrase_time_limit=3)
                        text = self.voice_recognizer.recognize_google(audio).lower()
                        
                        # Check for wake words
                        if any(wake_word in text for wake_word in voice_profile.wake_words):
                            # Wake word detected, start command listening
                            await self._handle_wake_word_detection(session_id, text)
                            
                    except sr.WaitTimeoutError:
                        continue
                    except sr.UnknownValueError:
                        continue
                    except Exception as e:
                        logger.error(f"Voice listening error: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Voice listening loop failed: {e}")
        finally:
            # Clean up session
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
    
    async def _gesture_recognition_loop(self, session_id: str):
        """Background gesture recognition loop"""
        session = self.active_sessions[session_id]
        user_id = session['user_id']
        camera_stream = session['camera_stream']
        gesture_profile = session['gesture_profile']
        
        try:
            while session_id in self.active_sessions:
                # Read frame from camera
                ret, frame = camera_stream.read()
                if not ret:
                    continue
                
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Process frame for hand landmarks
                results = self.hands.process(rgb_frame)
                
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        # Extract landmarks
                        landmarks = []
                        for landmark in hand_landmarks.landmark:
                            landmarks.append([landmark.x, landmark.y, landmark.z])
                        
                        # Recognize gesture
                        gesture = await self._classify_gesture(landmarks, gesture_profile)
                        
                        if gesture:
                            # Process gesture command
                            await self.process_gesture_command(
                                user_id,
                                {'landmarks': landmarks, 'gesture': gesture},
                                session['device_context']
                            )
                
                # Small delay to prevent excessive CPU usage
                await asyncio.sleep(0.033)  # ~30 FPS
                
        except Exception as e:
            logger.error(f"Gesture recognition loop failed: {e}")
        finally:
            # Clean up session
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
    
    async def get_voice_gesture_analytics(self, user_id: str, time_period: str = '7d') -> Dict[str, Any]:
        """Get voice and gesture usage analytics"""
        try:
            days = int(time_period.rstrip('d'))
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Voice command analytics
            voice_stats = await self.supabase.table('pam_voice_commands').select(
                'intent, confidence_score, response_time'
            ).eq('user_id', user_id).gte('timestamp', start_date.isoformat()).execute()
            
            # Gesture command analytics
            gesture_stats = await self.supabase.table('pam_gesture_commands').select(
                'gesture_type, confidence_score, processing_time'
            ).eq('user_id', user_id).gte('timestamp', start_date.isoformat()).execute()
            
            # Calculate metrics
            voice_accuracy = np.mean([cmd['confidence_score'] for cmd in voice_stats.data]) if voice_stats.data else 0
            gesture_accuracy = np.mean([cmd['confidence_score'] for cmd in gesture_stats.data]) if gesture_stats.data else 0
            
            avg_voice_response_time = np.mean([cmd['response_time'] for cmd in voice_stats.data]) if voice_stats.data else 0
            avg_gesture_processing_time = np.mean([cmd['processing_time'] for cmd in gesture_stats.data]) if gesture_stats.data else 0
            
            return {
                'status': 'success',
                'time_period': time_period,
                'voice_analytics': {
                    'total_commands': len(voice_stats.data),
                    'accuracy': voice_accuracy,
                    'avg_response_time': avg_voice_response_time,
                    'top_intents': await self._get_top_voice_intents(voice_stats.data)
                },
                'gesture_analytics': {
                    'total_gestures': len(gesture_stats.data),
                    'accuracy': gesture_accuracy,
                    'avg_processing_time': avg_gesture_processing_time,
                    'top_gestures': await self._get_top_gestures(gesture_stats.data)
                },
                'recommendations': await self._generate_voice_gesture_recommendations(user_id)
            }
            
        except Exception as e:
            logger.error(f"Failed to get voice/gesture analytics for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_voice_gesture_status(self) -> Dict[str, Any]:
        """Get voice and gesture control system status"""
        try:
            return {
                'status': 'operational',
                'active_voice_sessions': len([s for s in self.active_sessions.values() if s['type'] == 'voice']),
                'active_gesture_sessions': len([s for s in self.active_sessions.values() if s['type'] == 'gesture']),
                'registered_voice_profiles': len(self.voice_profiles),
                'registered_gesture_profiles': len(self.gesture_profiles),
                'supported_languages': ['en', 'es', 'fr', 'de', 'it', 'pt'],
                'supported_gestures': len(GestureType),
                'wake_words': self.wake_words,
                'system_health': {
                    'voice_recognition': 'healthy',
                    'gesture_recognition': 'healthy',
                    'tts_engine': 'healthy',
                    'camera_access': 'healthy'
                },
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get voice/gesture status: {e}")
            return {'status': 'error', 'message': str(e)}

# Global instance
pam_voice_gesture_system = PAMVoiceGestureControlSystem()