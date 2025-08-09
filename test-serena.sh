#!/bin/bash

echo "🔍 Testing Serena MCP Server for Wheels & Wins Project"
echo "========================================================"

echo ""
echo "📋 Project Configuration:"
echo "- Project Path: $(pwd)"
echo "- Serena Config: ~/.serena/serena_config.yml"
echo "- Claude Config: ~/.config/claude-desktop/claude_desktop_config.json"

echo ""
echo "🚀 Starting Serena MCP Server..."
echo "This will initialize language servers for TypeScript/React analysis"
echo ""

uvx --from git+https://github.com/oraios/serena serena-mcp-server \
  --project "$(pwd)" \
  --context desktop-app \
  --mode interactive,editing \
  --enable-web-dashboard true \
  --log-level INFO

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🌐 Web Dashboard: http://localhost:24282/dashboard/"
echo "📁 Project: wheels-wins-landing-page"
echo "🛠️  Available Tools: 30+ semantic code analysis tools"
echo ""
echo "You can now use Serena with Claude Code for faster PAM development!"