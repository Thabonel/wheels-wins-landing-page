"""
Advanced Audio Stream Processing Service
Real-time audio processing pipeline for PAM voice interactions
Inspired by Microsoft/JARVIS parallel processing architecture
"""

import asyncio
import logging
from typing import Optional, Dict, Any, AsyncIterator, Callable, List
from dataclasses import dataclass
from enum import Enum
import time
import uuid
from datetime import datetime
import json
import io

from app.services.tts.manager import synthesize_for_pam, PAMVoiceProfile

logger = logging.getLogger(__name__)

class AudioFormat(Enum):
    WAV = "wav"
    MP3 = "mp3"
    WEBM = "webm"
    PCM = "pcm"

class ProcessingStage(Enum):
    AUDIO_CAPTURE = "audio_capture"
    NOISE_REDUCTION = "noise_reduction"
    VAD_DETECTION = "vad_detection"
    STT_PROCESSING = "stt_processing"
    AI_PROCESSING = "ai_processing"
    TTS_SYNTHESIS = "tts_synthesis"
    AUDIO_STREAMING = "audio_streaming"

@dataclass
class AudioChunk:
    id: str
    timestamp: float
    data: bytes
    format: AudioFormat
    sample_rate: int
    channels: int
    duration_ms: int
    is_speech: bool = False
    is_final: bool = False
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class ProcessingResult:
    stage: ProcessingStage
    success: bool
    data: Any
    latency_ms: int
    metadata: Dict[str, Any] = None
    error: Optional[str] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

