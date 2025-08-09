"""
Streaming Speech-to-Text Service
Real-time streaming transcription inspired by Google Assistant patterns
Provides interim and final transcription results for immediate feedback
"""

import asyncio
import logging
from typing import AsyncIterator, Optional, Dict, Any, List, Callable
from dataclasses import dataclass
from enum import Enum
import time
import uuid
from datetime import datetime
import json
import queue
import threading

from .multi_engine_stt import MultiEngineSTTService, STTResult, STTEngine, STTQuality

logger = logging.getLogger(__name__)

class StreamingMode(Enum):
    CONTINUOUS = "continuous"  # Always transcribing
    VOICE_ACTIVATED = "voice_activated"  # Only when speech detected
    PUSH_TO_TALK = "push_to_talk"  # Manual activation

class TranscriptionType(Enum):
    INTERIM = "interim"  # Partial result
    FINAL = "final"  # Complete utterance
    CORRECTION = "correction"  # Corrected previous result

@dataclass
class StreamingTranscription:
    id: str
    text: str
    confidence: float
    type: TranscriptionType
    timestamp: float
    duration_ms: int
    engine: STTEngine
    language: str = "en"
    is_stable: bool = False  # Won't change further
    word_timestamps: List[Dict[str, Any]] = None
    alternatives: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.word_timestamps is None:
            self.word_timestamps = []
        if self.alternatives is None:
            self.alternatives = []
        if self.metadata is None:
            self.metadata = {}

@dataclass
class StreamingConfig:
    mode: StreamingMode = StreamingMode.VOICE_ACTIVATED
    chunk_duration_ms: int = 100  # Process every 100ms
    interim_results: bool = True
    word_level_timestamps: bool = False
    max_alternatives: int = 3
    stability_threshold: float = 0.8
    silence_timeout_ms: int = 3000
    max_transcription_length: int = 500
    language: str = "en"
    profanity_filter: bool = False
    
    # Performance settings
    low_latency_mode: bool = True
    buffer_size_ms: int = 1000
    overlap_ms: int = 100
    parallel_processing: bool = True

class AudioChunkBuffer:
    """Manages audio chunks for streaming transcription"""
    
    def __init__(self, buffer_size_ms: int = 1000, overlap_ms: int = 100):
        self.buffer_size_ms = buffer_size_ms
        self.overlap_ms = overlap_ms
        self.chunks: List[bytes] = []
        self.timestamps: List[float] = []
        self.total_duration_ms = 0
        self.sample_rate = 16000
        
    def add_chunk(self, audio_data: bytes, timestamp: float = None):
        """Add audio chunk to buffer"""
        if timestamp is None:
            timestamp = time.time()
            
        self.chunks.append(audio_data)
        self.timestamps.append(timestamp)
        
        # Estimate duration (assuming 16kHz, 16-bit, mono)
        chunk_duration_ms = len(audio_data) / (self.sample_rate * 2) * 1000
        self.total_duration_ms += chunk_duration_ms
        
        # Remove old chunks to maintain buffer size
        while self.total_duration_ms > self.buffer_size_ms + self.overlap_ms:
            removed_chunk = self.chunks.pop(0)
            self.timestamps.pop(0)
            removed_duration = len(removed_chunk) / (self.sample_rate * 2) * 1000
            self.total_duration_ms -= removed_duration
    
    def get_buffer_audio(self) -> bytes:
        """Get complete buffer as audio data"""
        return b''.join(self.chunks)
    
    def get_recent_audio(self, duration_ms: int) -> bytes:
        """Get recent audio of specified duration"""
        if not self.chunks:
            return b''
        
        target_bytes = int(duration_ms * self.sample_rate * 2 / 1000)
        total_bytes = sum(len(chunk) for chunk in self.chunks)
        
        if total_bytes <= target_bytes:
            return self.get_buffer_audio()
        
        # Take chunks from the end
        collected_bytes = 0
        selected_chunks = []
        
        for chunk in reversed(self.chunks):
            selected_chunks.insert(0, chunk)
            collected_bytes += len(chunk)
            if collected_bytes >= target_bytes:
                break
        
        return b''.join(selected_chunks)
    
    def clear(self):
        """Clear the buffer"""
        self.chunks.clear()
        self.timestamps.clear()
        self.total_duration_ms = 0

