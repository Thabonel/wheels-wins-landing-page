#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     🤖 Claude Code Agents Initialization for Wheels & Wins     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Create agent directory if it doesn't exist
mkdir -p .claude/agents

# Define all agents (compatible with older bash)
agents=(
    "pam-specialist:PAM AI optimization and WebSocket management"
    "code-reviewer:Code review for bugs, security, and performance"
    "code-simplifier:Refactor complex code into simple solutions"
    "security-reviewer:Security vulnerability detection"
    "security-auditor:Security compliance and auditing"
    "tech-lead:Architecture and technical strategy"
    "ux-reviewer:UX/UI and accessibility review"
    "test-engineer:Comprehensive testing strategies"
    "test-developer:Test creation and coverage"
    "database-expert:Database optimization and design"
    "devops-engineer:CI/CD and infrastructure automation"
    "performance-optimizer:Performance and bundle optimization"
    "ui-ux-specialist:UI component development"
)

# Check agent status
echo -e "${YELLOW}Checking agent configurations...${NC}"
echo ""

total_agents=${#agents[@]}
configured_agents=0
missing_agents=()

for agent_entry in "${agents[@]}"; do
    IFS=':' read -r agent description <<< "$agent_entry"
    if [ -f ".claude/agents/${agent}.md" ]; then
        echo -e "  ${GREEN}✅${NC} ${agent}"
        echo -e "     └─ ${description}"
        ((configured_agents++))
    else
        echo -e "  ${RED}❌${NC} ${agent}"
        echo -e "     └─ ${description}"
        missing_agents+=("${agent}:${description}")
    fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Status: ${GREEN}${configured_agents}${NC}/${total_agents} agents configured"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# If agents are missing, offer to create them
if [ ${#missing_agents[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing agents detected. Would you like to create placeholder configurations? (y/n)${NC}"
    read -r create_missing
    
    if [[ $create_missing == "y" || $create_missing == "Y" ]]; then
        for agent_entry in "${missing_agents[@]}"; do
            IFS=':' read -r agent description <<< "$agent_entry"
            cat > ".claude/agents/${agent}.md" << EOF
---
name: ${agent}
model: sonnet
description: ${description}
---

# ${agent} Agent

This agent specializes in: ${description}

## Configuration pending
Please run the full agent setup to configure this agent properly.
EOF
            echo -e "  ${GREEN}✓${NC} Created placeholder for ${agent}"
        done
        echo ""
    fi
fi

# Display usage commands
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    📝 Agent Usage Commands                     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Individual Agent Tasks:${NC}"
echo -e "  ${GREEN}/task pam-specialist${NC} \"Optimize WebSocket reconnection logic\""
echo -e "  ${GREEN}/task code-reviewer${NC} \"Review src/components/pam/PamChatController.tsx\""
echo -e "  ${GREEN}/task security-reviewer${NC} \"Audit API endpoints for vulnerabilities\""
echo -e "  ${GREEN}/task test-engineer${NC} \"Create tests for PAM components\""
echo -e "  ${GREEN}/task database-expert${NC} \"Optimize slow queries\""
echo -e "  ${GREEN}/task tech-lead${NC} \"Design scaling strategy for 10x growth\""
echo ""

echo -e "${YELLOW}Parallel Execution (Multiple Agents):${NC}"
echo -e "  ${GREEN}/auto_run${NC} Perform comprehensive security and performance audit"
echo -e "  ${GREEN}/auto_run --verbose${NC} Full platform analysis with all agents"
echo ""

echo -e "${YELLOW}Common Workflows:${NC}"
echo -e "  ${BLUE}Security Review:${NC}"
echo -e "    /auto_run security-reviewer security-auditor \"Full security audit\""
echo ""
echo -e "  ${BLUE}Performance Optimization:${NC}"
echo -e "    /auto_run performance-optimizer database-expert \"Optimize for scale\""
echo ""
echo -e "  ${BLUE}Code Quality:${NC}"
echo -e "    /auto_run code-reviewer code-simplifier \"Improve code quality\""
echo ""
echo -e "  ${BLUE}Full Stack Review:${NC}"
echo -e "    /auto_run tech-lead security-reviewer ux-reviewer \"Complete review\""
echo ""

# Show project-specific priorities
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                 🎯 Wheels & Wins Priorities                    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${RED}High Priority:${NC}"
echo -e "  • PAM AI response quality and neutrality"
echo -e "  • WebSocket stability and reconnection"
echo -e "  • Test coverage (current: 40%, target: 80%)"
echo -e "  • API security and authentication"
echo ""

echo -e "${YELLOW}Medium Priority:${NC}"
echo -e "  • Bundle size optimization (<2MB)"
echo -e "  • Database query performance"
echo -e "  • Mobile responsiveness"
echo -e "  • Accessibility compliance (WCAG 2.1)"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Fix PAM duplicate message issue"
echo -e "  2. Increase test coverage for critical paths"
echo -e "  3. Optimize bundle size and loading performance"
echo -e "  4. Security audit of all API endpoints"
echo ""

# Check for settings.json
if [ -f ".claude/settings.json" ]; then
    echo -e "${GREEN}✅ Claude settings configured${NC}"
else
    echo -e "${YELLOW}⚠️  Missing .claude/settings.json - agents may not work properly${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}        Agent system ready! Happy coding! 🚀${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"