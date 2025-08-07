#!/bin/bash

# PAM AI SDK Deployment Script
# Phase 6: Deployment Configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}PAM AI SDK Deployment Script${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check environment
ENVIRONMENT=${1:-staging}
echo -e "\n${YELLOW}Deploying to: ${ENVIRONMENT}${NC}"

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
if ! command_exists node; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}git is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
npm test -- --run --reporter=verbose || {
    echo -e "${RED}Tests failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Tests passed${NC}"

# Run type checking
echo -e "\n${YELLOW}Running type check...${NC}"
npm run type-check || {
    echo -e "${RED}Type checking failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Type check passed${NC}"

# Run linting
echo -e "\n${YELLOW}Running linter...${NC}"
npm run lint || {
    echo -e "${RED}Linting failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Linting passed${NC}"

# Build the application
echo -e "\n${YELLOW}Building application...${NC}"
VITE_ENVIRONMENT=$ENVIRONMENT npm run build || {
    echo -e "${RED}Build failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"

# Run bundle size check
echo -e "\n${YELLOW}Checking bundle size...${NC}"
MAX_SIZE=5000000 # 5MB
BUILD_SIZE=$(du -sb dist | cut -f1)
if [ $BUILD_SIZE -gt $MAX_SIZE ]; then
    echo -e "${RED}Bundle size ($BUILD_SIZE bytes) exceeds limit ($MAX_SIZE bytes)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Bundle size: $BUILD_SIZE bytes${NC}"

# Environment-specific deployment
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "\n${YELLOW}Deploying to production...${NC}"
    
    # Create deployment tag
    VERSION=$(date +"%Y%m%d-%H%M%S")
    git tag -a "deploy-$VERSION" -m "Production deployment $VERSION"
    
    # Push to production branch
    git push origin main --tags
    
    echo -e "${GREEN}✓ Production deployment initiated${NC}"
    echo -e "${YELLOW}Deployment tag: deploy-$VERSION${NC}"
    
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo -e "\n${YELLOW}Deploying to staging...${NC}"
    
    # Push to staging branch
    git push origin staging
    
    echo -e "${GREEN}✓ Staging deployment initiated${NC}"
    
else
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    exit 1
fi

# Post-deployment tasks
echo -e "\n${YELLOW}Running post-deployment tasks...${NC}"

# Clear CDN cache (if applicable)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "  - Clearing CDN cache..."
    # Add CDN cache clearing command here
fi

# Send deployment notification
echo "  - Sending deployment notification..."
# Add notification command here (Slack, Discord, etc.)

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}Time: $(date)${NC}"
echo -e "${GREEN}=====================================${NC}"