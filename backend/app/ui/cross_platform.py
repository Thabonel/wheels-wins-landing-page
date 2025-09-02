"""
PAM Phase 8: Cross-Platform Mobile Experience
Advanced mobile and cross-platform user experience system.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import logging
from pathlib import Path

from ..core.base_agent import PAMBaseAgent
from ..integrations.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class PlatformType(Enum):
    """Supported platform types"""
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    DESKTOP = "desktop"
    WATCH = "watch"
    TABLET = "tablet"
    TV = "tv"
    AUTOMOTIVE = "automotive"

class DeviceCapability(Enum):
    """Device capabilities"""
    TOUCH = "touch"
    VOICE = "voice"
    CAMERA = "camera"
    GPS = "gps"
    ACCELEROMETER = "accelerometer"
    GYROSCOPE = "gyroscope"
    FACE_ID = "face_id"
    FINGERPRINT = "fingerprint"
    NFC = "nfc"
    HAPTICS = "haptics"
    AR = "ar"
    VR = "vr"

@dataclass
class DeviceProfile:
    """Device profile information"""
    device_id: str
    platform: PlatformType
    capabilities: List[DeviceCapability]
    screen_size: Dict[str, int]  # width, height
    screen_density: float
    os_version: str
    app_version: str
    connection_type: str  # wifi, cellular, etc.
    battery_level: Optional[float] = None
    is_low_power_mode: bool = False
    accessibility_features: List[str] = None
    preferred_language: str = "en"
    timezone: str = "UTC"
    location_permission: bool = False
    notification_permission: bool = False

@dataclass
class UIComponent:
    """Cross-platform UI component"""
    component_id: str
    component_type: str
    platform_variants: Dict[str, Dict[str, Any]]
    accessibility_info: Dict[str, str]
    responsive_breakpoints: Dict[str, Dict[str, Any]]
    animations: Dict[str, Any]
    gestures: List[str]
    voice_commands: List[str]

@dataclass
class UserInteraction:
    """User interaction event"""
    interaction_id: str
    user_id: str
    device_id: str
    interaction_type: str  # tap, swipe, voice, gesture, etc.
    component_id: str
    context: Dict[str, Any]
    timestamp: datetime
    duration_ms: int
    success: bool
    error_message: Optional[str] = None

class PAMCrossPlatformSystem:
    """Advanced cross-platform mobile experience system"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.device_profiles: Dict[str, DeviceProfile] = {}
        self.ui_components: Dict[str, UIComponent] = {}
        self.active_sessions: Dict[str, Dict] = {}
        self.platform_adapters = {
            PlatformType.WEB: self._web_adapter,
            PlatformType.IOS: self._ios_adapter,
            PlatformType.ANDROID: self._android_adapter,
            PlatformType.DESKTOP: self._desktop_adapter,
            PlatformType.WATCH: self._watch_adapter,
            PlatformType.TABLET: self._tablet_adapter,
            PlatformType.TV: self._tv_adapter,
            PlatformType.AUTOMOTIVE: self._automotive_adapter
        }
        
    async def initialize(self):
        """Initialize cross-platform system"""
        try:
            await self._load_ui_components()
            await self._setup_platform_adapters()
            logger.info("Cross-platform system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize cross-platform system: {e}")
            
    async def register_device(self, device_profile: DeviceProfile) -> Dict[str, Any]:
        """Register a new device"""
        try:
            # Store device profile
            self.device_profiles[device_profile.device_id] = device_profile
            
            # Save to database
            await self.supabase.table('pam_device_profiles').upsert({
                'device_id': device_profile.device_id,
                'platform': device_profile.platform.value,
                'capabilities': [cap.value for cap in device_profile.capabilities],
                'screen_size': device_profile.screen_size,
                'screen_density': device_profile.screen_density,
                'os_version': device_profile.os_version,
                'app_version': device_profile.app_version,
                'connection_type': device_profile.connection_type,
                'accessibility_features': device_profile.accessibility_features or [],
                'preferred_language': device_profile.preferred_language,
                'timezone': device_profile.timezone,
                'location_permission': device_profile.location_permission,
                'notification_permission': device_profile.notification_permission,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }).execute()
            
            # Generate platform-specific configuration
            platform_config = await self._generate_platform_config(device_profile)
            
            return {
                'status': 'registered',
                'device_id': device_profile.device_id,
                'platform_config': platform_config,
                'ui_components': await self._get_platform_ui_components(device_profile.platform)
            }
            
        except Exception as e:
            logger.error(f"Failed to register device {device_profile.device_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def adapt_ui_for_device(self, device_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt UI for specific device and context"""
        try:
            device_profile = self.device_profiles.get(device_id)
            if not device_profile:
                device_profile = await self._load_device_profile(device_id)
                
            if not device_profile:
                return {'status': 'error', 'message': 'Device not found'}
            
            # Get platform adapter
            adapter = self.platform_adapters.get(device_profile.platform)
            if not adapter:
                return {'status': 'error', 'message': 'Platform not supported'}
            
            # Apply platform-specific adaptations
            adapted_ui = await adapter(device_profile, context)
            
            # Apply accessibility adaptations
            if device_profile.accessibility_features:
                adapted_ui = await self._apply_accessibility_adaptations(
                    adapted_ui, device_profile.accessibility_features
                )
            
            # Apply responsive adaptations
            adapted_ui = await self._apply_responsive_adaptations(
                adapted_ui, device_profile.screen_size, device_profile.screen_density
            )
            
            # Apply performance adaptations
            if device_profile.is_low_power_mode or device_profile.connection_type == 'cellular':
                adapted_ui = await self._apply_performance_adaptations(adapted_ui)
            
            return {
                'status': 'success',
                'ui_config': adapted_ui,
                'device_capabilities': [cap.value for cap in device_profile.capabilities],
                'platform_features': await self._get_platform_features(device_profile.platform)
            }
            
        except Exception as e:
            logger.error(f"Failed to adapt UI for device {device_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def track_interaction(self, interaction: UserInteraction):
        """Track user interaction for analytics and optimization"""
        try:
            # Store interaction
            await self.supabase.table('pam_user_interactions').insert({
                'interaction_id': interaction.interaction_id,
                'user_id': interaction.user_id,
                'device_id': interaction.device_id,
                'interaction_type': interaction.interaction_type,
                'component_id': interaction.component_id,
                'context': interaction.context,
                'timestamp': interaction.timestamp.isoformat(),
                'duration_ms': interaction.duration_ms,
                'success': interaction.success,
                'error_message': interaction.error_message
            }).execute()
            
            # Update device performance metrics
            await self._update_device_metrics(interaction.device_id, interaction)
            
            # Trigger adaptive learning
            await self._trigger_adaptive_learning(interaction)
            
        except Exception as e:
            logger.error(f"Failed to track interaction {interaction.interaction_id}: {e}")
    
    async def get_platform_native_features(self, platform: PlatformType) -> List[Dict[str, Any]]:
        """Get platform-specific native features"""
        features = {
            PlatformType.IOS: [
                {'name': 'Siri Shortcuts', 'capability': 'voice_automation'},
                {'name': 'Apple Pay', 'capability': 'payments'},
                {'name': 'HealthKit', 'capability': 'health_data'},
                {'name': 'HomeKit', 'capability': 'smart_home'},
                {'name': 'CarPlay', 'capability': 'automotive'},
                {'name': 'Face ID / Touch ID', 'capability': 'biometric_auth'},
                {'name': 'Live Activities', 'capability': 'real_time_updates'},
                {'name': 'Widgets', 'capability': 'home_screen_widgets'}
            ],
            PlatformType.ANDROID: [
                {'name': 'Google Assistant', 'capability': 'voice_automation'},
                {'name': 'Google Pay', 'capability': 'payments'},
                {'name': 'Google Fit', 'capability': 'health_data'},
                {'name': 'Android Auto', 'capability': 'automotive'},
                {'name': 'Fingerprint / Face Unlock', 'capability': 'biometric_auth'},
                {'name': 'Adaptive Brightness', 'capability': 'adaptive_display'},
                {'name': 'App Shortcuts', 'capability': 'quick_actions'},
                {'name': 'Widgets', 'capability': 'home_screen_widgets'}
            ],
            PlatformType.WEB: [
                {'name': 'Web Push Notifications', 'capability': 'notifications'},
                {'name': 'Service Workers', 'capability': 'offline_support'},
                {'name': 'Web Share API', 'capability': 'native_sharing'},
                {'name': 'Payment Request API', 'capability': 'payments'},
                {'name': 'Geolocation API', 'capability': 'location'},
                {'name': 'WebRTC', 'capability': 'real_time_communication'}
            ]
        }
        
        return features.get(platform, [])
    
    async def _generate_platform_config(self, device_profile: DeviceProfile) -> Dict[str, Any]:
        """Generate platform-specific configuration"""
        config = {
            'theme': await self._get_platform_theme(device_profile.platform),
            'navigation': await self._get_platform_navigation(device_profile.platform),
            'gestures': await self._get_platform_gestures(device_profile.capabilities),
            'animations': await self._get_platform_animations(device_profile.platform),
            'performance': await self._get_performance_config(device_profile)
        }
        
        return config
    
    async def _web_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Web platform adapter"""
        return {
            'framework': 'react_pwa',
            'responsive_breakpoints': {
                'mobile': 768,
                'tablet': 1024,
                'desktop': 1200
            },
            'features': {
                'service_worker': True,
                'push_notifications': device_profile.notification_permission,
                'offline_support': True,
                'progressive_web_app': True
            },
            'ui_adaptations': {
                'navigation': 'bottom_tabs' if device_profile.screen_size['width'] < 768 else 'sidebar',
                'layout': 'mobile_first',
                'touch_targets': 44  # minimum touch target size
            }
        }
    
    async def _ios_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """iOS platform adapter"""
        return {
            'framework': 'react_native_ios',
            'ui_kit': 'cupertino',
            'features': {
                'siri_shortcuts': DeviceCapability.VOICE in device_profile.capabilities,
                'apple_pay': True,
                'face_id': DeviceCapability.FACE_ID in device_profile.capabilities,
                'haptic_feedback': DeviceCapability.HAPTICS in device_profile.capabilities,
                'live_activities': True
            },
            'ui_adaptations': {
                'navigation': 'tab_bar',
                'status_bar': 'light_content',
                'safe_area': True,
                'large_titles': True
            }
        }
    
    async def _android_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Android platform adapter"""
        return {
            'framework': 'react_native_android',
            'ui_kit': 'material_design',
            'features': {
                'google_assistant': DeviceCapability.VOICE in device_profile.capabilities,
                'google_pay': True,
                'fingerprint_auth': DeviceCapability.FINGERPRINT in device_profile.capabilities,
                'adaptive_icons': True,
                'app_shortcuts': True
            },
            'ui_adaptations': {
                'navigation': 'bottom_navigation',
                'status_bar': 'translucent',
                'material_theme': True,
                'floating_action_button': True
            }
        }
    
    async def _desktop_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Desktop platform adapter"""
        return {
            'framework': 'electron',
            'features': {
                'menu_bar': True,
                'keyboard_shortcuts': True,
                'multi_window': True,
                'system_tray': True,
                'auto_updater': True
            },
            'ui_adaptations': {
                'layout': 'sidebar_main',
                'window_controls': 'platform_native',
                'context_menus': True,
                'drag_drop': True
            }
        }
    
    async def _watch_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Watch platform adapter"""
        return {
            'framework': 'watchos',
            'features': {
                'complications': True,
                'force_touch': True,
                'taptic_engine': True,
                'always_on_display': True
            },
            'ui_adaptations': {
                'interface': 'circular',
                'navigation': 'crown_swipe',
                'content': 'glanceable',
                'interactions': 'minimal'
            }
        }
    
    async def _tablet_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Tablet platform adapter"""
        return {
            'framework': 'responsive_web',
            'features': {
                'split_view': True,
                'drag_drop': True,
                'multi_touch': True,
                'apple_pencil': DeviceCapability.TOUCH in device_profile.capabilities
            },
            'ui_adaptations': {
                'layout': 'master_detail',
                'navigation': 'sidebar',
                'content_density': 'comfortable',
                'modal_presentations': 'popover'
            }
        }
    
    async def _tv_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """TV platform adapter"""
        return {
            'framework': 'tvos',
            'features': {
                'remote_control': True,
                'voice_search': DeviceCapability.VOICE in device_profile.capabilities,
                'picture_in_picture': True,
                'screensaver': True
            },
            'ui_adaptations': {
                'interface': 'focus_based',
                'navigation': 'directional',
                'typography': 'large_scale',
                'safe_zones': True
            }
        }
    
    async def _automotive_adapter(self, device_profile: DeviceProfile, context: Dict[str, Any]) -> Dict[str, Any]:
        """Automotive platform adapter"""
        return {
            'framework': 'carplay_android_auto',
            'features': {
                'voice_control': True,
                'large_touch_targets': True,
                'driver_distraction': 'compliant',
                'navigation_integration': True
            },
            'ui_adaptations': {
                'interface': 'driver_focused',
                'contrast': 'high',
                'interactions': 'voice_first',
                'content': 'essential_only'
            }
        }
    
    async def _load_ui_components(self):
        """Load UI components from database"""
        try:
            result = await self.supabase.table('pam_ui_components').select('*').execute()
            
            for component_data in result.data:
                component = UIComponent(
                    component_id=component_data['component_id'],
                    component_type=component_data['component_type'],
                    platform_variants=component_data['platform_variants'],
                    accessibility_info=component_data['accessibility_info'],
                    responsive_breakpoints=component_data['responsive_breakpoints'],
                    animations=component_data['animations'],
                    gestures=component_data['gestures'],
                    voice_commands=component_data['voice_commands']
                )
                
                self.ui_components[component.component_id] = component
                
        except Exception as e:
            logger.error(f"Failed to load UI components: {e}")
    
    async def _apply_accessibility_adaptations(self, ui_config: Dict[str, Any], accessibility_features: List[str]) -> Dict[str, Any]:
        """Apply accessibility adaptations"""
        adaptations = ui_config.copy()
        
        for feature in accessibility_features:
            if feature == 'voice_over':
                adaptations['accessibility'] = {
                    'labels': True,
                    'hints': True,
                    'traits': True,
                    'focus_order': True
                }
            elif feature == 'large_text':
                adaptations['typography'] = {
                    'dynamic_type': True,
                    'scale_factor': 1.3,
                    'minimum_size': 14
                }
            elif feature == 'high_contrast':
                adaptations['colors'] = {
                    'contrast_ratio': 7.0,
                    'outline_buttons': True,
                    'focus_indicators': True
                }
            elif feature == 'reduced_motion':
                adaptations['animations'] = {
                    'duration': 0.1,
                    'spring_damping': 1.0,
                    'cross_fade_only': True
                }
        
        return adaptations
    
    async def _apply_responsive_adaptations(self, ui_config: Dict[str, Any], screen_size: Dict[str, int], screen_density: float) -> Dict[str, Any]:
        """Apply responsive design adaptations"""
        adaptations = ui_config.copy()
        
        width = screen_size['width']
        height = screen_size['height']
        
        # Determine layout category
        if width < 600:
            layout_category = 'compact'
        elif width < 900:
            layout_category = 'medium'
        else:
            layout_category = 'expanded'
        
        adaptations['responsive'] = {
            'layout_category': layout_category,
            'grid_columns': 1 if layout_category == 'compact' else (2 if layout_category == 'medium' else 3),
            'content_width': min(width - 32, 1200),
            'touch_target_size': max(44, 44 * screen_density),
            'font_scale': screen_density,
            'spacing_scale': screen_density
        }
        
        return adaptations
    
    async def _apply_performance_adaptations(self, ui_config: Dict[str, Any]) -> Dict[str, Any]:
        """Apply performance optimizations"""
        adaptations = ui_config.copy()
        
        adaptations['performance'] = {
            'animations': 'reduced',
            'image_quality': 'medium',
            'lazy_loading': True,
            'offline_first': True,
            'cache_strategy': 'aggressive',
            'bundle_splitting': True
        }
        
        return adaptations
    
    async def get_cross_platform_status(self) -> Dict[str, Any]:
        """Get cross-platform system status"""
        try:
            # Get device statistics
            device_stats = await self.supabase.table('pam_device_profiles').select(
                'platform, count(*)'
            ).execute()
            
            # Get interaction statistics
            interaction_stats = await self.supabase.table('pam_user_interactions').select(
                'interaction_type, success, count(*)'
            ).execute()
            
            return {
                'status': 'operational',
                'registered_devices': len(self.device_profiles),
                'supported_platforms': [platform.value for platform in PlatformType],
                'device_distribution': device_stats.data,
                'interaction_success_rate': self._calculate_success_rate(interaction_stats.data),
                'active_sessions': len(self.active_sessions),
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get cross-platform status: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _calculate_success_rate(self, interaction_data: List[Dict]) -> float:
        """Calculate interaction success rate"""
        if not interaction_data:
            return 0.0
            
        total = sum(item['count'] for item in interaction_data)
        successful = sum(item['count'] for item in interaction_data if item['success'])
        
        return (successful / total) * 100 if total > 0 else 0.0

# Global instance
pam_cross_platform_system = PAMCrossPlatformSystem()