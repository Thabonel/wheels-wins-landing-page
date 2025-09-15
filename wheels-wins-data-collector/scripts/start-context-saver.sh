#!/bin/bash
"""
Start Intelligent Context Saver Service
Runs the context saver in the background with proper logging
"""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$PROJECT_ROOT/scripts"
LOG_DIR="$PROJECT_ROOT/logs"

# Ensure directories exist
mkdir -p "$LOG_DIR"

echo "🧠 Starting Intelligent Context Saver for Wheels & Wins Data Collector"
echo "📁 Project Root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# Install required dependencies if not present
if ! python3 -c "import watchdog" 2>/dev/null; then
    echo "📦 Installing watchdog dependency..."
    pip3 install watchdog
fi

# Check if already running
if pgrep -f "intelligent-context-saver.py" > /dev/null; then
    echo "⚠️  Context saver is already running!"
    echo "   Use 'pkill -f intelligent-context-saver.py' to stop it first"
    exit 1
fi

# Start the service
echo "🚀 Starting intelligent context monitoring..."
echo "📄 Logs: $LOG_DIR/context_saver.log"

# Run in background
nohup python3 "$SCRIPT_DIR/intelligent-context-saver.py" > "$LOG_DIR/context_saver_output.log" 2>&1 &

PID=$!
echo "✅ Context saver started with PID: $PID"

# Save PID for stopping later
echo $PID > "$LOG_DIR/context_saver.pid"

echo ""
echo "📋 Context Saver Status:"
echo "   • Monitoring project for significant changes"
echo "   • Auto-saves when fixes, features, or critical changes detected"
echo "   • Minimum 5-minute intervals between saves"
echo "   • Intelligence threshold: 70% significance required"
echo ""
echo "🔧 Management Commands:"
echo "   • Stop:   pkill -f intelligent-context-saver.py"
echo "   • Status: ps aux | grep intelligent-context-saver"
echo "   • Logs:   tail -f $LOG_DIR/context_saver.log"