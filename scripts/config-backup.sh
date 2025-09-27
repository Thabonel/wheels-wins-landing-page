#!/bin/bash

# 📦 CONFIGURATION BACKUP & RESTORE SCRIPT
# Backs up all environment variables and configurations
# Usage: ./scripts/config-backup.sh [backup|restore]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="backups/config-$(date +%Y%m%d-%H%M%S)"
LATEST_BACKUP_FILE="backups/latest-config.json"

# Create backup function
create_backup() {
    echo -e "${BLUE}📦 Creating configuration backup...${NC}"

    mkdir -p "backups"
    mkdir -p "$BACKUP_DIR"

    # Backup current git state
    echo -e "${YELLOW}📝 Backing up git state...${NC}"
    git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
    git branch --show-current > "$BACKUP_DIR/git-branch.txt"
    git status --porcelain > "$BACKUP_DIR/git-status.txt"

    # Backup frontend environment
    echo -e "${YELLOW}📝 Backing up frontend environment...${NC}"
    if [ -f ".env" ]; then
        cp ".env" "$BACKUP_DIR/frontend.env"
    fi
    if [ -f ".env.local" ]; then
        cp ".env.local" "$BACKUP_DIR/frontend.env.local"
    fi

    # Backup backend environment
    echo -e "${YELLOW}📝 Backing up backend environment...${NC}"
    if [ -f "backend/.env" ]; then
        cp "backend/.env" "$BACKUP_DIR/backend.env"
    fi

    # Create environment variable documentation
    cat > "$BACKUP_DIR/environment-variables.md" << 'EOF'
# Environment Variables Backup

## Production Environment (Render)
```bash
# AI Provider Configuration (PRE-GEMINI STATE)
ANTHROPIC_API_KEY=sk-ant-...  # PRIMARY before Gemini
OPENAI_API_KEY=sk-...         # FALLBACK before Gemini

# Database & Infrastructure
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://...

# Feature Flags
OBSERVABILITY_ENABLED=true
PAM_ENABLED=true
```

## Frontend Environment (Netlify)
```bash
# API Configuration
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws

# Authentication
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# AI Provider (PRE-GEMINI)
VITE_ANTHROPIC_API_KEY=sk-ant-...  # PRIMARY before Gemini
```

## Rollback Instructions
1. Remove GEMINI_API_KEY from Render dashboard
2. Remove VITE_GEMINI_API_KEY from Netlify dashboard
3. Restart backend services
4. Verify Claude is primary provider
EOF

    # Create restore script
    cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
echo "🔄 Restoring configuration from backup..."

# Restore git state
if [ -f "git-commit.txt" ]; then
    COMMIT=$(cat git-commit.txt)
    echo "🔄 Reverting to commit: $COMMIT"
    git checkout $COMMIT
fi

# Restore environment files
if [ -f "frontend.env" ]; then
    cp frontend.env ../.env
    echo "✅ Restored frontend environment"
fi

if [ -f "backend.env" ]; then
    cp backend.env ../backend/.env
    echo "✅ Restored backend environment"
fi

echo "🎉 Configuration restored!"
echo "📋 Check environment-variables.md for manual steps"
EOF

    chmod +x "$BACKUP_DIR/restore.sh"

    # Create JSON backup for API access
    cat > "$BACKUP_DIR/backup-metadata.json" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "project_state": "pre-gemini-migration",
  "ai_provider_primary": "anthropic-claude",
  "ai_provider_fallback": "openai-gpt4",
  "estimated_monthly_cost": "$30000",
  "backup_purpose": "emergency-rollback-for-gemini-migration",
  "rollback_methods": [
    "git-revert",
    "environment-variables",
    "circuit-breaker"
  ]
}
EOF

    # Copy to latest backup
    cp -r "$BACKUP_DIR"/* "backups/"
    echo "$BACKUP_DIR" > "backups/latest-backup-path.txt"

    echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
    echo -e "${GREEN}✅ Latest backup: backups/${NC}"
}

# Restore function
restore_backup() {
    local backup_path=${1:-$(cat backups/latest-backup-path.txt 2>/dev/null || echo "backups")}

    echo -e "${BLUE}🔄 Restoring configuration from: $backup_path${NC}"

    if [ ! -d "$backup_path" ]; then
        echo -e "${RED}❌ Backup directory not found: $backup_path${NC}"
        exit 1
    fi

    # Run the restore script
    if [ -f "$backup_path/restore.sh" ]; then
        cd "$backup_path"
        ./restore.sh
        cd - > /dev/null
        echo -e "${GREEN}✅ Configuration restored${NC}"
    else
        echo -e "${RED}❌ Restore script not found${NC}"
        exit 1
    fi
}

# List backups function
list_backups() {
    echo -e "${BLUE}📋 Available backups:${NC}"
    find backups -name "backup-metadata.json" 2>/dev/null | while read file; do
        dir=$(dirname "$file")
        date=$(jq -r '.backup_date' "$file" 2>/dev/null || echo "unknown")
        state=$(jq -r '.project_state' "$file" 2>/dev/null || echo "unknown")
        echo "  📦 $dir - $date ($state)"
    done
}

# Test backup function
test_backup() {
    echo -e "${BLUE}🧪 Testing backup integrity...${NC}"

    if [ ! -f "backups/latest-backup-path.txt" ]; then
        echo -e "${RED}❌ No backup found${NC}"
        exit 1
    fi

    BACKUP_PATH=$(cat backups/latest-backup-path.txt)

    # Check required files
    local required_files=("backup-metadata.json" "restore.sh" "environment-variables.md")
    for file in "${required_files[@]}"; do
        if [ -f "$BACKUP_PATH/$file" ]; then
            echo -e "${GREEN}✅ $file exists${NC}"
        else
            echo -e "${RED}❌ $file missing${NC}"
        fi
    done

    # Validate JSON
    if command -v jq > /dev/null; then
        jq empty "$BACKUP_PATH/backup-metadata.json" 2>/dev/null && \
            echo -e "${GREEN}✅ JSON metadata valid${NC}" || \
            echo -e "${RED}❌ JSON metadata invalid${NC}"
    fi
}

# Main execution
case "${1:-backup}" in
    "backup"|"create")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "list")
        list_backups
        ;;
    "test")
        test_backup
        ;;
    *)
        echo "Usage: $0 [backup|restore|list|test]"
        echo ""
        echo "Commands:"
        echo "  backup  - Create new configuration backup"
        echo "  restore - Restore from backup"
        echo "  list    - List available backups"
        echo "  test    - Test backup integrity"
        ;;
esac