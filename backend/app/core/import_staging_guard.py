"""
Staging import guard to prevent heavy model imports
"""
import os
import sys
import logging

logger = logging.getLogger(__name__)

# Check if we're in staging BEFORE any imports
IS_STAGING = os.getenv("ENVIRONMENT") == "staging"

if IS_STAGING:
    logger.info("🚧 STAGING MODE DETECTED - Disabling heavy imports")
    
    # Mock heavy imports to prevent memory usage
    class MockSentenceTransformer:
        def __init__(self, *args, **kwargs):
            logger.warning("SentenceTransformer disabled in staging")
            
    class MockChromaDB:
        def __init__(self, *args, **kwargs):
            logger.warning("ChromaDB disabled in staging")
    
    # Create mock modules
    sys.modules['sentence_transformers'] = type(sys)('sentence_transformers')
    sys.modules['sentence_transformers'].SentenceTransformer = MockSentenceTransformer
    
    sys.modules['chromadb'] = type(sys)('chromadb')
    sys.modules['chromadb'].Client = MockChromaDB
    
    # Set lightweight mode flags
    os.environ["DISABLE_HEAVY_MODELS"] = "true"
    os.environ["USE_MINIMAL_MEMORY"] = "true"
    
    logger.info("✅ Heavy imports successfully mocked for staging")