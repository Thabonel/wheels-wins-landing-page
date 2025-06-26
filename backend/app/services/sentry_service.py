
"""
Sentry Error Tracking Service
Centralized error tracking and performance monitoring with Sentry.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()

class SentryService:
    """Sentry error tracking and performance monitoring service"""
    
    def __init__(self):
        self.initialized = False
    
    def initialize(self):
        """Initialize Sentry SDK with comprehensive integrations"""
        if self.initialized or not settings.SENTRY_DSN:
            return
        
        try:
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.ENVIRONMENT,
                release=f"pam-backend@{settings.VERSION}",
                
                # Performance monitoring
                traces_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.1,
                profiles_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.1,
                
                # Integrations
                integrations=[
                    FastApiIntegration(auto_enable=True),
                    SqlAlchemyIntegration(),
                    RedisIntegration(),
                    AsyncioIntegration(),
                ],
                
                # Error filtering
                before_send=self._before_send_filter,
                
                # Performance filtering
                before_send_transaction=self._before_send_transaction_filter,
                
                # Additional configuration
                attach_stacktrace=True,
                send_default_pii=False,  # Don't send personally identifiable information
                max_breadcrumbs=50,
            )
            
            self.initialized = True
            logger.info("Sentry initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Sentry: {e}")
    
    def _before_send_filter(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter events before sending to Sentry"""
        # Don't send health check errors
        if event.get('request', {}).get('url', '').endswith('/health'):
            return None
        
        # Don't send certain exceptions in development
        if settings.ENVIRONMENT == "development":
            exception_type = hint.get('exc_info', [None, None, None])[0]
            if exception_type and exception_type.__name__ in ['ConnectionError', 'TimeoutError']:
                return None
        
        return event
    
    def _before_send_transaction_filter(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter performance transactions before sending to Sentry"""
        # Don't track health check transactions
        transaction_name = event.get('transaction', '')
        if 'health' in transaction_name.lower():
            return None
        
        return event
    
    def capture_exception(self, exception: Exception, extra_data: Dict[str, Any] = None):
        """Capture exception with additional context"""
        if not self.initialized:
            return
        
        with sentry_sdk.push_scope() as scope:
            if extra_data:
                for key, value in extra_data.items():
                    scope.set_extra(key, value)
            
            sentry_sdk.capture_exception(exception)
    
    def capture_message(self, message: str, level: str = "info", extra_data: Dict[str, Any] = None):
        """Capture custom message"""
        if not self.initialized:
            return
        
        with sentry_sdk.push_scope() as scope:
            if extra_data:
                for key, value in extra_data.items():
                    scope.set_extra(key, value)
            
            sentry_sdk.capture_message(message, level=level)
    
    def set_user_context(self, user_id: str, email: str = None, username: str = None):
        """Set user context for error tracking"""
        if not self.initialized:
            return
        
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "username": username
        })
    
    def set_tag(self, key: str, value: str):
        """Set custom tag"""
        if not self.initialized:
            return
        
        sentry_sdk.set_tag(key, value)
    
    def start_transaction(self, name: str, op: str = "http.server"):
        """Start performance transaction"""
        if not self.initialized:
            return None
        
        return sentry_sdk.start_transaction(name=name, op=op)

# Global Sentry instance
sentry_service = SentryService()

def get_sentry_service() -> SentryService:
    """Get Sentry service instance"""
    return sentry_service
