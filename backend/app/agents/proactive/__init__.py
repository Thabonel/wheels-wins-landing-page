"""
PAM Proactive Intelligence System - Phase 4
Transforms PAM from reactive to anticipatory AI companion
"""

from .monitoring import ProactiveMonitoringService, UserPattern, LocationContext, EnvironmentalContext
from .predictive import PredictiveAssistanceEngine, PredictiveAssistance, UserBehaviorProfile
from .voice_enhanced import EnhancedVoiceProcessor, VoiceContext, EmotionalTone, VoiceResponse
from .background_tasks import BackgroundTaskManager, TaskPriority, TaskStatus, BackgroundTask
from .context_awareness import ContextAwarenessEngine, ContextType, ContextualInsight, AnticipatedNeed
from .coordinator import ProactiveIntelligenceCoordinator, ProactiveMode, ProactiveResponse

__all__ = [
    # Core services
    'ProactiveMonitoringService',
    'PredictiveAssistanceEngine', 
    'EnhancedVoiceProcessor',
    'BackgroundTaskManager',
    'ContextAwarenessEngine',
    'ProactiveIntelligenceCoordinator',
    
    # Monitoring classes
    'UserPattern',
    'LocationContext',
    'EnvironmentalContext',
    
    # Predictive classes
    'PredictiveAssistance',
    'UserBehaviorProfile',
    
    # Voice classes
    'VoiceContext',
    'EmotionalTone', 
    'VoiceResponse',
    
    # Background task classes
    'TaskPriority',
    'TaskStatus',
    'BackgroundTask',
    
    # Context awareness classes
    'ContextType',
    'ContextualInsight',
    'AnticipatedNeed',
    
    # Coordinator classes
    'ProactiveMode',
    'ProactiveResponse'
]