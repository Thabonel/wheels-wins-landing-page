#!/bin/bash

# Wheels and Wins - Local Development Setup Script
# Fixes localhost issues and installs platform-specific packages

echo "🔧 Setting up local development environment..."

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected macOS - installing darwin-specific packages"
    PLATFORM_PACKAGE="@rollup/rollup-darwin-x64"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux - installing linux-specific packages"  
    PLATFORM_PACKAGE="@rollup/rollup-linux-x64-gnu"
else
    echo "❓ Unknown platform: $OSTYPE"
    echo "⚠️  You may need to manually install the appropriate Rollup package"
    PLATFORM_PACKAGE=""
fi

# Install platform-specific Rollup package if needed
if [ ! -z "$PLATFORM_PACKAGE" ]; then
    echo "📦 Installing platform-specific package: $PLATFORM_PACKAGE"
    npm install "$PLATFORM_PACKAGE" --no-save --silent
    
    if [ $? -eq 0 ]; then
        echo "✅ Platform package installed successfully"
    else
        echo "❌ Failed to install platform package"
        echo "🔍 Try manually running: npm install $PLATFORM_PACKAGE --no-save"
    fi
fi

# Verify dev server configuration
echo "🌐 Verifying development server setup..."

# Check if vite.config.ts has correct port
if grep -q "port: 8080" vite.config.ts; then
    echo "✅ Vite configured for port 8080"
else
    echo "⚠️  Vite may not be configured for port 8080"
fi

# Check if Mapbox token is configured
if [ -f ".env" ] && grep -q "VITE_MAPBOX_TOKEN" .env; then
    echo "✅ Mapbox token configured"
else
    echo "⚠️  Mapbox token may not be configured"
    echo "📝 Make sure .env contains: VITE_MAPBOX_TOKEN=your_token_here"
fi

echo "🚀 Setup complete! Run 'npm run dev' to start the development server"
echo "📍 Server will be available at: http://localhost:8080"

# Optional: Kill any existing processes on port 8080
if lsof -i :8080 >/dev/null 2>&1; then
    echo "⚠️  Port 8080 is in use. Kill existing process? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        lsof -ti:8080 | xargs kill -9
        echo "🔥 Killed processes on port 8080"
    fi
fi