class StreamingSTTService:
    """
    Real-time streaming speech-to-text service
    Provides continuous transcription with interim and final results
    """
    
    def __init__(self, config: StreamingConfig = None):
        self.config = config or StreamingConfig()
        self.stt_service = MultiEngineSTTService()
        self.is_initialized = False
        self.is_streaming = False
        
        # Streaming state
        self.audio_buffer = AudioChunkBuffer(
            self.config.buffer_size_ms,
            self.config.overlap_ms
        )
        self.current_transcription = ""
        self.last_final_transcription = ""
        self.transcription_history: List[StreamingTranscription] = []
        
        # Processing control
        self.processing_queue = asyncio.Queue()
        self.result_queue = asyncio.Queue()
        self.stop_event = asyncio.Event()
        
        # Performance tracking
        self.metrics = {
            "chunks_processed": 0,
            "interim_results": 0,
            "final_results": 0,
            "avg_latency_ms": 0,
            "total_processing_time": 0
        }
        
        # Callbacks
        self.callbacks: Dict[str, Callable] = {}
    
    async def initialize(self) -> bool:
        """Initialize the streaming STT service"""
        logger.info("🎤 Initializing Streaming STT Service...")
        
        try:
            # Initialize the underlying STT service
            if not self.stt_service.is_initialized:
                await self.stt_service.initialize()
            
            if not self.stt_service.is_initialized:
                logger.error("❌ Failed to initialize underlying STT service")
                return False
            
            self.is_initialized = True
            logger.info("✅ Streaming STT Service initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Streaming STT initialization failed: {e}")
            return False
    
    async def start_streaming(
        self,
        audio_stream: AsyncIterator[bytes],
        callbacks: Dict[str, Callable] = None
    ) -> AsyncIterator[StreamingTranscription]:
        """
        Start streaming transcription
        
        Args:
            audio_stream: Async iterator of audio chunks
            callbacks: Optional callbacks for events
            
        Yields:
            StreamingTranscription objects with interim and final results
        """
        if not self.is_initialized:
            raise RuntimeError("Streaming STT service not initialized")
        
        if self.is_streaming:
            raise RuntimeError("Streaming already in progress")
        
        logger.info("🎙️ Starting streaming transcription...")
        self.is_streaming = True
        self.stop_event.clear()
        
        if callbacks:
            self.callbacks.update(callbacks)
        
        try:
            # Start processing tasks
            processing_task = asyncio.create_task(self._processing_loop())
            audio_task = asyncio.create_task(self._audio_ingestion_loop(audio_stream))
            
            # Yield results as they become available
            while self.is_streaming and not self.stop_event.is_set():
                try:
                    result = await asyncio.wait_for(
                        self.result_queue.get(),
                        timeout=0.1
                    )
                    yield result
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"❌ Error yielding result: {e}")
                    break
            
        finally:
            # Clean up
            self.is_streaming = False
            self.stop_event.set()
            
            # Cancel tasks
            if 'processing_task' in locals():
                processing_task.cancel()
            if 'audio_task' in locals():
                audio_task.cancel()
            
            logger.info("🛑 Streaming transcription stopped")
    
    async def _audio_ingestion_loop(self, audio_stream: AsyncIterator[bytes]):
        """Process incoming audio chunks"""
        logger.info("🎧 Starting audio ingestion loop...")
        
        try:
            async for audio_chunk in audio_stream:
                if self.stop_event.is_set():
                    break
                
                # Add to buffer
                self.audio_buffer.add_chunk(audio_chunk)
                
                # Queue for processing if we have enough data
                if (self.audio_buffer.total_duration_ms >= self.config.chunk_duration_ms or
                    self.config.mode == StreamingMode.CONTINUOUS):
                    
                    await self.processing_queue.put({
                        'type': 'audio_chunk',
                        'data': self.audio_buffer.get_recent_audio(self.config.chunk_duration_ms),
                        'timestamp': time.time()
                    })
                
        except Exception as e:
            logger.error(f"❌ Audio ingestion error: {e}")
    
    async def _processing_loop(self):
        """Main processing loop for streaming transcription"""
        logger.info("⚙️ Starting processing loop...")
        
        last_transcription_time = 0
        silence_start_time = None
        
        try:
            while not self.stop_event.is_set():
                try:
                    # Get next audio chunk to process
                    item = await asyncio.wait_for(
                        self.processing_queue.get(),
                        timeout=0.1
                    )
                    
                    if item['type'] == 'audio_chunk':
                        await self._process_audio_chunk(
                            item['data'],
                            item['timestamp']
                        )
                        last_transcription_time = time.time()
                        silence_start_time = None
                    
                except asyncio.TimeoutError:
                    # Check for silence timeout
                    current_time = time.time()
                    
                    if (last_transcription_time > 0 and 
                        current_time - last_transcription_time > self.config.silence_timeout_ms / 1000):
                        
                        if silence_start_time is None:
                            silence_start_time = current_time
                        
                        # Finalize any pending transcription
                        if self.current_transcription and not self.last_final_transcription:
                            await self._finalize_current_transcription()
                    
                    continue
                    
                except Exception as e:
                    logger.error(f"❌ Processing loop error: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Processing loop fatal error: {e}")
    
    async def _process_audio_chunk(self, audio_data: bytes, timestamp: float):
        """Process a single audio chunk for transcription"""
        if len(audio_data) < 100:  # Skip very small chunks
            return
        
        start_time = time.time()
        
        try:
            # Get transcription from STT service
            stt_result = await self.stt_service.transcribe(
                audio_data,
                language=self.config.language,
                quality_threshold=0.5  # Lower threshold for interim results
            )
            
            if not stt_result or not stt_result.text.strip():
                return
            
            processing_time = int((time.time() - start_time) * 1000)
            self.metrics["chunks_processed"] += 1
            
            # Determine if this is an interim or final result
            is_final = self._should_be_final_result(stt_result)
            transcription_type = TranscriptionType.FINAL if is_final else TranscriptionType.INTERIM
            
            # Create streaming transcription
            streaming_result = StreamingTranscription(
                id=str(uuid.uuid4()),
                text=stt_result.text,
                confidence=stt_result.confidence,
                type=transcription_type,
                timestamp=timestamp,
                duration_ms=processing_time,
                engine=stt_result.engine,
                language=self.config.language,
                is_stable=is_final or stt_result.confidence > self.config.stability_threshold,
                metadata={
                    "chunk_size": len(audio_data),
                    "processing_time_ms": processing_time,
                    "quality": stt_result.quality.value
                }
            )
            
            # Update current transcription state
            if transcription_type == TranscriptionType.INTERIM:
                self.current_transcription = stt_result.text
                self.metrics["interim_results"] += 1
            else:
                self.last_final_transcription = stt_result.text
                self.current_transcription = ""
                self.metrics["final_results"] += 1
            
            # Add to history
            self.transcription_history.append(streaming_result)
            if len(self.transcription_history) > 100:  # Keep last 100 results
                self.transcription_history.pop(0)
            
            # Update metrics
            self._update_metrics(processing_time)
            
            # Queue result for output
            await self.result_queue.put(streaming_result)
            
            # Call callbacks
            await self._trigger_callbacks(streaming_result)
            
        except Exception as e:
            logger.error(f"❌ Audio chunk processing error: {e}")
    
    def _should_be_final_result(self, stt_result: STTResult) -> bool:
        """Determine if STT result should be treated as final"""
        
        # High confidence results are final
        if stt_result.confidence > 0.9:
            return True
        
        # Results with punctuation are likely final
        if stt_result.text.strip().endswith(('.', '!', '?')):
            return True
        
        # Long transcriptions are likely final
        if len(stt_result.text.split()) > 10:
            return True
        
        # High quality results from reliable engines
        if (stt_result.quality == STTQuality.HIGH and 
            stt_result.engine in [STTEngine.OPENAI_WHISPER, STTEngine.GOOGLE_SPEECH]):
            return True
        
        return False
    
    async def _finalize_current_transcription(self):
        """Finalize the current interim transcription"""
        if not self.current_transcription:
            return
        
        logger.info(f"🔒 Finalizing transcription: '{self.current_transcription}'")
        
        final_result = StreamingTranscription(
            id=str(uuid.uuid4()),
            text=self.current_transcription,
            confidence=0.8,  # Estimated confidence for finalized interim
            type=TranscriptionType.FINAL,
            timestamp=time.time(),
            duration_ms=0,
            engine=STTEngine.OPENAI_WHISPER,  # Default
            language=self.config.language,
            is_stable=True,
            metadata={"finalized_interim": True}
        )
        
        self.last_final_transcription = self.current_transcription
        self.current_transcription = ""
        
        await self.result_queue.put(final_result)
        await self._trigger_callbacks(final_result)
    
    async def _trigger_callbacks(self, result: StreamingTranscription):
        """Trigger registered callbacks"""
        try:
            if result.type == TranscriptionType.INTERIM and "on_interim" in self.callbacks:
                await self.callbacks["on_interim"](result)
            elif result.type == TranscriptionType.FINAL and "on_final" in self.callbacks:
                await self.callbacks["on_final"](result)
            
            if "on_transcription" in self.callbacks:
                await self.callbacks["on_transcription"](result)
                
        except Exception as e:
            logger.error(f"❌ Callback error: {e}")
    
    def _update_metrics(self, processing_time_ms: int):
        """Update performance metrics"""
        self.metrics["total_processing_time"] += processing_time_ms
        processed = self.metrics["chunks_processed"]
        
        if processed > 0:
            self.metrics["avg_latency_ms"] = self.metrics["total_processing_time"] / processed
    
    async def stop_streaming(self):
        """Stop streaming transcription"""
        logger.info("🛑 Stopping streaming transcription...")
        
        # Finalize any pending transcription
        if self.current_transcription:
            await self._finalize_current_transcription()
        
        self.is_streaming = False
        self.stop_event.set()
        
        # Clear buffers
        self.audio_buffer.clear()
        
        # Clear queues
        while not self.processing_queue.empty():
            try:
                self.processing_queue.get_nowait()
            except:
                break
    
    # Public API methods
    def get_current_transcription(self) -> str:
        """Get the current interim transcription"""
        return self.current_transcription
    
    def get_last_final_transcription(self) -> str:
        """Get the last finalized transcription"""
        return self.last_final_transcription
    
    def get_transcription_history(self, limit: int = 10) -> List[StreamingTranscription]:
        """Get recent transcription history"""
        return self.transcription_history[-limit:] if self.transcription_history else []
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return {
            **self.metrics,
            "is_streaming": self.is_streaming,
            "buffer_duration_ms": self.audio_buffer.total_duration_ms,
            "queue_size": self.processing_queue.qsize()
        }
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update streaming configuration"""
        for key, value in new_config.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
        
        logger.info("⚙️ Streaming STT config updated")
    
    def register_callback(self, event: str, callback: Callable):
        """Register callback for transcription events"""
        self.callbacks[event] = callback
    
    async def process_single_utterance(
        self,
        audio_data: bytes,
        return_alternatives: bool = False
    ) -> StreamingTranscription:
        """Process a single complete utterance"""
        
        if not self.is_initialized:
            raise RuntimeError("Service not initialized")
        
        start_time = time.time()
        
        # Get transcription
        stt_result = await self.stt_service.transcribe(audio_data)
        
        if not stt_result:
            raise ValueError("Failed to transcribe audio")
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Create streaming result
        result = StreamingTranscription(
            id=str(uuid.uuid4()),
            text=stt_result.text,
            confidence=stt_result.confidence,
            type=TranscriptionType.FINAL,
            timestamp=start_time,
            duration_ms=processing_time,
            engine=stt_result.engine,
            language=self.config.language,
            is_stable=True,
            metadata={
                "single_utterance": True,
                "audio_size": len(audio_data)
            }
        )
        
        return result

# Global streaming STT service instance
streaming_stt_service = StreamingSTTService()