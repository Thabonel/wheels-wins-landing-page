"""
Observability Configuration for AI Agents
Integrates OpenAI Tracing, Langfuse, and AgentOps
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI
from langfuse import Langfuse
import agentops
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Load environment variables
load_dotenv()

class ObservabilityConfig:
    """Centralized configuration for all observability platforms"""
    
    def __init__(self):
        self.openai_client: Optional[OpenAI] = None
        self.langfuse_client: Optional[Langfuse] = None
        self.agentops_initialized = False
        self.tracer = None
        self._setup_logging()
        
    def _setup_logging(self):
        """Configure logging for the application"""
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def initialize_openai(self) -> OpenAI:
        """Initialize OpenAI client with tracing"""
        try:
            self.openai_client = OpenAI(
                api_key=os.getenv('OPENAI_API_KEY')
            )
            
            # Set up OpenTelemetry tracing
            trace.set_tracer_provider(TracerProvider())
            self.tracer = trace.get_tracer(__name__)
            
            # Configure OTLP exporter if needed
            if os.getenv('OTLP_ENDPOINT'):
                otlp_exporter = OTLPSpanExporter(
                    endpoint=os.getenv('OTLP_ENDPOINT'),
                    headers={'api-key': os.getenv('OTLP_API_KEY', '')}
                )
                span_processor = BatchSpanProcessor(otlp_exporter)
                trace.get_tracer_provider().add_span_processor(span_processor)
            
            self.logger.info("✅ OpenAI client initialized with tracing")
            return self.openai_client
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize OpenAI: {e}")
            raise
            
    def initialize_langfuse(self) -> Langfuse:
        """Initialize Langfuse for LLM observability"""
        try:
            self.langfuse_client = Langfuse(
                secret_key=os.getenv('LANGFUSE_SECRET_KEY'),
                public_key=os.getenv('LANGFUSE_PUBLIC_KEY'),
                host=os.getenv('LANGFUSE_HOST', 'https://cloud.langfuse.com')
            )
            
            # Test the connection
            self.langfuse_client.get_dataset_items('test')  # This will fail gracefully if dataset doesn't exist
            
            self.logger.info("✅ Langfuse client initialized")
            return self.langfuse_client
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Langfuse: {e}")
            raise
            
    def initialize_agentops(self) -> bool:
        """Initialize AgentOps for agent workflow tracking"""
        try:
            agentops.init(
                api_key=os.getenv('AGENTOPS_API_KEY'),
                environment=os.getenv('ENVIRONMENT', 'development')
            )
            
            self.agentops_initialized = True
            self.logger.info("✅ AgentOps initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize AgentOps: {e}")
            raise
            
    def initialize_all(self):
        """Initialize all observability platforms"""
        self.logger.info("🚀 Initializing observability stack...")
        
        self.initialize_openai()
        self.initialize_langfuse()
        self.initialize_agentops()
        
        self.logger.info("✅ All observability platforms initialized")
        
    def get_tracer(self):
        """Get OpenTelemetry tracer"""
        if not self.tracer:
            self.tracer = trace.get_tracer(__name__)
        return self.tracer
        
    def shutdown(self):
        """Clean shutdown of all observability platforms"""
        try:
            if self.langfuse_client:
                self.langfuse_client.flush()
                
            if self.agentops_initialized:
                agentops.end_session('Success')
                
            self.logger.info("🔄 Observability platforms shut down cleanly")
            
        except Exception as e:
            self.logger.error(f"❌ Error during shutdown: {e}")

# Global observability instance
observability = ObservabilityConfig()