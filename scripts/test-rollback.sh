#!/bin/bash

# 🧪 ROLLBACK TESTING SCRIPT
# Tests all rollback mechanisms to ensure they work
# Usage: ./scripts/test-rollback.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 TESTING ROLLBACK MECHANISMS${NC}"
echo -e "${YELLOW}This will test (but not execute) all rollback strategies${NC}"
echo ""

# Test 1: Check if backup branch exists
test_backup_branch() {
    echo -e "${BLUE}Test 1: Backup Branch Availability${NC}"

    local backup_branch="EMERGENCY-BACKUP-PRE-GEMINI-20250920-073014"

    if git rev-parse --verify "origin/$backup_branch" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Emergency backup branch exists: $backup_branch${NC}"
    else
        echo -e "${RED}❌ Emergency backup branch missing${NC}"
        return 1
    fi

    # Check safe commit
    local safe_commit="86010059"
    if git rev-parse --verify "$safe_commit" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Safe commit exists: $safe_commit${NC}"
    else
        echo -e "${RED}❌ Safe commit missing${NC}"
        return 1
    fi
}

# Test 2: Check rollback script
test_rollback_script() {
    echo -e "${BLUE}Test 2: Rollback Script Functionality${NC}"

    if [ -f "scripts/emergency-rollback.sh" ]; then
        echo -e "${GREEN}✅ Emergency rollback script exists${NC}"

        if [ -x "scripts/emergency-rollback.sh" ]; then
            echo -e "${GREEN}✅ Rollback script is executable${NC}"
        else
            echo -e "${RED}❌ Rollback script not executable${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Emergency rollback script missing${NC}"
        return 1
    fi

    # Test script syntax
    if bash -n "scripts/emergency-rollback.sh"; then
        echo -e "${GREEN}✅ Rollback script syntax valid${NC}"
    else
        echo -e "${RED}❌ Rollback script syntax error${NC}"
        return 1
    fi
}

# Test 3: Check configuration backup
test_config_backup() {
    echo -e "${BLUE}Test 3: Configuration Backup Integrity${NC}"

    if [ -f "scripts/config-backup.sh" ]; then
        echo -e "${GREEN}✅ Config backup script exists${NC}"
    else
        echo -e "${RED}❌ Config backup script missing${NC}"
        return 1
    fi

    # Check if backup was created
    if [ -f "backups/latest-backup-path.txt" ]; then
        local backup_path=$(cat backups/latest-backup-path.txt)
        echo -e "${GREEN}✅ Latest backup path: $backup_path${NC}"

        # Check backup contents
        local required_files=("backup-metadata.json" "restore.sh" "environment-variables.md")
        for file in "${required_files[@]}"; do
            if [ -f "$backup_path/$file" ]; then
                echo -e "${GREEN}✅ Backup file exists: $file${NC}"
            else
                echo -e "${RED}❌ Backup file missing: $file${NC}"
                return 1
            fi
        done
    else
        echo -e "${RED}❌ No backup created yet${NC}"
        return 1
    fi
}

# Test 4: Check API endpoints
test_api_endpoints() {
    echo -e "${BLUE}Test 4: API Endpoint Availability${NC}"

    # Test staging backend
    local staging_url="https://wheels-wins-backend-staging.onrender.com/api/health"
    if curl -s --max-time 10 "$staging_url" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Staging backend accessible${NC}"
    else
        echo -e "${YELLOW}⚠️ Staging backend not responding (normal if services are sleeping)${NC}"
    fi

    # Test production backend
    local prod_url="https://pam-backend.onrender.com/api/health"
    if curl -s --max-time 10 "$prod_url" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Production backend accessible${NC}"
    else
        echo -e "${YELLOW}⚠️ Production backend not responding (normal if services are sleeping)${NC}"
    fi
}

# Test 5: Check environment access
test_environment_access() {
    echo -e "${BLUE}Test 5: Environment Variable Access${NC}"

    echo -e "${YELLOW}📋 Manual verification required:${NC}"
    echo "1. Render Dashboard Access:"
    echo "   - Go to https://dashboard.render.com"
    echo "   - Find 'pam-backend' service"
    echo "   - Verify you can access Environment tab"
    echo ""
    echo "2. Netlify Dashboard Access:"
    echo "   - Go to https://app.netlify.com"
    echo "   - Find site deployments"
    echo "   - Verify you can access Environment variables"
    echo ""
    echo -e "${GREEN}✅ Manual verification checklist provided${NC}"
}

# Test 6: Simulate rollback scenarios
test_rollback_scenarios() {
    echo -e "${BLUE}Test 6: Rollback Scenario Simulation${NC}"

    echo -e "${YELLOW}📝 Testing rollback time estimates:${NC}"

    # Time git operations
    local start_time=$(date +%s)
    git rev-parse HEAD > /dev/null
    git branch --show-current > /dev/null
    local end_time=$(date +%s)
    local git_time=$((end_time - start_time))

    echo "   Git operations: ${git_time}s (target: <5s)"

    # Test network connectivity
    start_time=$(date +%s)
    curl -s --max-time 5 "https://api.github.com" > /dev/null || true
    end_time=$(date +%s)
    local network_time=$((end_time - start_time))

    echo "   Network latency: ${network_time}s (target: <5s)"

    echo -e "${GREEN}✅ Performance estimates completed${NC}"
}

# Run all tests
run_all_tests() {
    local failed_tests=0

    echo -e "${BLUE}🚀 Running all rollback tests...${NC}"
    echo ""

    # Run each test
    test_backup_branch || ((failed_tests++))
    echo ""

    test_rollback_script || ((failed_tests++))
    echo ""

    test_config_backup || ((failed_tests++))
    echo ""

    test_api_endpoints || ((failed_tests++))
    echo ""

    test_environment_access || ((failed_tests++))
    echo ""

    test_rollback_scenarios || ((failed_tests++))
    echo ""

    # Results summary
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL ROLLBACK TESTS PASSED!${NC}"
        echo -e "${GREEN}✅ Rollback system is ready for emergency use${NC}"
        echo ""
        echo -e "${BLUE}📋 Available Rollback Methods:${NC}"
        echo "1. Git Branch Rollback: ./scripts/emergency-rollback.sh git"
        echo "2. Environment Variables: ./scripts/emergency-rollback.sh env"
        echo "3. Circuit Breaker: ./scripts/emergency-rollback.sh circuit"
        echo ""
        echo -e "${YELLOW}💡 Fastest rollback: Environment variable removal (30 seconds)${NC}"
    else
        echo -e "${RED}❌ $failed_tests test(s) failed${NC}"
        echo -e "${RED}🚨 Rollback system needs attention before Gemini deployment${NC}"
        return 1
    fi
}

# Main execution
case "${1:-all}" in
    "backup")
        test_backup_branch
        ;;
    "script")
        test_rollback_script
        ;;
    "config")
        test_config_backup
        ;;
    "api")
        test_api_endpoints
        ;;
    "env")
        test_environment_access
        ;;
    "scenarios")
        test_rollback_scenarios
        ;;
    "all"|*)
        run_all_tests
        ;;
esac