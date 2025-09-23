#!/bin/bash
# PAM 2.0 Render Build Script
# ===========================

set -e

echo "🚀 Starting PAM 2.0 build for Render deployment..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Install voice service dependencies (optional, may fail in some environments)
echo "🎙️ Installing voice service dependencies..."
pip install edge-tts pyaudio librosa || echo "⚠️ Some voice dependencies failed to install (this is okay for basic deployment)"

# Create necessary directories
echo "📁 Creating application directories..."
mkdir -p logs
mkdir -p cache

# Set up environment
echo "⚙️ Setting up environment..."
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Validate configuration
echo "✅ Validating PAM 2.0 configuration..."
python -c "
import sys
sys.path.insert(0, '.')
try:
    from pam_2.core.config import get_settings
    settings = get_settings()
    print(f'✅ PAM 2.0 configuration valid')
    print(f'   Environment: {settings.environment}')
    print(f'   Version: {settings.app_version}')
    print(f'   Debug: {settings.debug}')
except Exception as e:
    print(f'❌ Configuration validation failed: {e}')
    sys.exit(1)
"

# Test basic imports
echo "🧪 Testing PAM 2.0 imports..."
python -c "
import sys
sys.path.insert(0, '.')
try:
    from pam_2.api.main import app
    from pam_2.services.conversational_engine import ConversationalEngine
    from pam_2.services.voice_service import VoiceService
    from pam_2.integrations.mcp_client import MCPClient
    print('✅ All PAM 2.0 modules imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"

echo "🎉 PAM 2.0 build completed successfully!"
echo "🌐 Ready for deployment on Render"