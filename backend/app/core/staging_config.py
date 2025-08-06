# Staging-specific configuration to reduce memory usage
import os

IS_STAGING = os.getenv("ENVIRONMENT") == "staging"

# Disable memory-intensive features in staging
if IS_STAGING:
    # Disable sentence transformers
    os.environ["DISABLE_SENTENCE_TRANSFORMERS"] = "true"
    
    # Use lighter AI models
    os.environ["USE_LIGHTWEIGHT_MODELS"] = "true"
    
    # Reduce worker threads
    os.environ["WEB_CONCURRENCY"] = "1"
    
    print("🚧 Running in STAGING mode with reduced memory footprint")