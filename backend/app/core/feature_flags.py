"""
Feature Flags Module
Temporary feature toggles for development and A/B testing.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, Any, Optional
from enum import Enum


class FeatureStage(Enum):
    """Feature development stages"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    BETA = "beta"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"


class FeatureFlags(BaseSettings):
    """Feature flags for enabling/disabling features and A/B testing"""
    
    # Core Feature Flags
    ENABLE_PAM_VOICE: bool = True
    ENABLE_PAM_ENHANCED: bool = True
    ENABLE_PAM_AGENTIC: bool = False  # Advanced AI features
    
    # Map Feature Flags
    ENABLE_REAL_TIME_MAP_DATA: bool = True
    ENABLE_OFFLINE_MAPS: bool = False
    ENABLE_ADVANCED_ROUTING: bool = True
    
    # Social Feature Flags
    ENABLE_GROUP_TRIPS: bool = True
    ENABLE_SOCIAL_SHARING: bool = True
    ENABLE_TRIP_MATCHING: bool = False  # Beta feature
    
    # Financial Feature Flags
    ENABLE_EXPENSE_TRACKING: bool = True
    ENABLE_BUDGET_PREDICTIONS: bool = False  # Beta feature
    ENABLE_SPLIT_EXPENSES: bool = True
    
    # AI/ML Feature Flags
    ENABLE_TRIP_RECOMMENDATIONS: bool = True
    ENABLE_PREDICTIVE_MAINTENANCE: bool = False  # Beta feature
    ENABLE_ROUTE_OPTIMIZATION: bool = True
    ENABLE_SMART_NOTIFICATIONS: bool = True
    
    # Performance Feature Flags
    ENABLE_QUERY_CACHING: bool = True
    ENABLE_RESPONSE_COMPRESSION: bool = True
    ENABLE_LAZY_LOADING: bool = True
    ENABLE_PREFETCHING: bool = False  # Testing
    
    # Security Feature Flags
    ENABLE_RATE_LIMITING: bool = True
    ENABLE_REQUEST_VALIDATION: bool = True
    ENABLE_AUDIT_LOGGING: bool = True
    ENABLE_ANOMALY_DETECTION: bool = False  # Beta
    
    # Mobile Feature Flags
    ENABLE_OFFLINE_MODE: bool = True
    ENABLE_PUSH_NOTIFICATIONS: bool = True
    ENABLE_BACKGROUND_SYNC: bool = True
    ENABLE_LOCATION_TRACKING: bool = True
    
    # Integration Feature Flags
    ENABLE_EXTERNAL_WEATHER: bool = True
    ENABLE_EXTERNAL_TRAFFIC: bool = True
    ENABLE_EXTERNAL_FUEL_PRICES: bool = False  # Beta
    ENABLE_EXTERNAL_CAMPGROUND_DATA: bool = True
    
    # Experimental Features (use with caution)
    ENABLE_VOICE_COMMANDS: bool = False
    ENABLE_AR_NAVIGATION: bool = False
    ENABLE_BLOCKCHAIN_PAYMENTS: bool = False
    ENABLE_AI_TRIP_ASSISTANT: bool = False
    
    # A/B Testing Flags
    AB_TEST_NEW_ONBOARDING: bool = False
    AB_TEST_SIMPLIFIED_UI: bool = False
    AB_TEST_ENHANCED_SEARCH: bool = False
    
    # Rollout Percentages (0-100)
    PAM_AGENTIC_ROLLOUT_PERCENT: int = 10
    TRIP_MATCHING_ROLLOUT_PERCENT: int = 25
    BUDGET_PREDICTIONS_ROLLOUT_PERCENT: int = 15
    
    model_config = SettingsConfigDict(
        env_file=[".env", "backend/.env", "../.env"],  # Multiple potential paths
        case_sensitive=True,
        extra="allow"
        # No env_prefix for backward compatibility with existing deployments
    )
    
    def is_feature_enabled(self, feature_name: str, user_id: Optional[str] = None) -> bool:
        """
        Check if a feature is enabled, considering rollout percentages.
        
        Args:
            feature_name: Name of the feature flag
            user_id: Optional user ID for consistent rollout behavior
            
        Returns:
            True if feature is enabled for this user, False otherwise
        """
        if not hasattr(self, feature_name):
            return False
        
        feature_value = getattr(self, feature_name)
        
        # Simple boolean flags
        if isinstance(feature_value, bool):
            return feature_value
        
        # Percentage-based rollout
        rollout_attr = f"{feature_name.replace('ENABLE_', '')}_ROLLOUT_PERCENT"
        if hasattr(self, rollout_attr):
            rollout_percent = getattr(self, rollout_attr)
            if user_id:
                # Consistent user-based rollout using hash
                user_hash = hash(user_id) % 100
                return user_hash < rollout_percent
            else:
                # Random rollout for anonymous users
                import random
                return random.randint(0, 99) < rollout_percent
        
        return False
    
    def get_feature_stage(self, feature_name: str) -> FeatureStage:
        """Get the development stage of a feature"""
        
        # Map features to their stages
        feature_stages = {
            # Production features
            "ENABLE_PAM_VOICE": FeatureStage.PRODUCTION,
            "ENABLE_PAM_ENHANCED": FeatureStage.PRODUCTION,
            "ENABLE_EXPENSE_TRACKING": FeatureStage.PRODUCTION,
            "ENABLE_REAL_TIME_MAP_DATA": FeatureStage.PRODUCTION,
            
            # Beta features
            "ENABLE_PAM_AGENTIC": FeatureStage.BETA,
            "ENABLE_TRIP_MATCHING": FeatureStage.BETA,
            "ENABLE_BUDGET_PREDICTIONS": FeatureStage.BETA,
            "ENABLE_PREDICTIVE_MAINTENANCE": FeatureStage.BETA,
            
            # Testing features
            "ENABLE_PREFETCHING": FeatureStage.TESTING,
            "AB_TEST_NEW_ONBOARDING": FeatureStage.TESTING,
            
            # Development features
            "ENABLE_VOICE_COMMANDS": FeatureStage.DEVELOPMENT,
            "ENABLE_AR_NAVIGATION": FeatureStage.DEVELOPMENT,
            "ENABLE_BLOCKCHAIN_PAYMENTS": FeatureStage.DEVELOPMENT,
        }
        
        return feature_stages.get(feature_name, FeatureStage.PRODUCTION)
    
    def get_enabled_features(self) -> Dict[str, Any]:
        """Get all currently enabled features"""
        enabled = {}
        
        for field_name, field_info in self.model_fields.items():
            if field_name.startswith("ENABLE_") or field_name.startswith("AB_TEST_"):
                value = getattr(self, field_name)
                if value:
                    enabled[field_name] = {
                        "enabled": value,
                        "stage": self.get_feature_stage(field_name).value
                    }
        
        return enabled
    
    def get_rollout_status(self) -> Dict[str, int]:
        """Get rollout percentages for all features"""
        rollouts = {}
        
        for field_name in self.model_fields:
            if field_name.endswith("_ROLLOUT_PERCENT"):
                rollouts[field_name] = getattr(self, field_name)
        
        return rollouts


# Global feature flags instance
feature_flags = FeatureFlags()


def get_feature_flags() -> FeatureFlags:
    """Retrieve the global feature flags."""
    return feature_flags


def is_feature_enabled(feature_name: str, user_id: Optional[str] = None) -> bool:
    """Check if a feature is enabled (convenience function)"""
    return feature_flags.is_feature_enabled(feature_name, user_id)