#!/bin/bash

# PAM Automated Test Execution Script
# Usage: ./scripts/run_pam_tests.sh [options]
# Options:
#   --quick    Run only critical tests
#   --coverage Generate coverage report
#   --verbose  Show detailed output
#   --help     Show this help message

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default options
QUICK=false
COVERAGE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      QUICK=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "PAM Automated Test Execution Script"
      echo ""
      echo "Usage: ./scripts/run_pam_tests.sh [options]"
      echo ""
      echo "Options:"
      echo "  --quick    Run only critical tests"
      echo "  --coverage Generate coverage report"
      echo "  --verbose  Show detailed output"
      echo "  --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}=== PAM Automated Test Suite ===${NC}"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo "Please install pytest first:"
    echo "  pip install pytest pytest-asyncio pytest-cov"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo -e "${YELLOW}Current directory: $(pwd)${NC}"
echo ""

# Build pytest command
PYTEST_CMD="pytest app/tests/test_budget_tools.py app/tests/test_trip_tools.py app/tests/test_calendar_tools.py app/tests/test_social_tools.py"

if [ "$QUICK" = true ]; then
    echo -e "${YELLOW}Running critical tests only...${NC}"
    PYTEST_CMD="$PYTEST_CMD -m critical"
elif [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -vv"
else
    PYTEST_CMD="$PYTEST_CMD -v"
fi

if [ "$COVERAGE" = true ]; then
    echo -e "${YELLOW}Running tests with coverage...${NC}"
    PYTEST_CMD="$PYTEST_CMD --cov=app/services/pam/tools --cov-report=html --cov-report=term"
fi

echo -e "${YELLOW}Command: $PYTEST_CMD${NC}"
echo ""

# Run tests
if $PYTEST_CMD; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"

    if [ "$COVERAGE" = true ]; then
        echo ""
        echo -e "${GREEN}Coverage report generated: htmlcov/index.html${NC}"
    fi

    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
