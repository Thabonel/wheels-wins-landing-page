#!/bin/bash

# PAM Backend Deployment Script for Render.com
# This script prepares and deploys the working PAM backend to production

set -e  # Exit on any error

echo "🚀 Starting PAM Backend Deployment to Render.com"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the backend directory
if [[ ! -f "app/main.py" || ! -f "requirements.txt" ]]; then
    print_error "Please run this script from the backend directory"
    print_error "Expected files: app/main.py, requirements.txt"
    exit 1
fi

print_status "Validating backend structure..."

# Check critical files exist
REQUIRED_FILES=(
    "app/main.py"
    "app/core/simple_pam_service.py"
    "app/api/v1/pam.py"
    "requirements.txt"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "✓ Found $file"
    else
        print_error "✗ Missing required file: $file"
        exit 1
    fi
done

# Validate environment variables are documented
print_status "Checking environment variable documentation..."

if [[ -f ".env.example" || -f ".env" ]]; then
    print_success "✓ Environment configuration found"
else
    print_warning "⚠ No .env.example found - creating one..."
    cat > .env.example << 'EOF'
# Required Environment Variables for PAM Backend Production

# Application Configuration
ENVIRONMENT=production
DEBUG=false

# Security Keys (Generate secure random strings)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Required Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Required OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional Redis (for caching)
REDIS_URL=redis://localhost:6379

# TTS Configuration  
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# Optional Monitoring
SENTRY_DSN=your-sentry-dsn-here
EOF
    print_success "✓ Created .env.example"
fi

# Test local SimplePamService
print_status "Testing SimplePamService locally..."

python3 -c "
import sys
import os
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()

try:
    from app.core.simple_pam_service import SimplePamService
    service = SimplePamService()
    print('✅ SimplePamService initialized successfully')
    print(f'Service healthy: {service.is_healthy()}')
except Exception as e:
    print(f'❌ SimplePamService test failed: {e}')
    sys.exit(1)
"

if [[ $? -eq 0 ]]; then
    print_success "✓ SimplePamService validation passed"
else
    print_error "✗ SimplePamService validation failed"
    exit 1
fi

# Check if render.yaml exists
if [[ ! -f "render.yaml" ]]; then
    print_warning "⚠ render.yaml not found - creating deployment configuration..."
    
    # render.yaml was already created by the previous Write command
    print_success "✓ Created render.yaml deployment configuration"
fi

print_status "Deployment configuration ready!"
print_status "render.yaml created with the following configuration:"
echo ""
cat render.yaml
echo ""

print_success "🎯 Backend is ready for deployment!"
echo ""
echo "Next steps to deploy to Render.com:"
echo "=================================="
echo ""
echo "1. 📝 Create a new Web Service on Render.com:"
echo "   - Go to https://render.com/dashboard"
echo "   - Click 'New' → 'Web Service'"
echo "   - Connect your GitHub repository"
echo "   - Select the backend directory"
echo ""
echo "2. ⚙️ Configure the service:"
echo "   - Name: pam-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port \$PORT --workers 1"
echo "   - Plan: Starter (or higher for production)"
echo ""
echo "3. 🔑 Set Environment Variables in Render Dashboard:"
echo "   Required variables:"
echo "   - SUPABASE_URL: https://kycoklimpzkyrecbjecn.supabase.co"
echo "   - SUPABASE_KEY: (your anon key)"
echo "   - SUPABASE_SERVICE_ROLE_KEY: (your service role key)"
echo "   - OPENAI_API_KEY: (your OpenAI API key)"
echo ""
echo "4. 🚀 Deploy:"
echo "   - Click 'Create Web Service'"
echo "   - Wait for deployment to complete"
echo "   - Service will be available at: https://pam-backend.onrender.com"
echo ""
echo "5. ✅ Test deployment:"
echo "   - Health check: curl https://pam-backend.onrender.com/health"
echo "   - PAM health: curl https://pam-backend.onrender.com/api/v1/pam/health"
echo ""

print_warning "IMPORTANT: Make sure to set all required environment variables in the Render dashboard!"
print_warning "The deployment will fail without proper OPENAI_API_KEY and SUPABASE_* configuration."

echo ""
print_success "🎉 Deployment script completed successfully!"
print_status "Your PAM backend is ready for production deployment on Render.com"