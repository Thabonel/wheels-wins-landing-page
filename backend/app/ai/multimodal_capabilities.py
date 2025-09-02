"""
PAM Multi-Modal AI Capabilities System
Implements advanced multi-modal AI capabilities including vision, audio processing,
document analysis, and cross-modal understanding.
"""

import asyncio
import json
import logging
import base64
import io
import tempfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import librosa
import speech_recognition as sr
from gtts import gTTS
import openai
from openai import AsyncOpenAI
import pypdf2
from pathlib import Path

from app.core.config import get_settings
from app.services.database import get_database
from app.services.embeddings import VectorEmbeddingService

settings = get_settings()
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class ModalityType(Enum):
    """Types of modalities PAM can process"""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    SPEECH = "speech"
    GESTURE = "gesture"

class AudioProcessingTask(Enum):
    """Types of audio processing tasks"""
    TRANSCRIPTION = "transcription"
    EMOTION_DETECTION = "emotion_detection"
    SPEAKER_IDENTIFICATION = "speaker_identification"
    NOISE_REDUCTION = "noise_reduction"
    MUSIC_ANALYSIS = "music_analysis"

class VisionTask(Enum):
    """Types of vision processing tasks"""
    OBJECT_DETECTION = "object_detection"
    SCENE_ANALYSIS = "scene_analysis"
    TEXT_EXTRACTION = "text_extraction"
    FACIAL_RECOGNITION = "facial_recognition"
    IMAGE_DESCRIPTION = "image_description"
    VISUAL_QUESTION_ANSWERING = "visual_qa"

@dataclass
class MultiModalInput:
    """Multi-modal input data"""
    input_id: str
    primary_modality: ModalityType
    secondary_modalities: List[ModalityType]
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    timestamp: datetime

@dataclass
class ProcessingResult:
    """Result of multi-modal processing"""
    result_id: str
    input_id: str
    task_type: str
    confidence: float
    results: Dict[str, Any]
    processing_time: float
    model_used: str
    metadata: Dict[str, Any]

@dataclass
class CrossModalAlignment:
    """Cross-modal content alignment"""
    alignment_id: str
    modalities: List[ModalityType]
    alignment_score: float
    aligned_content: Dict[str, Any]
    temporal_sync: Optional[Dict[str, float]]
    semantic_mapping: Dict[str, Any]

