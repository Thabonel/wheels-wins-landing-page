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

from app.core.infra_config import get_infra_settings

logger = logging.getLogger(__name__)


class ObservabilityConfig:
    """Centralized observability configuration using existing settings"""

    def __init__(self):
        self.settings = get_infra_settings()
        self.openai_client: Optional[OpenAI] = None
        self.langfuse_client: Optional[Langfuse] = None
        self.agentops_initialized = False
        self.tracer = None
        self._initialized = False

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

    def initialize_openai(self) -> Optional[OpenAI]:
        """Initialize OpenAI client with tracing"""
        if not self.settings.OPENAI_API_KEY:
            logger.info(
                "OpenAI API key not configured - set OPENAI_API_KEY to enable OpenAI observability"
            )
            return None

        try:
            self.openai_client = OpenAI(api_key=self.settings.OPENAI_API_KEY)

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

    def initialize_agentops(self) -> bool:
        """Initialize AgentOps for agent workflow tracking"""
        if not AGENTOPS_AVAILABLE:
            logger.info(
                "📦 AgentOps package not available - install agentops package to enable observability"
            )
            return False

        api_key = self.settings.AGENTOPS_API_KEY
        if not api_key:
            logger.info(
                "🔑 AgentOps API key not configured - set AGENTOPS_API_KEY to enable observability"
            )
            return False
        
        logger.info("✅ AgentOps API key found, checking compatibility...")

        try:
            import openai
            openai_version = openai.__version__
            logger.info(f"📋 OpenAI version detected: {openai_version}")
            
            # Check OpenAI version compatibility
            # AgentOps 0.3.x and below are incompatible with OpenAI 1.x
            # AgentOps 0.4.x+ should work with OpenAI 1.x
            import pkg_resources
            try:
                agentops_version = pkg_resources.get_distribution("agentops").version
                logger.info(f"📋 AgentOps version detected: {agentops_version}")
                
                # Parse versions
                openai_major = int(openai_version.split(".")[0])
                agentops_major = int(agentops_version.split(".")[0])
                agentops_minor = int(agentops_version.split(".")[1])
                
                # Check compatibility
                if openai_major >= 1 and agentops_major == 0 and agentops_minor < 4:
                    logger.warning(
                        f"⚠️ AgentOps {agentops_version} is incompatible with OpenAI {openai_version}"
                    )
                    logger.warning(
                        "   Please upgrade AgentOps to 0.4.15+ for OpenAI 1.x compatibility"
                    )
                    logger.warning(
                        "   Run: pip install 'agentops>=0.4.15,<0.5.0'"
                    )
                    self.agentops_initialized = False
                    return False
                    
            except Exception as version_error:
                logger.warning(f"Could not check AgentOps version: {version_error}")

            # Try to initialize with better error handling
            try:
                # Check if OpenAI client structure is compatible
                from openai import OpenAI as OpenAIClient
                test_client = OpenAIClient(api_key="test")
                
                # Initialize AgentOps with minimal configuration
                agentops.init(
                    api_key=self.settings.AGENTOPS_API_KEY,
                    auto_start_session=False,  # Don't auto-start session
                    inherited_session_id=None   # No inherited session
                )
                
                self.agentops_initialized = True
                logger.info("✅ AgentOps observability initialized successfully")
                return True
                
            except AttributeError as attr_error:
                if "ChatCompletion" in str(attr_error) or "Completion" in str(attr_error):
                    logger.warning(
                        "⚠️ AgentOps incompatible with current OpenAI client structure"
                    )
                    logger.warning(f"   Error: {attr_error}")
                    logger.warning(
                        "   AgentOps disabled to preserve OpenAI functionality"
                    )
                else:
                    logger.warning(f"AgentOps initialization error: {attr_error}")
                self.agentops_initialized = False
                return False
                
        except ImportError as e:
            logger.warning(
                f"⚠️ AgentOps initialization failed due to import error: {e}"
            )
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
                    self.settings.LANGFUSE_SECRET_KEY
                    and self.settings.LANGFUSE_PUBLIC_KEY
                ),
                "client_ready": self.langfuse_client is not None,
            },
            "agentops": {
                "configured": bool(self.settings.AGENTOPS_API_KEY),
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
