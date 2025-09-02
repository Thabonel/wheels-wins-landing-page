"""
PAM Phase 8: Advanced Personalized Dashboard System
Intelligent, adaptive dashboard that learns from user behavior and provides personalized experiences.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import logging
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from ..core.base_agent import PAMBaseAgent
from ..integrations.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class WidgetType(Enum):
    """Dashboard widget types"""
    QUICK_ACTIONS = "quick_actions"
    TRAVEL_SUMMARY = "travel_summary"
    FINANCIAL_OVERVIEW = "financial_overview"
    SOCIAL_FEED = "social_feed"
    WEATHER = "weather"
    CALENDAR = "calendar"
    NOTIFICATIONS = "notifications"
    RECOMMENDATIONS = "recommendations"
    ANALYTICS = "analytics"
    GOALS_PROGRESS = "goals_progress"
    QUICK_STATS = "quick_stats"
    RECENT_ACTIVITY = "recent_activity"
    PERSONALIZED_INSIGHTS = "personalized_insights"
    IOT_STATUS = "iot_status"
    VOICE_ASSISTANT = "voice_assistant"

class LayoutType(Enum):
    """Dashboard layout types"""
    GRID = "grid"
    MASONRY = "masonry"
    CAROUSEL = "carousel"
    LIST = "list"
    TABS = "tabs"
    ACCORDION = "accordion"

class PersonalizationLevel(Enum):
    """Personalization levels"""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class DashboardWidget:
    """Dashboard widget configuration"""
    widget_id: str
    widget_type: WidgetType
    title: str
    position: Dict[str, int]  # x, y, width, height
    data_source: str
    refresh_interval: int  # seconds
    visibility_rules: Dict[str, Any]
    personalization_weights: Dict[str, float]
    interactive_elements: List[str]
    color_scheme: Optional[str] = None
    is_resizable: bool = True
    is_movable: bool = True
    min_size: Dict[str, int] = None
    max_size: Dict[str, int] = None

@dataclass
class DashboardLayout:
    """Dashboard layout configuration"""
    layout_id: str
    layout_type: LayoutType
    widgets: List[DashboardWidget]
    breakpoints: Dict[str, Dict[str, int]]
    theme_config: Dict[str, Any]
    animation_config: Dict[str, Any]
    accessibility_config: Dict[str, Any]
    responsive_rules: Dict[str, Any]

@dataclass
class UserBehavior:
    """User behavior tracking"""
    user_id: str
    widget_interactions: Dict[str, int]
    time_spent_per_widget: Dict[str, float]
    preferred_layout: LayoutType
    active_hours: List[int]
    device_usage_patterns: Dict[str, float]
    content_preferences: Dict[str, float]
    interaction_frequency: Dict[str, int]
    last_active: datetime

@dataclass
class PersonalizationInsight:
    """Personalization insight"""
    insight_id: str
    user_id: str
    insight_type: str
    title: str
    description: str
    confidence_score: float
    impact_score: float
    actionable: bool
    suggested_actions: List[str]
    data_points: Dict[str, Any]
    generated_at: datetime

class PAMPersonalizedDashboardSystem:
    """Advanced personalized dashboard system"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.user_behaviors: Dict[str, UserBehavior] = {}
        self.dashboard_layouts: Dict[str, DashboardLayout] = {}
        self.widget_templates: Dict[str, DashboardWidget] = {}
        self.personalization_models: Dict[str, Any] = {}
        self.real_time_updates: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize personalized dashboard system"""
        try:
            await self._load_widget_templates()
            await self._load_user_behaviors()
            await self._initialize_personalization_models()
            await self._setup_real_time_updates()
            logger.info("Personalized dashboard system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize dashboard system: {e}")
    
    async def create_personalized_dashboard(self, user_id: str, device_context: Dict[str, Any]) -> Dict[str, Any]:
        """Create personalized dashboard for user"""
        try:
            # Get user behavior and preferences
            user_behavior = await self._get_or_create_user_behavior(user_id)
            
            # Analyze user patterns
            personalization_insights = await self._generate_personalization_insights(user_id)
            
            # Select optimal widgets based on user behavior
            recommended_widgets = await self._recommend_widgets(user_id, device_context)
            
            # Create adaptive layout
            optimal_layout = await self._create_adaptive_layout(
                user_id, recommended_widgets, device_context
            )
            
            # Apply personalization
            personalized_layout = await self._apply_personalization(
                optimal_layout, user_behavior, personalization_insights
            )
            
            # Generate dashboard configuration
            dashboard_config = await self._generate_dashboard_config(
                user_id, personalized_layout, device_context
            )
            
            return {
                'status': 'success',
                'dashboard_id': f"dashboard_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                'layout': personalized_layout,
                'config': dashboard_config,
                'personalization_insights': personalization_insights,
                'real_time_updates': await self._setup_user_real_time_updates(user_id)
            }
            
        except Exception as e:
            logger.error(f"Failed to create personalized dashboard for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def update_dashboard_based_on_behavior(self, user_id: str, interaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update dashboard based on user behavior"""
        try:
            # Update user behavior tracking
            await self._update_user_behavior(user_id, interaction_data)
            
            # Analyze behavior changes
            behavior_changes = await self._analyze_behavior_changes(user_id)
            
            if not behavior_changes['significant_changes']:
                return {'status': 'no_update_needed'}
            
            # Regenerate personalization insights
            updated_insights = await self._generate_personalization_insights(user_id)
            
            # Update widget recommendations
            updated_widgets = await self._update_widget_recommendations(user_id, behavior_changes)
            
            # Optimize layout
            optimized_layout = await self._optimize_layout_for_behavior(user_id, updated_widgets)
            
            return {
                'status': 'updated',
                'changes': behavior_changes,
                'updated_insights': updated_insights,
                'layout_changes': optimized_layout,
                'confidence_score': behavior_changes['confidence']
            }
            
        except Exception as e:
            logger.error(f"Failed to update dashboard for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_personalized_content(self, user_id: str, widget_type: WidgetType, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get personalized content for specific widget"""
        try:
            user_behavior = self.user_behaviors.get(user_id)
            if not user_behavior:
                user_behavior = await self._load_user_behavior(user_id)
            
            # Generate content based on widget type and user preferences
            content_generators = {
                WidgetType.TRAVEL_SUMMARY: self._generate_travel_content,
                WidgetType.FINANCIAL_OVERVIEW: self._generate_financial_content,
                WidgetType.SOCIAL_FEED: self._generate_social_content,
                WidgetType.RECOMMENDATIONS: self._generate_recommendations_content,
                WidgetType.ANALYTICS: self._generate_analytics_content,
                WidgetType.PERSONALIZED_INSIGHTS: self._generate_insights_content,
                WidgetType.QUICK_ACTIONS: self._generate_quick_actions_content,
                WidgetType.GOALS_PROGRESS: self._generate_goals_content
            }
            
            generator = content_generators.get(widget_type)
            if not generator:
                return {'status': 'error', 'message': 'Widget type not supported'}
            
            content = await generator(user_id, user_behavior, context)
            
            # Apply personalization filters
            personalized_content = await self._apply_content_personalization(
                content, user_behavior, widget_type
            )
            
            return {
                'status': 'success',
                'widget_type': widget_type.value,
                'content': personalized_content,
                'personalization_applied': True,
                'refresh_interval': await self._calculate_optimal_refresh_interval(
                    user_id, widget_type
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to get personalized content for {user_id}, {widget_type}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def create_adaptive_theme(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create adaptive theme based on user preferences and context"""
        try:
            user_behavior = self.user_behaviors.get(user_id)
            
            # Analyze user's color preferences from interactions
            color_preferences = await self._analyze_color_preferences(user_id)
            
            # Consider time of day and context
            time_based_preferences = await self._get_time_based_theme_preferences(context)
            
            # Consider device capabilities
            device_capabilities = context.get('device_capabilities', [])
            
            # Generate adaptive theme
            theme = {
                'primary_colors': await self._select_primary_colors(color_preferences, context),
                'typography': await self._select_typography(user_behavior, device_capabilities),
                'spacing': await self._calculate_optimal_spacing(context),
                'animations': await self._select_animations(user_behavior, device_capabilities),
                'accessibility': await self._apply_accessibility_theme(context),
                'context_adaptations': {
                    'dark_mode_auto': time_based_preferences['auto_dark_mode'],
                    'high_contrast': context.get('accessibility_features', {}).get('high_contrast', False),
                    'large_text': context.get('accessibility_features', {}).get('large_text', False),
                    'reduced_motion': context.get('accessibility_features', {}).get('reduced_motion', False)
                }
            }
            
            # Store theme preferences
            await self._store_theme_preferences(user_id, theme)
            
            return {
                'status': 'success',
                'theme': theme,
                'personalization_score': await self._calculate_theme_personalization_score(
                    user_id, theme
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to create adaptive theme for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def _recommend_widgets(self, user_id: str, device_context: Dict[str, Any]) -> List[DashboardWidget]:
        """Recommend widgets based on user behavior and context"""
        try:
            user_behavior = self.user_behaviors.get(user_id)
            
            # Score all available widgets
            widget_scores = {}
            for widget_id, template in self.widget_templates.items():
                score = await self._calculate_widget_relevance_score(
                    user_id, template, user_behavior, device_context
                )
                widget_scores[widget_id] = score
            
            # Sort by score and select top widgets
            sorted_widgets = sorted(widget_scores.items(), key=lambda x: x[1], reverse=True)
            
            # Consider device screen size for widget count
            max_widgets = await self._calculate_max_widgets(device_context)
            
            recommended_widgets = []
            for widget_id, score in sorted_widgets[:max_widgets]:
                if score > 0.3:  # Minimum relevance threshold
                    widget = self.widget_templates[widget_id]
                    # Adapt widget for user preferences
                    personalized_widget = await self._personalize_widget(
                        widget, user_behavior, device_context
                    )
                    recommended_widgets.append(personalized_widget)
            
            return recommended_widgets
            
        except Exception as e:
            logger.error(f"Failed to recommend widgets for {user_id}: {e}")
            return []
    
    async def _generate_personalization_insights(self, user_id: str) -> List[PersonalizationInsight]:
        """Generate personalization insights for user"""
        try:
            user_behavior = self.user_behaviors.get(user_id)
            if not user_behavior:
                return []
            
            insights = []
            
            # Usage pattern insights
            if user_behavior.active_hours:
                peak_hours = await self._analyze_peak_usage_hours(user_behavior.active_hours)
                insights.append(PersonalizationInsight(
                    insight_id=f"usage_pattern_{user_id}",
                    user_id=user_id,
                    insight_type="usage_pattern",
                    title="Optimal Dashboard Timing",
                    description=f"You're most active between {peak_hours['start']}:00 and {peak_hours['end']}:00",
                    confidence_score=peak_hours['confidence'],
                    impact_score=0.7,
                    actionable=True,
                    suggested_actions=[
                        "Enable proactive notifications during peak hours",
                        "Pre-load content before active periods",
                        "Optimize widget refresh timing"
                    ],
                    data_points={'peak_hours': peak_hours},
                    generated_at=datetime.utcnow()
                ))
            
            # Widget preference insights
            top_widgets = sorted(user_behavior.widget_interactions.items(), key=lambda x: x[1], reverse=True)[:3]
            if top_widgets:
                insights.append(PersonalizationInsight(
                    insight_id=f"widget_preference_{user_id}",
                    user_id=user_id,
                    insight_type="widget_preference",
                    title="Favorite Features",
                    description=f"You use {top_widgets[0][0]} most frequently",
                    confidence_score=0.8,
                    impact_score=0.9,
                    actionable=True,
                    suggested_actions=[
                        f"Prioritize {top_widgets[0][0]} in layout",
                        "Add quick access shortcuts",
                        "Enable related widgets"
                    ],
                    data_points={'top_widgets': top_widgets},
                    generated_at=datetime.utcnow()
                ))
            
            # Efficiency insights
            efficiency_score = await self._calculate_user_efficiency(user_behavior)
            if efficiency_score < 0.7:
                insights.append(PersonalizationInsight(
                    insight_id=f"efficiency_{user_id}",
                    user_id=user_id,
                    insight_type="efficiency",
                    title="Dashboard Optimization Opportunity",
                    description="Your dashboard layout could be optimized for faster access",
                    confidence_score=0.6,
                    impact_score=0.8,
                    actionable=True,
                    suggested_actions=[
                        "Reorganize widgets by usage frequency",
                        "Reduce widget clutter",
                        "Enable gesture shortcuts"
                    ],
                    data_points={'efficiency_score': efficiency_score},
                    generated_at=datetime.utcnow()
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to generate personalization insights for {user_id}: {e}")
            return []
    
    async def _generate_travel_content(self, user_id: str, user_behavior: UserBehavior, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized travel content"""
        return {
            'upcoming_trips': await self._get_upcoming_trips(user_id),
            'travel_recommendations': await self._get_travel_recommendations(user_id, user_behavior),
            'recent_bookings': await self._get_recent_bookings(user_id),
            'travel_alerts': await self._get_travel_alerts(user_id),
            'favorite_destinations': await self._get_favorite_destinations(user_id)
        }
    
    async def _generate_financial_content(self, user_id: str, user_behavior: UserBehavior, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized financial content"""
        return {
            'account_summary': await self._get_account_summary(user_id),
            'spending_insights': await self._get_spending_insights(user_id),
            'budget_status': await self._get_budget_status(user_id),
            'financial_goals': await self._get_financial_goals_progress(user_id),
            'investment_summary': await self._get_investment_summary(user_id)
        }
    
    async def get_dashboard_analytics(self, user_id: str, time_period: str = '30d') -> Dict[str, Any]:
        """Get comprehensive dashboard analytics"""
        try:
            # Widget usage analytics
            widget_analytics = await self.supabase.table('pam_widget_interactions').select(
                'widget_type, interaction_count, total_time_spent'
            ).eq('user_id', user_id).gte(
                'created_at', 
                (datetime.utcnow() - timedelta(days=30)).isoformat()
            ).execute()
            
            # Layout effectiveness
            layout_effectiveness = await self._calculate_layout_effectiveness(user_id)
            
            # Personalization impact
            personalization_impact = await self._measure_personalization_impact(user_id)
            
            # User satisfaction metrics
            satisfaction_metrics = await self._calculate_satisfaction_metrics(user_id)
            
            return {
                'status': 'success',
                'time_period': time_period,
                'widget_analytics': widget_analytics.data,
                'layout_effectiveness': layout_effectiveness,
                'personalization_impact': personalization_impact,
                'satisfaction_metrics': satisfaction_metrics,
                'recommendations': await self._generate_analytics_recommendations(user_id),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard analytics for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def export_dashboard_config(self, user_id: str) -> Dict[str, Any]:
        """Export user's personalized dashboard configuration"""
        try:
            user_behavior = self.user_behaviors.get(user_id)
            layout = self.dashboard_layouts.get(f"layout_{user_id}")
            
            config = {
                'user_id': user_id,
                'dashboard_version': '8.0',
                'exported_at': datetime.utcnow().isoformat(),
                'user_behavior': asdict(user_behavior) if user_behavior else None,
                'layout_config': asdict(layout) if layout else None,
                'personalization_insights': await self._get_stored_insights(user_id),
                'theme_preferences': await self._get_theme_preferences(user_id),
                'widget_preferences': await self._get_widget_preferences(user_id)
            }
            
            return {
                'status': 'success',
                'config': config,
                'export_format': 'json',
                'import_instructions': 'Use import_dashboard_config() to restore this configuration'
            }
            
        except Exception as e:
            logger.error(f"Failed to export dashboard config for {user_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_personalized_dashboard_status(self) -> Dict[str, Any]:
        """Get personalized dashboard system status"""
        try:
            # Count active users
            active_users = len(self.user_behaviors)
            
            # Get personalization effectiveness
            effectiveness_scores = []
            for user_id in self.user_behaviors.keys():
                score = await self._calculate_personalization_effectiveness(user_id)
                effectiveness_scores.append(score)
            
            avg_effectiveness = np.mean(effectiveness_scores) if effectiveness_scores else 0
            
            # Get widget usage statistics
            widget_stats = await self.supabase.table('pam_widget_interactions').select(
                'widget_type, count(*)'
            ).execute()
            
            return {
                'status': 'operational',
                'active_users': active_users,
                'personalization_effectiveness': avg_effectiveness,
                'widget_usage_stats': widget_stats.data,
                'supported_widgets': len(self.widget_templates),
                'real_time_updates_active': len(self.real_time_updates),
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard status: {e}")
            return {'status': 'error', 'message': str(e)}

# Global instance
pam_personalized_dashboard_system = PAMPersonalizedDashboardSystem()