class AudioStreamProcessor:
    """
    Real-time audio stream processor with parallel pipeline execution
    Implements the 4-stage processing pattern from Microsoft/JARVIS
    """
    
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.is_processing = False
        self.processing_queue = asyncio.Queue()
        self.result_queue = asyncio.Queue()
        
        # Pipeline stages
        self.noise_reducer = None
        self.vad_detector = None
        self.stt_service = None
        self.tts_service = None
        self.ai_orchestrator = None
        
        # Processing metrics
        self.metrics = {
            "chunks_processed": 0,
            "total_latency_ms": 0,
            "avg_latency_ms": 0,
            "error_count": 0,
            "stage_latencies": {stage.value: [] for stage in ProcessingStage}
        }
        
        # Callbacks
        self.callbacks: Dict[str, Callable] = {}
        
        # Configuration
        self.config = {
            "sample_rate": 16000,
            "channels": 1,
            "chunk_size_ms": 50,
            "vad_enabled": True,
            "noise_reduction_enabled": True,
            "parallel_processing": True,
            "max_latency_ms": 1500,
            "quality_threshold": 0.7
        }
    
    async def initialize(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the audio processing pipeline"""
        if config:
            self.config.update(config)
        
        logger.info(f"🔧 Initializing Audio Stream Processor {self.session_id}")
        
        try:
            # Initialize STT service
            from app.services.stt.multi_engine_stt import multi_engine_stt
            self.stt_service = multi_engine_stt
            
            if not self.stt_service.is_initialized:
                await self.stt_service.initialize()
            
            # Initialize TTS service
            from app.services.tts.tts_service import tts_service
            self.tts_service = tts_service
            
            if not self.tts_service.is_initialized:
                await self.tts_service.initialize()
            
            # Initialize PAM orchestrator
            from app.core.simple_pam_service import simple_pam_service
            self.ai_orchestrator = simple_pam_service
            
            # Initialize noise reduction (placeholder)
            # TODO: Implement advanced noise reduction
            self.noise_reducer = SimpleNoiseReducer()
            
            # Initialize VAD (placeholder)
            # TODO: Implement server-side VAD
            self.vad_detector = SimpleVAD()
            
            logger.info("✅ Audio Stream Processor initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Audio Stream Processor initialization failed: {e}")
            return False
    
    async def start_processing(self) -> AsyncIterator[ProcessingResult]:
        """Start the audio processing pipeline"""
        if not self.stt_service or not self.tts_service:
            raise RuntimeError("Audio processor not initialized")
        
        logger.info(f"🎙️ Starting audio processing pipeline for session {self.session_id}")
        self.is_processing = True
        
        # Start processing tasks
        processing_tasks = [
            asyncio.create_task(self._process_audio_chunks()),
            asyncio.create_task(self._handle_processing_results())
        ]
        
        try:
            while self.is_processing:
                # Yield results from the result queue
                try:
                    result = await asyncio.wait_for(self.result_queue.get(), timeout=0.1)
                    yield result
                except asyncio.TimeoutError:
                    continue
                    
        finally:
            # Clean up processing tasks
            for task in processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
    
    async def process_audio_chunk(self, chunk: AudioChunk) -> None:
        """Add audio chunk to processing queue"""
        if not self.is_processing:
            return
        
        await self.processing_queue.put(chunk)
        self.metrics["chunks_processed"] += 1
    
    async def _process_audio_chunks(self):
        """Main audio processing loop"""
        logger.info("🔄 Audio chunk processing loop started")
        
        while self.is_processing:
            try:
                # Get next chunk
                chunk = await asyncio.wait_for(self.processing_queue.get(), timeout=1.0)
                
                # Process chunk through pipeline
                await self._process_single_chunk(chunk)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"❌ Error processing audio chunk: {e}")
                self.metrics["error_count"] += 1
    
    async def _process_single_chunk(self, chunk: AudioChunk):
        """Process a single audio chunk through the pipeline"""
        start_time = time.time()
        
        try:
            # Stage 1: Noise Reduction (if enabled)
            if self.config["noise_reduction_enabled"] and self.noise_reducer:
                stage_start = time.time()
                processed_audio = await self.noise_reducer.process(chunk.data)
                stage_latency = int((time.time() - stage_start) * 1000)
                
                self._update_stage_latency(ProcessingStage.NOISE_REDUCTION, stage_latency)
                chunk.data = processed_audio
            
            # Stage 2: VAD Detection (if enabled)
            if self.config["vad_enabled"] and self.vad_detector:
                stage_start = time.time()
                chunk.is_speech = await self.vad_detector.detect_speech(chunk.data)
                stage_latency = int((time.time() - stage_start) * 1000)
                
                self._update_stage_latency(ProcessingStage.VAD_DETECTION, stage_latency)
            
            # Only process speech chunks for STT
            if chunk.is_speech or not self.config["vad_enabled"]:
                await self._process_speech_chunk(chunk, start_time)
            
        except Exception as e:
            logger.error(f"❌ Chunk processing error: {e}")
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.AUDIO_CAPTURE,
                success=False,
                data=None,
                latency_ms=int((time.time() - start_time) * 1000),
                error=str(e)
            ))
    
    async def _process_speech_chunk(self, chunk: AudioChunk, pipeline_start: float):
        """Process speech chunk through STT → AI → TTS pipeline"""
        
        # Only process final chunks for full transcription
        if not chunk.is_final:
            return
        
        try:
            # Stage 3: Speech-to-Text
            stt_start = time.time()
            stt_result = await self.stt_service.transcribe(
                chunk.data,
                quality_threshold=self.config["quality_threshold"]
            )
            stt_latency = int((time.time() - stt_start) * 1000)
            
            self._update_stage_latency(ProcessingStage.STT_PROCESSING, stt_latency)
            
            if not stt_result or not stt_result.text.strip():
                logger.warning("⚠️ STT returned empty result")
                return
            
            # Emit STT result
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.STT_PROCESSING,
                success=True,
                data={
                    "text": stt_result.text,
                    "confidence": stt_result.confidence,
                    "engine": stt_result.engine.value
                },
                latency_ms=stt_latency,
                metadata=stt_result.metadata
            ))
            
            # Stage 4: AI Processing (parallel with TTS preparation)
            if self.config["parallel_processing"]:
                await self._parallel_ai_tts_processing(stt_result, pipeline_start)
            else:
                await self._sequential_ai_tts_processing(stt_result, pipeline_start)
                
        except Exception as e:
            logger.error(f"❌ Speech processing error: {e}")
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.STT_PROCESSING,
                success=False,
                data=None,
                latency_ms=int((time.time() - pipeline_start) * 1000),
                error=str(e)
            ))
    
    async def _parallel_ai_tts_processing(self, stt_result, pipeline_start: float):
        """Process AI and TTS in parallel for optimal latency"""
        
        try:
            # Start AI processing
            ai_start = time.time()
            ai_task = asyncio.create_task(
                self._process_with_ai(stt_result.text)
            )
            
            # Prepare TTS (warm up engines, select voice, etc.)
            tts_prep_task = asyncio.create_task(
                self._prepare_tts()
            )
            
            # Wait for AI processing to complete
            ai_response = await ai_task
            ai_latency = int((time.time() - ai_start) * 1000)
            
            self._update_stage_latency(ProcessingStage.AI_PROCESSING, ai_latency)
            
            # Emit AI result
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.AI_PROCESSING,
                success=True,
                data={
                    "response": ai_response,
                    "input_text": stt_result.text
                },
                latency_ms=ai_latency
            ))
            
            # Wait for TTS preparation
            await tts_prep_task
            
            # Generate TTS response
            tts_start = time.time()
            tts_result = await synthesize_for_pam(
                text=ai_response,
                voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                context={"voice_conversation": True, "stream": True}
            )
            tts_latency = int((time.time() - tts_start) * 1000)
            
            self._update_stage_latency(ProcessingStage.TTS_SYNTHESIS, tts_latency)
            
            if tts_result:
                await self._emit_result(ProcessingResult(
                    stage=ProcessingStage.TTS_SYNTHESIS,
                    success=True,
                    data={
                        "audio_data": tts_result,
                        "text": ai_response
                    },
                    latency_ms=tts_latency
                ))
            
            # Calculate total pipeline latency
            total_latency = int((time.time() - pipeline_start) * 1000)
            self._update_metrics(total_latency)
            
            logger.info(f"✅ Pipeline completed in {total_latency}ms: '{stt_result.text}' → '{ai_response}'")
            
        except Exception as e:
            logger.error(f"❌ Parallel processing error: {e}")
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.AI_PROCESSING,
                success=False,
                data=None,
                latency_ms=int((time.time() - pipeline_start) * 1000),
                error=str(e)
            ))
    
    async def _sequential_ai_tts_processing(self, stt_result, pipeline_start: float):
        """Process AI then TTS sequentially"""
        
        try:
            # AI Processing
            ai_start = time.time()
            ai_response = await self._process_with_ai(stt_result.text)
            ai_latency = int((time.time() - ai_start) * 1000)
            
            self._update_stage_latency(ProcessingStage.AI_PROCESSING, ai_latency)
            
            await self._emit_result(ProcessingResult(
                stage=ProcessingStage.AI_PROCESSING,
                success=True,
                data={
                    "response": ai_response,
                    "input_text": stt_result.text
                },
                latency_ms=ai_latency
            ))
            
            # TTS Processing
            tts_start = time.time()
            tts_result = await synthesize_for_pam(
                text=ai_response,
                voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                context={"voice_conversation": True, "stream": True}
            )
            tts_latency = int((time.time() - tts_start) * 1000)
            
            self._update_stage_latency(ProcessingStage.TTS_SYNTHESIS, tts_latency)
            
            if tts_result:
                await self._emit_result(ProcessingResult(
                    stage=ProcessingStage.TTS_SYNTHESIS,
                    success=True,
                    data={
                        "audio_data": tts_result,
                        "text": ai_response
                    },
                    latency_ms=tts_latency
                ))
            
            total_latency = int((time.time() - pipeline_start) * 1000)
            self._update_metrics(total_latency)
            
        except Exception as e:
            logger.error(f"❌ Sequential processing error: {e}")
    
    async def _process_with_ai(self, text: str) -> str:
        """Process text through AI orchestrator"""
        try:
            if self.ai_orchestrator:
                response = await self.ai_orchestrator.get_response(
                    message=text,
                    context={
                        "input_type": "voice_streaming",
                        "session_id": self.session_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                return response
            else:
                return f"I heard you say: {text}"
                
        except Exception as e:
            logger.error(f"❌ AI processing error: {e}")
            return "I'm sorry, I didn't understand that. Could you repeat?"
    
    async def _prepare_tts(self):
        """Prepare TTS engine for faster synthesis"""
        try:
            # Warm up TTS engines, select optimal voice, etc.
            if self.tts_service:
                # This is a placeholder for TTS preparation
                await asyncio.sleep(0.01)  # Simulate preparation time
        except Exception as e:
            logger.warning(f"⚠️ TTS preparation warning: {e}")
    
    async def _handle_processing_results(self):
        """Handle processing results and emit to callbacks"""
        logger.info("🔄 Processing result handler started")
        
        while self.is_processing:
            try:
                await asyncio.sleep(0.1)  # Processing results are handled in the main loop
            except Exception as e:
                logger.error(f"❌ Result handling error: {e}")
    
    async def _emit_result(self, result: ProcessingResult):
        """Emit processing result to queue and callbacks"""
        await self.result_queue.put(result)
        
        # Call registered callbacks
        callback_name = f"on_{result.stage.value}"
        if callback_name in self.callbacks:
            try:
                await self.callbacks[callback_name](result)
            except Exception as e:
                logger.error(f"❌ Callback error for {callback_name}: {e}")
    
    def _update_stage_latency(self, stage: ProcessingStage, latency_ms: int):
        """Update latency metrics for a processing stage"""
        if stage.value in self.metrics["stage_latencies"]:
            self.metrics["stage_latencies"][stage.value].append(latency_ms)
            
            # Keep only last 100 measurements
            if len(self.metrics["stage_latencies"][stage.value]) > 100:
                self.metrics["stage_latencies"][stage.value].pop(0)
    
    def _update_metrics(self, total_latency_ms: int):
        """Update overall processing metrics"""
        self.metrics["total_latency_ms"] += total_latency_ms
        processed_chunks = max(1, self.metrics["chunks_processed"])
        self.metrics["avg_latency_ms"] = self.metrics["total_latency_ms"] / processed_chunks
        
        # Check latency threshold
        if total_latency_ms > self.config["max_latency_ms"]:
            logger.warning(f"⚠️ High latency detected: {total_latency_ms}ms (threshold: {self.config['max_latency_ms']}ms)")
    
    def register_callback(self, event: str, callback: Callable):
        """Register callback for processing events"""
        self.callbacks[event] = callback
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get processing metrics"""
        stage_avg_latencies = {}
        for stage, latencies in self.metrics["stage_latencies"].items():
            if latencies:
                stage_avg_latencies[stage] = sum(latencies) / len(latencies)
            else:
                stage_avg_latencies[stage] = 0
        
        return {
            **self.metrics,
            "stage_avg_latencies": stage_avg_latencies,
            "session_id": self.session_id,
            "is_processing": self.is_processing
        }
    
    async def stop(self):
        """Stop the audio processing pipeline"""
        logger.info(f"🛑 Stopping audio processing pipeline for session {self.session_id}")
        self.is_processing = False

# Placeholder classes for noise reduction and VAD
# TODO: Implement proper server-side audio processing

class SimpleNoiseReducer:
    """Simple noise reduction placeholder"""
    
    async def process(self, audio_data: bytes) -> bytes:
        """Apply noise reduction to audio data"""
        # Placeholder - return original data
        # TODO: Implement actual noise reduction
        return audio_data

class SimpleVAD:
    """Simple Voice Activity Detection placeholder"""
    
    async def detect_speech(self, audio_data: bytes) -> bool:
        """Detect if audio contains speech"""
        # Placeholder - assume all audio contains speech
        # TODO: Implement actual VAD
        return len(audio_data) > 1000  # Simple threshold based on data size