class PAMMultiModalCapabilities:
    """
    Advanced multi-modal AI capabilities for PAM.
    
    Features:
    - Image analysis and understanding
    - Audio processing and speech recognition
    - Video analysis and temporal understanding
    - Document analysis and extraction
    - Cross-modal content alignment
    - Multi-modal reasoning and integration
    - Real-time processing capabilities
    """
    
    def __init__(self):
        self.db = get_database()
        self.embedding_service = VectorEmbeddingService()
        self.processing_history = []
        
        # Initialize processing models
        self.speech_recognizer = sr.Recognizer()
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff'}
        self.supported_audio_formats = {'.wav', '.mp3', '.flac', '.aac', '.ogg'}
        self.supported_video_formats = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        self.supported_document_formats = {'.pdf', '.docx', '.txt', '.md'}
        
        # Vision processing configuration
        self.max_image_size = (1024, 1024)
        self.image_quality = 85
        
        # Audio processing configuration
        self.sample_rate = 16000
        self.audio_chunk_duration = 30  # seconds
        
        # Cross-modal processing
        self.alignment_threshold = 0.7
        self.semantic_similarity_threshold = 0.8
        
    async def process_image(
        self,
        image_data: Union[bytes, str, Image.Image],
        task: VisionTask,
        context: Optional[Dict[str, Any]] = None
    ) -> ProcessingResult:
        """
        Process image with specified vision task.
        
        Args:
            image_data: Image data (bytes, base64 string, or PIL Image)
            task: Vision processing task to perform
            context: Additional context for processing
            
        Returns:
            Image processing results
        """
        try:
            start_time = datetime.utcnow()
            result_id = f"vision_{task.value}_{start_time.strftime('%Y%m%d_%H%M%S_%f')}"
            
            # Prepare image
            image = await self._prepare_image(image_data)
            if not image:
                return self._create_error_result(result_id, "Failed to prepare image")
            
            # Process based on task type
            if task == VisionTask.IMAGE_DESCRIPTION:
                results = await self._describe_image(image, context)
            elif task == VisionTask.OBJECT_DETECTION:
                results = await self._detect_objects(image, context)
            elif task == VisionTask.SCENE_ANALYSIS:
                results = await self._analyze_scene(image, context)
            elif task == VisionTask.TEXT_EXTRACTION:
                results = await self._extract_text_from_image(image, context)
            elif task == VisionTask.VISUAL_QUESTION_ANSWERING:
                results = await self._answer_visual_question(image, context)
            else:
                results = await self._generic_image_analysis(image, task, context)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            processing_result = ProcessingResult(
                result_id=result_id,
                input_id=f"image_{start_time.strftime('%Y%m%d_%H%M%S')}",
                task_type=task.value,
                confidence=results.get("confidence", 0.8),
                results=results,
                processing_time=processing_time,
                model_used="gpt-4-vision-preview",
                metadata={
                    "image_size": image.size,
                    "image_mode": image.mode,
                    "context": context or {}
                }
            )
            
            # Store processing result
            await self._store_processing_result(processing_result)
            self.processing_history.append(processing_result)
            
            return processing_result
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return self._create_error_result(f"vision_error_{datetime.utcnow().timestamp()}", str(e))
    
    async def process_audio(
        self,
        audio_data: Union[bytes, str, np.ndarray],
        task: AudioProcessingTask,
        context: Optional[Dict[str, Any]] = None
    ) -> ProcessingResult:
        """
        Process audio with specified task.
        
        Args:
            audio_data: Audio data (bytes, file path, or numpy array)
            task: Audio processing task to perform
            context: Additional context for processing
            
        Returns:
            Audio processing results
        """
        try:
            start_time = datetime.utcnow()
            result_id = f"audio_{task.value}_{start_time.strftime('%Y%m%d_%H%M%S_%f')}"
            
            # Prepare audio data
            audio_array, sample_rate = await self._prepare_audio(audio_data)
            if audio_array is None:
                return self._create_error_result(result_id, "Failed to prepare audio")
            
            # Process based on task type
            if task == AudioProcessingTask.TRANSCRIPTION:
                results = await self._transcribe_audio(audio_array, sample_rate, context)
            elif task == AudioProcessingTask.EMOTION_DETECTION:
                results = await self._detect_audio_emotion(audio_array, sample_rate, context)
            elif task == AudioProcessingTask.SPEAKER_IDENTIFICATION:
                results = await self._identify_speaker(audio_array, sample_rate, context)
            elif task == AudioProcessingTask.MUSIC_ANALYSIS:
                results = await self._analyze_music(audio_array, sample_rate, context)
            else:
                results = await self._generic_audio_analysis(audio_array, sample_rate, task, context)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            processing_result = ProcessingResult(
                result_id=result_id,
                input_id=f"audio_{start_time.strftime('%Y%m%d_%H%M%S')}",
                task_type=task.value,
                confidence=results.get("confidence", 0.7),
                results=results,
                processing_time=processing_time,
                model_used="whisper-1",
                metadata={
                    "sample_rate": sample_rate,
                    "duration": len(audio_array) / sample_rate,
                    "context": context or {}
                }
            )
            
            # Store processing result
            await self._store_processing_result(processing_result)
            self.processing_history.append(processing_result)
            
            return processing_result
            
        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            return self._create_error_result(f"audio_error_{datetime.utcnow().timestamp()}", str(e))
    
    async def process_document(
        self,
        document_data: Union[bytes, str, Path],
        extraction_tasks: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> ProcessingResult:
        """
        Process document with specified extraction tasks.
        
        Args:
            document_data: Document data (bytes, file path, or Path object)
            extraction_tasks: List of extraction tasks to perform
            context: Additional context for processing
            
        Returns:
            Document processing results
        """
        try:
            start_time = datetime.utcnow()
            result_id = f"document_{start_time.strftime('%Y%m%d_%H%M%S_%f')}"
            
            # Prepare document
            document_content = await self._prepare_document(document_data)
            if not document_content:
                return self._create_error_result(result_id, "Failed to prepare document")
            
            # Process extraction tasks
            results = {}
            for task in extraction_tasks:
                if task == "text_extraction":
                    results["text_content"] = document_content.get("text", "")
                elif task == "metadata_extraction":
                    results["metadata"] = document_content.get("metadata", {})
                elif task == "structure_analysis":
                    results["structure"] = await self._analyze_document_structure(document_content)
                elif task == "key_information":
                    results["key_info"] = await self._extract_key_information(document_content)
                elif task == "summarization":
                    results["summary"] = await self._summarize_document(document_content)
                elif task == "entity_extraction":
                    results["entities"] = await self._extract_entities(document_content)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            processing_result = ProcessingResult(
                result_id=result_id,
                input_id=f"document_{start_time.strftime('%Y%m%d_%H%M%S')}",
                task_type="document_processing",
                confidence=0.85,
                results=results,
                processing_time=processing_time,
                model_used="gpt-4",
                metadata={
                    "document_type": document_content.get("type", "unknown"),
                    "page_count": document_content.get("page_count", 1),
                    "extraction_tasks": extraction_tasks,
                    "context": context or {}
                }
            )
            
            # Store processing result
            await self._store_processing_result(processing_result)
            self.processing_history.append(processing_result)
            
            return processing_result
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return self._create_error_result(f"document_error_{datetime.utcnow().timestamp()}", str(e))
    
    async def align_cross_modal_content(
        self,
        content_data: Dict[ModalityType, Any],
        alignment_strategy: str = "semantic",
        context: Optional[Dict[str, Any]] = None
    ) -> CrossModalAlignment:
        """
        Align content across multiple modalities.
        
        Args:
            content_data: Dictionary of modality type to content data
            alignment_strategy: Strategy for alignment (semantic, temporal, structural)
            context: Additional context for alignment
            
        Returns:
            Cross-modal alignment results
        """
        try:
            alignment_id = f"alignment_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
            modalities = list(content_data.keys())
            
            # Process each modality
            processed_content = {}
            for modality, data in content_data.items():
                processed_content[modality] = await self._process_for_alignment(modality, data)
            
            # Perform alignment based on strategy
            if alignment_strategy == "semantic":
                alignment_results = await self._semantic_alignment(processed_content)
            elif alignment_strategy == "temporal":
                alignment_results = await self._temporal_alignment(processed_content)
            elif alignment_strategy == "structural":
                alignment_results = await self._structural_alignment(processed_content)
            else:
                alignment_results = await self._hybrid_alignment(processed_content)
            
            # Calculate alignment score
            alignment_score = self._calculate_alignment_score(alignment_results)
            
            # Create semantic mapping
            semantic_mapping = await self._create_semantic_mapping(processed_content, alignment_results)
            
            cross_modal_alignment = CrossModalAlignment(
                alignment_id=alignment_id,
                modalities=modalities,
                alignment_score=alignment_score,
                aligned_content=alignment_results,
                temporal_sync=alignment_results.get("temporal_sync"),
                semantic_mapping=semantic_mapping
            )
            
            # Store alignment results
            await self._store_cross_modal_alignment(cross_modal_alignment)
            
            return cross_modal_alignment
            
        except Exception as e:
            logger.error(f"Error in cross-modal alignment: {e}")
            return self._create_fallback_alignment(list(content_data.keys()))
    
    async def generate_multimodal_response(
        self,
        query: str,
        available_modalities: List[ModalityType],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate response using multiple modalities.
        
        Args:
            query: User query
            available_modalities: List of available output modalities
            context: Additional context
            
        Returns:
            Multi-modal response
        """
        try:
            response = {
                "query": query,
                "modalities": {},
                "unified_message": "",
                "confidence": 0.0,
                "generation_metadata": {}
            }
            
            # Generate text response (always available)
            if ModalityType.TEXT in available_modalities:
                text_response = await self._generate_text_response(query, context)
                response["modalities"][ModalityType.TEXT] = text_response
                response["unified_message"] = text_response.get("content", "")
            
            # Generate speech response
            if ModalityType.SPEECH in available_modalities:
                speech_response = await self._generate_speech_response(
                    response["unified_message"], context
                )
                response["modalities"][ModalityType.SPEECH] = speech_response
            
            # Generate visual response if appropriate
            if ModalityType.IMAGE in available_modalities:
                visual_response = await self._generate_visual_response(query, context)
                if visual_response:
                    response["modalities"][ModalityType.IMAGE] = visual_response
            
            # Calculate overall confidence
            confidences = [
                modal_resp.get("confidence", 0.5) 
                for modal_resp in response["modalities"].values()
            ]
            response["confidence"] = np.mean(confidences) if confidences else 0.5
            
            # Add generation metadata
            response["generation_metadata"] = {
                "timestamp": datetime.utcnow().isoformat(),
                "available_modalities": [m.value for m in available_modalities],
                "context_used": context is not None,
                "response_length": len(response["unified_message"])
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating multimodal response: {e}")
            return {"error": "Failed to generate multimodal response", "query": query}
    
    # Private methods for specific processing tasks
    
    async def _prepare_image(self, image_data: Union[bytes, str, Image.Image]) -> Optional[Image.Image]:
        """Prepare image for processing"""
        try:
            if isinstance(image_data, Image.Image):
                image = image_data
            elif isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, str):
                # Assume base64 encoded
                if image_data.startswith('data:image'):
                    # Remove data URL prefix
                    image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
            else:
                return None
            
            # Resize if necessary
            if image.size[0] > self.max_image_size[0] or image.size[1] > self.max_image_size[1]:
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image
            
        except Exception as e:
            logger.error(f"Error preparing image: {e}")
            return None
    
    async def _describe_image(self, image: Image.Image, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate image description using vision model"""
        try:
            # Convert image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=self.image_quality)
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Create context-aware prompt
            prompt = "Describe this image in detail."
            if context and "question" in context:
                prompt = context["question"]
            elif context and "focus" in context:
                prompt = f"Describe this image, focusing on {context['focus']}."
            
            # Call vision model
            response = await client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            description = response.choices[0].message.content
            
            return {
                "description": description,
                "confidence": 0.85,
                "model_used": "gpt-4-vision-preview",
                "image_dimensions": image.size
            }
            
        except Exception as e:
            logger.error(f"Error describing image: {e}")
            return {
                "description": "Unable to describe image",
                "confidence": 0.1,
                "error": str(e)
            }
    
    async def _prepare_audio(self, audio_data: Union[bytes, str, np.ndarray]) -> Tuple[Optional[np.ndarray], int]:
        """Prepare audio for processing"""
        try:
            if isinstance(audio_data, np.ndarray):
                return audio_data, self.sample_rate
            elif isinstance(audio_data, str):
                # Assume file path
                audio_array, sr = librosa.load(audio_data, sr=self.sample_rate)
                return audio_array, sr
            elif isinstance(audio_data, bytes):
                # Save bytes to temporary file and load
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_file.write(audio_data)
                    temp_path = temp_file.name
                
                audio_array, sr = librosa.load(temp_path, sr=self.sample_rate)
                Path(temp_path).unlink()  # Clean up temp file
                return audio_array, sr
            else:
                return None, 0
                
        except Exception as e:
            logger.error(f"Error preparing audio: {e}")
            return None, 0
    
    async def _transcribe_audio(
        self,
        audio_array: np.ndarray,
        sample_rate: int,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Transcribe audio using Whisper"""
        try:
            # Save audio to temporary file for Whisper
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                import soundfile as sf
                sf.write(temp_file.name, audio_array, sample_rate)
                temp_path = temp_file.name
            
            # Transcribe using OpenAI Whisper
            with open(temp_path, 'rb') as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
            
            # Clean up temp file
            Path(temp_path).unlink()
            
            return {
                "transcription": transcript.text,
                "language": transcript.language,
                "confidence": 0.9,  # Whisper typically has high confidence
                "segments": getattr(transcript, 'segments', []),
                "duration": len(audio_array) / sample_rate
            }
            
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return {
                "transcription": "",
                "confidence": 0.0,
                "error": str(e)
            }
    
    async def _generate_speech_response(
        self,
        text: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate speech from text"""
        try:
            # Use OpenAI TTS
            response = await client.audio.speech.create(
                model="tts-1",
                voice="alloy",  # Default voice, could be customized based on context
                input=text
            )
            
            # Get audio content
            audio_content = response.content
            
            return {
                "audio_data": base64.b64encode(audio_content).decode(),
                "format": "mp3",
                "duration_estimate": len(text) * 0.1,  # Rough estimate
                "voice": "alloy",
                "confidence": 0.95
            }
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return {
                "error": str(e),
                "confidence": 0.0
            }
    
    def _create_error_result(self, result_id: str, error_message: str) -> ProcessingResult:
        """Create error processing result"""
        return ProcessingResult(
            result_id=result_id,
            input_id="error",
            task_type="error",
            confidence=0.0,
            results={"error": error_message},
            processing_time=0.0,
            model_used="none",
            metadata={"error": True}
        )
    
    async def _store_processing_result(self, result: ProcessingResult):
        """Store processing result in database"""
        try:
            query = """
            INSERT INTO pam_multimodal_processing (
                result_id, input_id, task_type, confidence,
                results, processing_time, model_used, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """
            
            await self.db.execute(
                query,
                result.result_id,
                result.input_id,
                result.task_type,
                result.confidence,
                json.dumps(result.results),
                result.processing_time,
                result.model_used,
                json.dumps(result.metadata)
            )
            
        except Exception as e:
            logger.error(f"Error storing processing result: {e}")


# Global multi-modal capabilities instance
multimodal_capabilities = PAMMultiModalCapabilities()

# Utility functions for easy integration

async def analyze_image(
    image_data: Union[bytes, str, Image.Image],
    task: str = "image_description",
    context: Optional[Dict[str, Any]] = None
) -> ProcessingResult:
    """Convenience function for image analysis"""
    vision_task = VisionTask(task)
    return await multimodal_capabilities.process_image(
        image_data=image_data,
        task=vision_task,
        context=context
    )

async def transcribe_audio(
    audio_data: Union[bytes, str, np.ndarray],
    context: Optional[Dict[str, Any]] = None
) -> ProcessingResult:
    """Convenience function for audio transcription"""
    return await multimodal_capabilities.process_audio(
        audio_data=audio_data,
        task=AudioProcessingTask.TRANSCRIPTION,
        context=context
    )

async def process_document(
    document_data: Union[bytes, str, Path],
    tasks: List[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> ProcessingResult:
    """Convenience function for document processing"""
    extraction_tasks = tasks or ["text_extraction", "summarization"]
    return await multimodal_capabilities.process_document(
        document_data=document_data,
        extraction_tasks=extraction_tasks,
        context=context
    )

async def generate_multimodal_response(
    query: str,
    modalities: List[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Convenience function for multimodal response generation"""
    available_modalities = [ModalityType(m) for m in (modalities or ["text"])]
    return await multimodal_capabilities.generate_multimodal_response(
        query=query,
        available_modalities=available_modalities,
        context=context
    )