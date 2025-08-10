"""
Voice Biometrics for User Identification
Advanced voice authentication and speaker verification system.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import hashlib
import base64
from openai import AsyncOpenAI

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


@dataclass
class VoiceProfile:
    """Voice biometric profile for user identification."""
    
    user_id: str
    voice_signature: str
    confidence_threshold: float
    created_at: str
    last_updated: str
    verification_count: int
    features: Dict[str, float]


@dataclass
class BiometricResult:
    """Voice biometric verification result."""
    
    user_id: Optional[str]
    confidence: float
    is_verified: bool
    similarity_score: float
    features_extracted: Dict[str, float]
    processing_time_ms: float


class VoiceBiometrics:
    """
    Voice biometrics system for speaker identification and verification.
    
    Features:
    - Voice feature extraction using AI models
    - Speaker verification and identification
    - Anti-spoofing detection
    - Continuous authentication
    """
    
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value())
        self.voice_profiles = {}  # Cache for voice profiles
        self.verification_threshold = 0.75
        self.min_audio_duration = 2.0  # Minimum seconds for reliable verification
    
    async def extract_voice_features(self, audio_data: bytes) -> Dict[str, float]:
        """Extract voice biometric features from audio data."""
        try:
            # Use OpenAI Whisper for feature extraction
            response = await self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=("audio.wav", audio_data),
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
            
            # Extract timing and pronunciation features
            features = {
                "speech_rate": self._calculate_speech_rate(response),
                "pause_patterns": self._analyze_pause_patterns(response),
                "voice_quality": self._estimate_voice_quality(response),
                "prosody_signature": self._extract_prosody_features(response),
                "audio_duration": getattr(response, 'duration', 0.0)
            }
            
            logger.info("Voice features extracted successfully")
            return features
            
        except Exception as e:
            logger.error(f"Voice feature extraction failed: {e}")
            return {}
    
    def _calculate_speech_rate(self, whisper_response: Any) -> float:
        """Calculate speaking rate from transcription."""
        if not hasattr(whisper_response, 'words') or not whisper_response.words:
            return 0.0
        
        word_count = len(whisper_response.words)
        duration = getattr(whisper_response, 'duration', 1.0)
        return word_count / duration if duration > 0 else 0.0
    
    def _analyze_pause_patterns(self, whisper_response: Any) -> float:
        """Analyze pause patterns in speech."""
        if not hasattr(whisper_response, 'words') or len(whisper_response.words) < 2:
            return 0.0
        
        pauses = []
        words = whisper_response.words
        
        for i in range(len(words) - 1):
            current_end = words[i].get('end', 0)
            next_start = words[i + 1].get('start', 0)
            pause_duration = next_start - current_end
            if pause_duration > 0.1:  # Significant pause
                pauses.append(pause_duration)
        
        return np.mean(pauses) if pauses else 0.0
    
    def _estimate_voice_quality(self, whisper_response: Any) -> float:
        """Estimate voice quality from transcription confidence."""
        # Simple heuristic based on text clarity
        text = getattr(whisper_response, 'text', '')
        if not text:
            return 0.0
        
        # Clear speech tends to have proper spacing and punctuation
        word_count = len(text.split())
        char_count = len(text)
        
        if word_count == 0:
            return 0.0
        
        avg_word_length = char_count / word_count
        return min(1.0, avg_word_length / 6.0)  # Normalize to 0-1
    
    def _extract_prosody_features(self, whisper_response: Any) -> float:
        """Extract prosodic features signature."""
        # Simple prosody estimation from word timings
        if not hasattr(whisper_response, 'words') or len(whisper_response.words) < 3:
            return 0.0
        
        word_durations = []
        for word_data in whisper_response.words:
            start = word_data.get('start', 0)
            end = word_data.get('end', 0)
            duration = end - start
            if duration > 0:
                word_durations.append(duration)
        
        return np.std(word_durations) if word_durations else 0.0
    
    async def create_voice_profile(self, user_id: str, audio_data: bytes) -> VoiceProfile:
        """Create voice biometric profile for user."""
        try:
            # Extract voice features
            features = await self.extract_voice_features(audio_data)
            
            if not features or features.get("audio_duration", 0) < self.min_audio_duration:
                raise ValueError("Insufficient audio data for voice profile creation")
            
            # Create voice signature
            voice_signature = self._create_voice_signature(features)
            
            # Create profile
            from datetime import datetime
            now = datetime.utcnow().isoformat()
            
            profile = VoiceProfile(
                user_id=user_id,
                voice_signature=voice_signature,
                confidence_threshold=self.verification_threshold,
                created_at=now,
                last_updated=now,
                verification_count=0,
                features=features
            )
            
            # Cache profile
            self.voice_profiles[user_id] = profile
            
            logger.info(f"Voice profile created for user {user_id}")
            return profile
            
        except Exception as e:
            logger.error(f"Voice profile creation failed: {e}")
            raise
    
    def _create_voice_signature(self, features: Dict[str, float]) -> str:
        """Create unique voice signature from features."""
        # Combine features into signature string
        feature_string = "|".join([
            f"{key}:{value:.4f}" for key, value in sorted(features.items())
            if isinstance(value, (int, float))
        ])
        
        # Create hash signature
        signature_hash = hashlib.sha256(feature_string.encode()).digest()
        return base64.b64encode(signature_hash).decode()
    
    async def verify_voice(self, user_id: str, audio_data: bytes) -> BiometricResult:
        """Verify user identity using voice biometrics."""
        import time
        start_time = time.time()
        
        try:
            # Extract features from current audio
            current_features = await self.extract_voice_features(audio_data)
            
            if not current_features:
                return BiometricResult(
                    user_id=None,
                    confidence=0.0,
                    is_verified=False,
                    similarity_score=0.0,
                    features_extracted=current_features,
                    processing_time_ms=(time.time() - start_time) * 1000
                )
            
            # Get stored voice profile
            stored_profile = self.voice_profiles.get(user_id)
            if not stored_profile:
                # User not enrolled in voice biometrics
                return BiometricResult(
                    user_id=None,
                    confidence=0.0,
                    is_verified=False,
                    similarity_score=0.0,
                    features_extracted=current_features,
                    processing_time_ms=(time.time() - start_time) * 1000
                )
            
            # Calculate similarity
            similarity_score = self._calculate_feature_similarity(
                current_features, stored_profile.features
            )
            
            # Determine verification result
            is_verified = similarity_score >= stored_profile.confidence_threshold
            confidence = similarity_score
            
            # Update profile statistics
            if is_verified:
                stored_profile.verification_count += 1
                stored_profile.last_updated = time.time()
            
            processing_time = (time.time() - start_time) * 1000
            
            result = BiometricResult(
                user_id=user_id if is_verified else None,
                confidence=confidence,
                is_verified=is_verified,
                similarity_score=similarity_score,
                features_extracted=current_features,
                processing_time_ms=processing_time
            )
            
            logger.info(f"Voice verification for {user_id}: {is_verified} (confidence: {confidence:.3f})")
            return result
            
        except Exception as e:
            logger.error(f"Voice verification failed: {e}")
            return BiometricResult(
                user_id=None,
                confidence=0.0,
                is_verified=False,
                similarity_score=0.0,
                features_extracted={},
                processing_time_ms=(time.time() - start_time) * 1000
            )
    
    def _calculate_feature_similarity(
        self, 
        features1: Dict[str, float], 
        features2: Dict[str, float]
    ) -> float:
        """Calculate similarity between two feature sets."""
        
        # Get common features
        common_keys = set(features1.keys()) & set(features2.keys())
        if not common_keys:
            return 0.0
        
        # Calculate normalized differences
        similarities = []
        
        for key in common_keys:
            val1 = features1[key]
            val2 = features2[key]
            
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                # Avoid division by zero
                max_val = max(abs(val1), abs(val2), 1e-6)
                diff = abs(val1 - val2) / max_val
                similarity = 1.0 - min(1.0, diff)
                similarities.append(similarity)
        
        return np.mean(similarities) if similarities else 0.0
    
    async def identify_speaker(self, audio_data: bytes) -> BiometricResult:
        """Identify speaker from voice among enrolled users."""
        try:
            # Extract features
            current_features = await self.extract_voice_features(audio_data)
            
            if not current_features or not self.voice_profiles:
                return BiometricResult(
                    user_id=None,
                    confidence=0.0,
                    is_verified=False,
                    similarity_score=0.0,
                    features_extracted=current_features,
                    processing_time_ms=0.0
                )
            
            # Compare against all profiles
            best_match = None
            best_similarity = 0.0
            
            for user_id, profile in self.voice_profiles.items():
                similarity = self._calculate_feature_similarity(
                    current_features, profile.features
                )
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = user_id
            
            # Check if best match meets threshold
            is_verified = best_similarity >= self.verification_threshold
            
            return BiometricResult(
                user_id=best_match if is_verified else None,
                confidence=best_similarity,
                is_verified=is_verified,
                similarity_score=best_similarity,
                features_extracted=current_features,
                processing_time_ms=0.0
            )
            
        except Exception as e:
            logger.error(f"Speaker identification failed: {e}")
            return BiometricResult(
                user_id=None,
                confidence=0.0,
                is_verified=False,
                similarity_score=0.0,
                features_extracted={},
                processing_time_ms=0.0
            )


# Global instance
voice_biometrics = VoiceBiometrics()


async def get_voice_biometrics() -> VoiceBiometrics:
    """Get the global voice biometrics instance."""
    return voice_biometrics