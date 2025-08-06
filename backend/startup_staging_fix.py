"""
Temporary startup fix for staging to prevent loading heavy models
This file helps us get one successful deploy to activate the Starter tier
"""
import os

# Check if we're in staging
if os.getenv("ENVIRONMENT") == "staging":
    print("🚧 STAGING: Disabling heavy AI models for initial deploy")
    
    # Disable chromadb default model loading
    os.environ["CHROMA_SERVER_NOFILE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    
    # Try to patch sentence_transformers before it loads
    import sys
    import types
    
    # Create a fake module to prevent real import
    fake_sentence_transformers = types.ModuleType('sentence_transformers')
    fake_sentence_transformers.SentenceTransformer = lambda x: None
    sys.modules['sentence_transformers'] = fake_sentence_transformers
    
    print("✅ Heavy models disabled for staging")