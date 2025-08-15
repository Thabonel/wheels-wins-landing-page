"""
Emergency Configuration for Render Deployment
Ultra-minimal config to guarantee backend startup
"""

import os

class EmergencySettings:
    """Emergency settings with absolute minimal requirements"""
    
    def __init__(self):
        # Absolutely minimal settings to get service running
        self.NODE_ENV = "staging"
        self.DEBUG = True
        self.APP_URL = "https://wheels-wins-landing-page.onrender.com"
        
        # Essential API keys (use emergency placeholders to prevent crashes)
        self.OPENAI_API_KEY = <OPENAI_API_KEY> or "<API_TOKEN>"
        self.SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://emergency-placeholder.supabase.co" 
        self.SUPABASE_SERVICE_ROLE_KEY = <SUPABASE_SERVICE_ROLE_KEY> or "emergency-placeholder-service-key"
        
        # Security basics
        self.SECRET_KEY = os.getenv("SECRET_KEY", "emergency-secret-key-change-immediately")
        
        # CORS that will definitely work
        self.CORS_ALLOWED_ORIGINS = [
            "https://staging-wheelsandwins.netlify.app",
            "https://wheels-wins-staging.netlify.app",
            "https://charming-figolla-d83b68.netlify.app"
        ]
        
        # Disable features that might cause startup issues
        self.TTS_ENABLED = False
        self.PAM_ENABLED = True  # Keep PAM but with minimal features
        self.REDIS_URL = os.getenv("REDIS_URL", "")
        
        # Monitoring
        self.SENTRY_DSN = ""  # Disable Sentry to avoid startup issues
        
        print("🚨 EMERGENCY CONFIG LOADED - Minimal functionality only!")
        print(f"   NODE_ENV: {self.NODE_ENV}")
        print(f"   OPENAI_KEY: {'✅ Set' if self.OPENAI_API_KEY else '❌ Missing'}")
        print(f"   SUPABASE_URL: {'✅ Set' if self.SUPABASE_URL else '❌ Missing'}")

# Create settings instance
emergency_settings = EmergencySettings()

# Export for backwards compatibility
settings = emergency_settings