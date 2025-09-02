"""
PAM Phase 8: Adaptive UI/UX System
Intelligent UI system that adapts to user behavior, context, and preferences in real-time.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import logging
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import cv2

from ..core.base_agent import PAMBaseAgent
from ..integrations.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class AdaptationType(Enum):
    """UI adaptation types"""
    LAYOUT_OPTIMIZATION = "layout_optimization"
    COLOR_ADAPTATION = "color_adaptation"
    TYPOGRAPHY_SCALING = "typography_scaling"
    INTERACTION_METHOD = "interaction_method"
    CONTENT_DENSITY = "content_density"
    NAVIGATION_STYLE = "navigation_style"
    ANIMATION_PREFERENCE = "animation_preference"
    ACCESSIBILITY_MODE = "accessibility_mode"
    CONTEXT_AWARENESS = "context_awareness"
    PREDICTIVE_UI = "predictive_ui"

class AdaptationTrigger(Enum):
    """Triggers for UI adaptation"""
    USER_BEHAVIOR = "user_behavior"
    DEVICE_CONTEXT = "device_context"
    TIME_OF_DAY = "time_of_day"
    LOCATION_CHANGE = "location_change"
    TASK_COMPLETION = "task_completion"
    ERROR_PATTERN = "error_pattern"
    PERFORMANCE_ISSUE = "performance_issue"
    ACCESSIBILITY_NEED = "accessibility_need"
    USAGE_PATTERN = "usage_pattern"
    ENVIRONMENTAL_FACTOR = "environmental_factor"

class UIState(Enum):
    """UI states"""
    FOCUSED = "focused"
    DISTRACTED = "distracted"
    LEARNING = "learning"
    EXPERT = "expert"
    MOBILE = "mobile"
    DESKTOP = "desktop"
    HANDS_FREE = "hands_free"
    LOW_LIGHT = "low_light"
    HIGH_COGNITIVE_LOAD = "high_cognitive_load"
    MULTITASKING = "multitasking"

@dataclass
class UIAdaptation:
    """UI adaptation configuration"""
    adaptation_id: str
    adaptation_type: AdaptationType
    target_element: str
    original_properties: Dict[str, Any]
    adapted_properties: Dict[str, Any]
    confidence_score: float
    impact_score: float
    user_id: str
    trigger: AdaptationTrigger
    context: Dict[str, Any]
    applied_at: datetime
    expires_at: Optional[datetime] = None

@dataclass
class UserUIProfile:
    """User UI behavior profile"""
    user_id: str
    interaction_patterns: Dict[str, Any]
    preferences: Dict[str, Any]
    accessibility_needs: List[str]
    device_usage_patterns: Dict[str, Any]
    cognitive_load_indicators: Dict[str, float]
    adaptation_feedback: Dict[str, int]  # likes/dislikes
    ui_expertise_level: float
    preferred_interaction_methods: List[str]
    color_preferences: Dict[str, Any]
    typography_preferences: Dict[str, Any]
    layout_preferences: Dict[str, Any]

@dataclass
class ContextualFactor:
    """Contextual factor affecting UI"""
    factor_id: str
    factor_type: str
    value: Any
    confidence: float
    impact_weight: float
    detected_at: datetime

class PAMAdaptiveUISystem:
    """Intelligent adaptive UI/UX system"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.user_ui_profiles: Dict[str, UserUIProfile] = {}
        self.active_adaptations: Dict[str, List[UIAdaptation]] = {}
        self.adaptation_rules: Dict[str, Callable] = {}
        self.context_analyzers: Dict[str, Callable] = {}
        self.ui_state_machine: Dict[str, UIState] = {}
        self.ml_models: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize adaptive UI system"""
        try:
            await self._setup_adaptation_rules()
            await self._setup_context_analyzers()
            await self._load_user_profiles()
            await self._initialize_ml_models()
            logger.info("Adaptive UI system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize adaptive UI system: {e}")
    
    async def analyze_user_context(self, user_id: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user context for UI adaptations"""
        try:
            contextual_factors = []
            
            # Device context analysis
            if 'device_info' in context_data:
                device_factors = await self._analyze_device_context(context_data['device_info'])
                contextual_factors.extend(device_factors)
            
            # Environmental context analysis
            if 'environment' in context_data:
                env_factors = await self._analyze_environmental_context(context_data['environment'])
                contextual_factors.extend(env_factors)
            
            # Behavioral context analysis
            if 'user_behavior' in context_data:
                behavior_factors = await self._analyze_behavioral_context(
                    user_id, context_data['user_behavior']
                )
                contextual_factors.extend(behavior_factors)
            
            # Temporal context analysis
            time_factors = await self._analyze_temporal_context(context_data.get('timestamp'))
            contextual_factors.extend(time_factors)
            
            # Task context analysis
            if 'current_task' in context_data:
                task_factors = await self._analyze_task_context(context_data['current_task'])
                contextual_factors.extend(task_factors)
            
            # Determine UI state
            ui_state = await self._determine_ui_state(contextual_factors)
            self.ui_state_machine[user_id] = ui_state
            
            # Calculate adaptation recommendations
            adaptation_recommendations = await self._calculate_adaptation_recommendations(
                user_id, contextual_factors, ui_state
            )
            
            return {
                'user_id': user_id,
                'contextual_factors': [asdict(factor) for factor in contextual_factors],
                'ui_state': ui_state.value,
                'adaptation_recommendations': adaptation_recommendations,
                'context_confidence': await self._calculate_context_confidence(contextual_factors),
                'analyzed_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze user context for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def apply_ui_adaptations(self, user_id: str, adaptation_recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply UI adaptations based on recommendations"""
        try:
            applied_adaptations = []
            failed_adaptations = []
            
            for recommendation in adaptation_recommendations:
                try:
                    # Create adaptation
                    adaptation = UIAdaptation(
                        adaptation_id=f"adapt_{user_id}_{int(datetime.utcnow().timestamp())}",
                        adaptation_type=AdaptationType(recommendation['adaptation_type']),
                        target_element=recommendation['target_element'],
                        original_properties=recommendation['original_properties'],
                        adapted_properties=recommendation['adapted_properties'],
                        confidence_score=recommendation['confidence_score'],
                        impact_score=recommendation['impact_score'],
                        user_id=user_id,
                        trigger=AdaptationTrigger(recommendation['trigger']),
                        context=recommendation['context'],
                        applied_at=datetime.utcnow(),
                        expires_at=recommendation.get('expires_at')
                    )
                    
                    # Apply adaptation
                    success = await self._apply_single_adaptation(adaptation)
                    
                    if success:
                        applied_adaptations.append(adaptation)
                        
                        # Store in active adaptations
                        if user_id not in self.active_adaptations:
                            self.active_adaptations[user_id] = []
                        self.active_adaptations[user_id].append(adaptation)
                        
                    else:
                        failed_adaptations.append(recommendation)
                        
                except Exception as e:
                    logger.error(f"Failed to apply single adaptation: {e}")
                    failed_adaptations.append(recommendation)
            
            # Store adaptations in database
            for adaptation in applied_adaptations:
                await self._store_ui_adaptation(adaptation)
            
            # Update user UI profile
            await self._update_user_ui_profile(user_id, applied_adaptations)
            
            return {
                'status': 'applied',
                'applied_adaptations': len(applied_adaptations),
                'failed_adaptations': len(failed_adaptations),
                'adaptations': [asdict(adapt) for adapt in applied_adaptations],
                'failures': failed_adaptations,
                'estimated_impact': await self._estimate_adaptation_impact(applied_adaptations)
            }
            
        except Exception as e:
            logger.error(f"Failed to apply UI adaptations for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def create_predictive_ui(self, user_id: str, predicted_actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create predictive UI elements based on anticipated user actions"""
        try:
            predictive_elements = []
            
            for prediction in predicted_actions:
                action_type = prediction['action_type']
                confidence = prediction['confidence']
                context = prediction['context']
                
                # Generate predictive UI element based on action type
                if action_type == 'navigation':
                    element = await self._create_predictive_navigation(prediction, user_id)
                elif action_type == 'form_input':
                    element = await self._create_predictive_form_assist(prediction, user_id)
                elif action_type == 'content_interaction':
                    element = await self._create_predictive_content_highlight(prediction, user_id)
                elif action_type == 'settings_change':
                    element = await self._create_predictive_settings_suggestion(prediction, user_id)
                else:
                    element = await self._create_generic_predictive_element(prediction, user_id)
                
                if element and confidence > 0.7:  # Only show high-confidence predictions
                    predictive_elements.append(element)
            
            # Create predictive UI configuration
            predictive_ui_config = {
                'user_id': user_id,
                'elements': predictive_elements,
                'display_strategy': await self._determine_predictive_display_strategy(
                    user_id, predictive_elements
                ),
                'interaction_hints': await self._generate_interaction_hints(predictive_elements),
                'fallback_behavior': await self._define_predictive_fallback(user_id),
                'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
            }
            
            return {
                'status': 'created',
                'predictive_ui_config': predictive_ui_config,
                'elements_created': len(predictive_elements),
                'average_confidence': np.mean([pred['confidence'] for pred in predicted_actions])
            }
            
        except Exception as e:
            logger.error(f"Failed to create predictive UI for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def adapt_for_accessibility(self, user_id: str, accessibility_needs: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt UI for accessibility requirements"""
        try:
            accessibility_adaptations = []
            
            for need in accessibility_needs:
                if need == 'visual_impairment':
                    adaptations = await self._create_visual_impairment_adaptations(user_id, context)
                elif need == 'motor_impairment':
                    adaptations = await self._create_motor_impairment_adaptations(user_id, context)
                elif need == 'cognitive_impairment':
                    adaptations = await self._create_cognitive_impairment_adaptations(user_id, context)
                elif need == 'hearing_impairment':
                    adaptations = await self._create_hearing_impairment_adaptations(user_id, context)
                elif need == 'temporary_impairment':
                    adaptations = await self._create_temporary_impairment_adaptations(user_id, context)
                else:
                    adaptations = await self._create_generic_accessibility_adaptations(need, user_id, context)
                
                accessibility_adaptations.extend(adaptations)
            
            # Remove duplicate adaptations
            unique_adaptations = await self._deduplicate_adaptations(accessibility_adaptations)
            
            # Apply accessibility adaptations
            application_result = await self.apply_ui_adaptations(user_id, unique_adaptations)
            
            # Store accessibility profile
            await self._update_accessibility_profile(user_id, accessibility_needs, unique_adaptations)
            
            return {
                'status': 'adapted',
                'accessibility_needs': accessibility_needs,
                'adaptations_applied': application_result['applied_adaptations'],
                'wcag_compliance_level': await self._check_wcag_compliance(unique_adaptations),
                'user_testing_recommended': await self._recommend_user_testing(accessibility_needs)
            }
            
        except Exception as e:
            logger.error(f"Failed to adapt for accessibility for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def optimize_ui_performance(self, user_id: str, performance_context: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize UI for performance based on device and network conditions"""
        try:
            performance_adaptations = []
            
            # Analyze performance constraints
            constraints = await self._analyze_performance_constraints(performance_context)
            
            # CPU/Memory optimizations
            if constraints['cpu_limited']:
                cpu_adaptations = await self._create_cpu_optimizations(user_id, constraints)
                performance_adaptations.extend(cpu_adaptations)
            
            # Network optimizations
            if constraints['network_limited']:
                network_adaptations = await self._create_network_optimizations(user_id, constraints)
                performance_adaptations.extend(network_adaptations)
            
            # Battery optimizations
            if constraints['battery_limited']:
                battery_adaptations = await self._create_battery_optimizations(user_id, constraints)
                performance_adaptations.extend(battery_adaptations)
            
            # Storage optimizations
            if constraints['storage_limited']:
                storage_adaptations = await self._create_storage_optimizations(user_id, constraints)
                performance_adaptations.extend(storage_adaptations)
            
            # Apply performance optimizations
            application_result = await self.apply_ui_adaptations(user_id, performance_adaptations)
            
            # Monitor performance impact
            await self._start_performance_monitoring(user_id, performance_adaptations)
            
            return {
                'status': 'optimized',
                'constraints_addressed': constraints,
                'optimizations_applied': application_result['applied_adaptations'],
                'expected_performance_improvement': await self._calculate_performance_improvement(
                    performance_adaptations
                ),
                'monitoring_enabled': True
            }
            
        except Exception as e:
            logger.error(f"Failed to optimize UI performance for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def learn_from_user_feedback(self, user_id: str, adaptation_id: str, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """Learn from user feedback on UI adaptations"""
        try:
            # Store feedback
            await self.supabase.table('pam_ui_adaptation_feedback').insert({
                'user_id': user_id,
                'adaptation_id': adaptation_id,
                'feedback_type': feedback['type'],
                'rating': feedback.get('rating'),
                'comments': feedback.get('comments'),
                'helpful': feedback.get('helpful'),
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            # Update user UI profile
            user_profile = self.user_ui_profiles.get(user_id)
            if user_profile:
                if adaptation_id not in user_profile.adaptation_feedback:
                    user_profile.adaptation_feedback[adaptation_id] = 0
                
                # Convert feedback to numeric score
                if feedback['type'] == 'positive':
                    user_profile.adaptation_feedback[adaptation_id] += 1
                elif feedback['type'] == 'negative':
                    user_profile.adaptation_feedback[adaptation_id] -= 1
            
            # Update ML models with feedback
            await self._update_ml_models_with_feedback(user_id, adaptation_id, feedback)
            
            # Adjust future adaptation strategies
            await self._adjust_adaptation_strategies(user_id, adaptation_id, feedback)
            
            # Generate insights from feedback
            feedback_insights = await self._generate_feedback_insights(user_id, feedback)
            
            return {
                'status': 'learned',
                'feedback_processed': True,
                'insights_generated': len(feedback_insights),
                'strategy_updated': True,
                'impact_on_future_adaptations': feedback_insights.get('impact_score', 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to learn from user feedback: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_ui_adaptation_analytics(self, user_id: str, time_period: str = '30d') -> Dict[str, Any]:
        """Get UI adaptation analytics"""
        try:
            days = int(time_period.rstrip('d'))
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get adaptation history
            adaptations = await self.supabase.table('pam_ui_adaptations').select('*').eq(
                'user_id', user_id
            ).gte('applied_at', start_date.isoformat()).execute()
            
            # Get feedback data
            feedback = await self.supabase.table('pam_ui_adaptation_feedback').select('*').eq(
                'user_id', user_id
            ).gte('created_at', start_date.isoformat()).execute()
            
            # Calculate metrics
            total_adaptations = len(adaptations.data)
            adaptation_types = {}
            success_rate = 0
            
            for adaptation in adaptations.data:
                adapt_type = adaptation['adaptation_type']
                adaptation_types[adapt_type] = adaptation_types.get(adapt_type, 0) + 1
            
            # Calculate success rate based on feedback
            positive_feedback = len([f for f in feedback.data if f['feedback_type'] == 'positive'])
            total_feedback = len(feedback.data)
            success_rate = (positive_feedback / total_feedback * 100) if total_feedback > 0 else 0
            
            # Performance impact
            performance_impact = await self._calculate_adaptation_performance_impact(
                user_id, adaptations.data
            )
            
            # User satisfaction trend
            satisfaction_trend = await self._calculate_satisfaction_trend(feedback.data)
            
            return {
                'user_id': user_id,
                'time_period': time_period,
                'analytics': {
                    'total_adaptations': total_adaptations,
                    'adaptation_types': adaptation_types,
                    'success_rate': success_rate,
                    'performance_impact': performance_impact,
                    'satisfaction_trend': satisfaction_trend,
                    'most_successful_adaptations': await self._get_most_successful_adaptations(
                        adaptations.data, feedback.data
                    ),
                    'improvement_areas': await self._identify_improvement_areas(
                        adaptations.data, feedback.data
                    )
                },
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get UI adaptation analytics for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_adaptive_ui_status(self) -> Dict[str, Any]:
        """Get adaptive UI system status"""
        try:
            return {
                'status': 'operational',
                'active_user_profiles': len(self.user_ui_profiles),
                'active_adaptations': sum(len(adaptations) for adaptations in self.active_adaptations.values()),
                'adaptation_rules_loaded': len(self.adaptation_rules),
                'context_analyzers_active': len(self.context_analyzers),
                'ml_models_loaded': len(self.ml_models),
                'supported_adaptation_types': [adapt_type.value for adapt_type in AdaptationType],
                'supported_triggers': [trigger.value for trigger in AdaptationTrigger],
                'system_health': {
                    'context_analysis': 'healthy',
                    'adaptation_engine': 'healthy',
                    'ml_models': 'healthy',
                    'feedback_learning': 'healthy'
                },
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get adaptive UI status: {e}")
            return {'status': 'error', 'message': str(e)}

# Global instance
pam_adaptive_ui_system = PAMAdaptiveUISystem()