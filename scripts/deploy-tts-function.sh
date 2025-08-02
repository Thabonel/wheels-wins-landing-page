#!/bin/bash

# Deploy Nari Labs Dia TTS Edge Function
# This script deploys the function and configures environment variables

set -e

echo "🚀 Deploying Nari Labs Dia TTS Edge Function"
echo "=============================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if the function exists
if [ ! -f "supabase/functions/nari-dia-tts/index.ts" ]; then
    echo "❌ TTS function not found at supabase/functions/nari-dia-tts/index.ts"
    exit 1
fi

echo "📂 Found TTS function at supabase/functions/nari-dia-tts/index.ts"

# Check if user wants to set up environment variables
if [ -z "$NARI_LABS_DIA_API_KEY" ]; then
    echo ""
    echo "⚠️  NARI_LABS_DIA_API_KEY environment variable not set"
    echo ""
    echo "You'll need a Segmind API key to use this function."
    echo "Get one at: https://www.segmind.com/"
    echo ""
    read -p "Do you want to set the API key now? (y/n): " setup_key
    
    if [ "$setup_key" = "y" ] || [ "$setup_key" = "Y" ]; then
        echo ""
        read -p "Enter your Segmind API key (starts with SG_): " api_key
        
        if [[ ! $api_key =~ ^SG_ ]]; then
            echo "⚠️  Warning: API key should start with 'SG_'"
            read -p "Continue anyway? (y/n): " continue_anyway
            if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
                echo "❌ Deployment cancelled"
                exit 1
            fi
        fi
        
        export NARI_LABS_DIA_API_KEY="$api_key"
        echo "✅ API key set for this session"
    else
        echo "⚠️  You can set the API key later with:"
        echo "   supabase secrets set NARI_LABS_DIA_API_KEY=SG_your_key_here"
    fi
fi

# Deploy the function
echo ""
echo "📦 Deploying function..."
if supabase functions deploy nari-dia-tts; then
    echo "✅ Function deployed successfully"
else
    echo "❌ Function deployment failed"
    exit 1
fi

# Set environment variables if API key is available
if [ -n "$NARI_LABS_DIA_API_KEY" ]; then
    echo ""
    echo "🔧 Setting environment variables..."
    if supabase secrets set NARI_LABS_DIA_API_KEY="$NARI_LABS_DIA_API_KEY"; then
        echo "✅ Environment variables set successfully"
    else
        echo "❌ Failed to set environment variables"
        echo "   You can set them manually with:"
        echo "   supabase secrets set NARI_LABS_DIA_API_KEY=your_key_here"
    fi
fi

# Get function URL
echo ""
echo "🌐 Getting function URL..."
project_ref=$(supabase status --output json | jq -r '.API_URL' | sed 's/.*\/\/\([^.]*\).*/\1/')
if [ "$project_ref" != "null" ] && [ -n "$project_ref" ]; then
    function_url="https://${project_ref}.supabase.co/functions/v1/nari-dia-tts"
    echo "✅ Function URL: $function_url"
else
    echo "⚠️  Could not determine function URL automatically"
    echo "   It should be: https://your-project-ref.supabase.co/functions/v1/nari-dia-tts"
fi

echo ""
echo "🧪 Testing deployment..."

# Run a simple test if API key is available
if [ -n "$NARI_LABS_DIA_API_KEY" ]; then
    echo "Running basic functionality test..."
    
    # Create test request
    test_payload='{"text":"Hello, testing the TTS function!","voice_type":"monologue","format":"wav"}'
    
    if [ -n "$function_url" ]; then
        # Test against deployed function
        echo "Testing deployed function..."
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -X POST "$function_url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $(supabase auth get-token --output json | jq -r '.access_token')" \
            -d "$test_payload" || echo "HTTP_STATUS:000")
        
        http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
        response_body=$(echo "$response" | sed '$d')
        
        if [ "$http_status" = "200" ]; then
            echo "✅ Test successful! Function is working."
            # Check if response contains audio data
            if echo "$response_body" | jq -e '.audio' > /dev/null 2>&1; then
                audio_size=$(echo "$response_body" | jq '.audio | length')
                echo "📊 Generated audio with $audio_size bytes"
            fi
        else
            echo "⚠️  Test failed with status: $http_status"
            echo "Response: $response_body"
        fi
    else
        echo "⚠️  Cannot test - function URL not available"
    fi
else
    echo "⚠️  Cannot test - API key not set"
fi

echo ""
echo "📚 Documentation"
echo "================="
echo "• Function documentation: supabase/functions/nari-dia-tts/README.md"
echo "• Test script: supabase/functions/nari-dia-tts/test.ts"
echo ""
echo "🔧 Manual testing:"
echo "   cd supabase/functions/nari-dia-tts"
echo "   deno run --allow-net --allow-env test.ts"
echo ""
echo "🌐 API endpoint:"
echo "   POST $function_url"
echo ""
echo "📖 Full documentation available in:"
echo "   supabase/functions/nari-dia-tts/README.md"

echo ""
echo "✨ Deployment complete!"

# Save deployment info to a file
echo "# TTS Function Deployment Info" > .tts-deployment-info
echo "Deployed: $(date)" >> .tts-deployment-info
echo "Function URL: ${function_url:-'Not determined'}" >> .tts-deployment-info
echo "API Key Set: ${NARI_LABS_DIA_API_KEY:+'Yes'}" >> .tts-deployment-info
echo ""
echo "📝 Deployment info saved to .tts-deployment-info"