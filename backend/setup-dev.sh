#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "🛠️  PAM Backend Development Setup"
echo "📁 Working directory: $(pwd)"

# Check Python version
python_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1-2)
echo "🐍 Python version: $python_version"

# Check Python version (convert to comparable format)
python_major=$(echo "$python_version" | cut -d'.' -f1)
python_minor=$(echo "$python_version" | cut -d'.' -f2)

if [[ "$python_major" -lt 3 ]] || [[ "$python_major" -eq 3 && "$python_minor" -lt 8 ]]; then
    echo "❌ Python 3.8+ required, found $python_version"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [[ ! -d ".venv" ]]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
else
    echo "📦 Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Verify critical dependencies
echo "🔍 Verifying installation..."
python -c "
import sys
print(f'Python: {sys.version}')
try:
    import yaml
    import PIL
    import anthropic
    import fastapi
    import uvicorn
    import supabase
    print('✅ All critical dependencies installed successfully')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    sys.exit(1)
"

# Check environment file
if [[ ! -f ".env" ]]; then
    echo "⚠️  No .env file found"
    echo "💡 REQUIRED: Copy .env file with your configuration:"
    echo "   - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    echo "   - Get service role key from: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/settings/api"
    echo "   - Set ANTHROPIC_API_KEY for AI functionality"
else
    echo "✅ .env file found"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with real API keys"
echo "2. Run: ./run-dev.sh to start the backend"
echo "3. Visit: http://localhost:8001/docs for API documentation"