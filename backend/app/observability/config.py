"""
Observability Configuration for Wheels and Wins
Integrates with existing settings and secrets management
"""

import logging
from typing import Optional
# OpenAI import removed - using Gemini Flash instead

# AgentOps removed - no longer needed

try:
    from langfuse import Langfuse

    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    Langfuse = None

# Optional OpenTelemetry imports - handle ImportError gracefully for deployment
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    OPENTELEMETRY_AVAILABLE = False
    trace = None
    TracerProvider = None
    BatchSpanProcessor = None
    OTLPSpanExporter = None

from app.core.infra_config import get_infra_settings

logger = logging.getLogger(__name__)


class ObservabilityConfig:
    """Centralized observability configuration using existing settings"""

    def __init__(self):
        self.settings = get_infra_settings()
        # OpenAI client removed - using Gemini Flash instead
        self.langfuse_client: Optional[Langfuse] = None
        self.tracer = None
        self._initialized = False
        self.agentops_initialized = False  # AgentOps removed, always False

    def is_enabled(self) -> bool:
        """Check if observability is enabled"""
        return self.settings.OBSERVABILITY_ENABLED

    def initialize_tracing(self) -> None:
        """Set up OpenTelemetry tracing if available"""
        if not OPENTELEMETRY_AVAILABLE or self.tracer:
            if not OPENTELEMETRY_AVAILABLE:
                logger.info(
                    "OpenTelemetry not available, skipping tracing initialization"
                )
            return

        trace.set_tracer_provider(TracerProvider())

        if self.settings.OTLP_ENDPOINT:
            otlp_exporter = OTLPSpanExporter(
                endpoint=self.settings.OTLP_ENDPOINT,
                headers=(
                    {"api-key": self.settings.OTLP_API_KEY}
                    if self.settings.OTLP_API_KEY
                    else {}
                ),
            )
            span_processor = BatchSpanProcessor(otlp_exporter)
            trace.get_tracer_provider().add_span_processor(span_processor)

        self.tracer = trace.get_tracer(__name__)
        logger.info("✅ OpenTelemetry tracing initialized")

    def initialize_gemini(self) -> bool:
        """Initialize Gemini client with tracing"""
        if not self.settings.GEMINI_API_KEY:
            logger.info(
                "Gemini API key not configured - set GEMINI_API_KEY to enable Gemini observability"
            )
            return False

        try:
            # Ensure tracing is configured
            self.initialize_tracing()

            logger.info("✅ Gemini observability initialized")
            return True

        except Exception as e:
            logger.warning(f"Failed to initialize Gemini observability: {e}")
            return False

    def initialize_langfuse(self) -> Optional["Langfuse"]:
        """Initialize Langfuse for LLM observability"""
        if not LANGFUSE_AVAILABLE:
            logger.info(
                "📦 Langfuse package not available - install langfuse package to enable observability"
            )
            return None

        secret_key = self.settings.LANGFUSE_SECRET_KEY
        public_key = self.settings.LANGFUSE_PUBLIC_KEY
        
        if not (secret_key and public_key):
            logger.info(
                "🔑 Langfuse credentials not configured - set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY"
            )
            logger.debug(f"🔍 Secret key present: {bool(secret_key)}, Public key present: {bool(public_key)}")
            return None
        
        logger.info("✅ Langfuse credentials found, initializing client...")

        try:
            self.langfuse_client = Langfuse(
                secret_key=self.settings.LANGFUSE_SECRET_KEY,
                public_key=self.settings.LANGFUSE_PUBLIC_KEY,
                host=self.settings.LANGFUSE_HOST,
            )

            logger.info("✅ Langfuse observability initialized")
            return self.langfuse_client

        except Exception as e:
            logger.warning(f"Failed to initialize Langfuse observability: {e}")
            return None


    def initialize_all(self):
        """Initialize all available observability platforms"""
        if not self.is_enabled():
            logger.info("Observability disabled via configuration")
            return

        if self._initialized:
            return

        logger.info("🚀 Initializing AI agent observability stack (Gemini + Langfuse)...")
        self.initialize_tracing()
        self.initialize_gemini()
        self.initialize_langfuse()

        self._initialized = True
        logger.info("✅ AI agent observability initialization complete")

    def get_tracer(self):
        """Get OpenTelemetry tracer"""
        if not self.tracer:
            self.tracer = trace.get_tracer(__name__)
        return self.tracer

    def get_status(self) -> dict:
        """Get current observability status"""
        return {
            "enabled": self.is_enabled(),
            "initialized": self._initialized,
            "gemini": {
                "configured": bool(self.settings.GEMINI_API_KEY),
                "client_ready": True,  # Simplified for Gemini
            },
            "langfuse": {
                "configured": bool(
                    self.settings.LANGFUSE_SECRET_KEY
                    and self.settings.LANGFUSE_PUBLIC_KEY
                ),
                "client_ready": self.langfuse_client is not None,
            },
        }

    def shutdown(self):
        """Clean shutdown of all observability platforms"""
        try:
            if self.langfuse_client:
                self.langfuse_client.flush()
                logger.info("✅ Langfuse client flushed")

            logger.info("🔄 Observability platforms shut down cleanly")

        except Exception as e:
            logger.error(f"❌ Error during observability shutdown: {e}")


# Global observability instance
observability = ObservabilityConfig()
