#!/bin/bash
"""
Install Unified Context Continuity MCP Server
Registers the combined token-aware + file-intelligence system
"""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/scripts/unified-context-server.py"

echo "🚀 Installing Unified Context Continuity MCP Server"
echo "📁 Project Root: $PROJECT_ROOT"
echo "🐍 Script Path: $SCRIPT_PATH"

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Error: unified-context-server.py not found at $SCRIPT_PATH"
    exit 1
fi

# Install MCP dependencies
echo "📦 Installing MCP server dependencies..."
pip3 install mcp anthropic-mcp aiofiles

# Register with Claude Code
echo "🔧 Registering MCP server with Claude Code..."
claude mcp add unified-context python3 "$SCRIPT_PATH"

# Verify installation
echo "✅ Verifying installation..."
claude mcp list

echo ""
echo "🎉 Unified Context Continuity MCP Server installed successfully!"
echo ""
echo "🛠️ Available Commands:"
echo "   • load_project_state - Smart context restoration"
echo "   • auto_save_context - Intelligent auto-save with triggers"
echo "   • monitor_context_usage - Real-time context monitoring"
echo "   • list_checkpoints - View available context snapshots"
echo "   • create_smart_checkpoint - Manual enhanced checkpoints"
echo ""
echo "💡 Usage Examples:"
echo "   load_project_state"
echo "   auto_save_context trigger_reason='feature_complete'"
echo "   monitor_context_usage conversation_length=15000"
echo ""
echo "🎯 This combines:"
echo "   ✅ Token-aware monitoring (auto-save at 80% token usage)"
echo "   ✅ File-change intelligence (significance scoring)"
echo "   ✅ Cross-conversation context restoration"
echo "   ✅ Smart checkpoint management"
echo ""
echo "The ultimate seamless development continuity system is now active! 🚀"