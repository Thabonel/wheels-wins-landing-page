"""
Observability Configuration for Wheels and Wins
Integrates with existing settings and secrets management
"""

import logging
from typing import Optional
from openai import OpenAI

# Optional imports - make agentops optional for deployment
try:
    import agentops

    AGENTOPS_AVAILABLE = True
except ImportError:
    AGENTOPS_AVAILABLE = False
    agentops = None

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

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ObservabilityConfig:
    """Centralized observability configuration using existing settings"""

    def __init__(self):
        self.settings = get_settings()
        self.openai_client: Optional[OpenAI] = None
        self.langfuse_client: Optional[Langfuse] = None
        self.agentops_initialized = False
        self.tracer = None
        self._initialized = False

    def is_enabled(self) -> bool:
        """Check if observability is enabled"""
        return getattr(self.settings, 'OBSERVABILITY_ENABLED', False)

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

    def initialize_openai(self) -> Optional[OpenAI]:
        """Initialize OpenAI client with tracing"""
        if not self.settings.OPENAI_API_KEY:
            logger.info(
                "OpenAI API key not configured - set OPENAI_API_KEY to enable OpenAI observability"
            )
            return None

        try:
            self.openai_client = OpenAI(api_key=self.settings.OPENAI_API_KEY.get_secret_value())

            # Ensure tracing is configured
            self.initialize_tracing()

            logger.info("✅ OpenAI observability initialized")
            return self.openai_client

        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI observability: {e}")
            return None

    def initialize_langfuse(self) -> Optional["Langfuse"]:
        """Initialize Langfuse for LLM observability"""
        if not LANGFUSE_AVAILABLE:
            logger.info(
                "Langfuse not available - install langfuse package to enable Langfuse observability"
            )
            return None

        if not (
            getattr(self.settings, 'LANGFUSE_SECRET_KEY', None) and getattr(self.settings, 'LANGFUSE_PUBLIC_KEY', None)
        ):
            logger.info(
                "Langfuse credentials not configured - set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY to enable Langfuse observability"
            )
            return None

        try:
            self.langfuse_client = Langfuse(
                secret_key=getattr(self.settings, 'LANGFUSE_SECRET_KEY', None),
                public_key=getattr(self.settings, 'LANGFUSE_PUBLIC_KEY', None),
                host=getattr(self.settings, 'LANGFUSE_HOST', 'https://cloud.langfuse.com'),
            )

            logger.info("✅ Langfuse observability initialized")
            return self.langfuse_client

        except Exception as e:
            logger.warning(f"Failed to initialize Langfuse observability: {e}")
            return None

    def initialize_agentops(self) -> bool:
        """Initialize AgentOps for agent workflow tracking"""
        if not AGENTOPS_AVAILABLE:
            logger.info(
                "AgentOps not available - install agentops package to enable AgentOps observability"
            )
            return False

        if not getattr(self.settings, 'AGENTOPS_API_KEY', None):
            logger.info(
                "AgentOps API key not configured - set AGENTOPS_API_KEY to enable AgentOps observability"
            )
            return False

        logger.info(
            "🔍 Attempting AgentOps initialization with OpenAI compatibility check..."
        )

        try:
            import openai

            logger.info(f"📋 OpenAI version detected: {openai.__version__}")

            try:
                import openai.resources.beta.chat

                logger.info("✅ OpenAI module structure compatible with AgentOps")
            except ImportError:
                logger.warning(
                    "⚠️ OpenAI module structure incompatible with current AgentOps version"
                )
                logger.warning(
                    "   AgentOps will be disabled to preserve core OpenAI functionality"
                )
                self.agentops_initialized = False
                return False

            # AgentOps API updated - remove environment parameter
            agentops.init(api_key=getattr(self.settings, 'AGENTOPS_API_KEY', None))

            self.agentops_initialized = True
            logger.info("✅ AgentOps observability initialized successfully")
            return True

        except ImportError as e:
            if "openai.resources.beta.chat" in str(e):
                logger.warning(
                    "⚠️ AgentOps-OpenAI compatibility issue detected during initialization."
                )
                logger.warning(
                    "   Disabling AgentOps to preserve core OpenAI functionality for PAM."
                )
                logger.warning(f"   Error details: {e}")
                self.agentops_initialized = False
                return False
            else:
                logger.warning(f"Failed to initialize AgentOps observability: {e}")
                self.agentops_initialized = False
                return False
        except Exception as e:
            logger.warning(f"Failed to initialize AgentOps observability: {e}")
            self.agentops_initialized = False
            return False

    def initialize_all(self):
        """Initialize all available observability platforms"""
        if not self.is_enabled():
            logger.info("Observability disabled via configuration")
            return

        if self._initialized:
            return

        logger.info("🚀 Initializing AI agent observability stack...")
        self.initialize_tracing()
        self.initialize_openai()
        self.initialize_langfuse()
        self.initialize_agentops()

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
            "openai": {
                "configured": bool(self.settings.OPENAI_API_KEY),
                "client_ready": self.openai_client is not None,
            },
            "langfuse": {
                "configured": bool(
                    getattr(self.settings, 'LANGFUSE_SECRET_KEY', None)
                    and getattr(self.settings, 'LANGFUSE_PUBLIC_KEY', None)
                ),
                "client_ready": self.langfuse_client is not None,
            },
            "agentops": {
                "configured": bool(getattr(self.settings, 'AGENTOPS_API_KEY', None)),
                "initialized": self.agentops_initialized,
            },
        }

    def shutdown(self):
        """Clean shutdown of all observability platforms"""
        try:
            if self.langfuse_client:
                self.langfuse_client.flush()
                logger.info("✅ Langfuse client flushed")

            if self.agentops_initialized and AGENTOPS_AVAILABLE:
                try:
                    agentops.end_session("Success")
                    logger.info("✅ AgentOps session ended")
                except Exception as agentops_error:
                    logger.warning(
                        f"⚠️ AgentOps shutdown error (non-critical): {agentops_error}"
                    )

            logger.info("🔄 Observability platforms shut down cleanly")

        except Exception as e:
            logger.error(f"❌ Error during observability shutdown: {e}")


# Global observability instance
observability = ObservabilityConfig()
